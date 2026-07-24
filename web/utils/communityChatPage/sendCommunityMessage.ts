// utils/chat/sendCommunityMessage.ts
import {
  saveCommunityMessage,
  updateCommunityMessage,
} from "@/lib/communityMessageDB";

import { uploadMediaFiles } from "@/utils/chat/mediaUpload";
import { emitCommunitySocketMessage } from "./emitCommunitySocketMessage";
import { sortMessages } from "@/utils/chat/messageMerger";
import { ensureConnected } from "@/utils/chat/waitForConnect";
import { restoreFiles } from "@/utils/chat/restoreFiles";
import type { Dispatch, SetStateAction } from "react";
import type { Message } from "@/utils/chat/messageContract";

type SendChatMessageParams = {
  message: Partial<Message>;
  currentUser: { id: number };
  socketRef: any;
  setMessages: Dispatch<SetStateAction<Message[]>>;
  canCommunicate: boolean;
};

export async function sendCommunityMessage({
  message,
  currentUser,
  socketRef,
  setMessages,
  canCommunicate,
}: SendChatMessageParams) {
  const client_id = message.client_id ?? crypto.randomUUID();

  // 🧱 RAW SOURCE (NEVER MUTATED)
  const rawMessage: Message = {
    ...message,
    client_id,
    chat: message.chat,

    sender: currentUser.id,

    media_type: message.media_type || "text",
    encrypted_text: message.encrypted_text || "",
    caption: message.caption || "",
  
    files: message.files || [],
    duration: message.duration,
  
    reply_to: message.reply_to || null,

    status: canCommunicate ? "sending" : "pending",
    upload_progress: 0,

    created_at: message.created_at ?? new Date().toISOString(),
  };

  if (rawMessage.files?.length) {
    rawMessage.files = restoreFiles(rawMessage.files);
  }
  
  rawMessage.media_url = rawMessage.media_url
    ? Array.isArray(rawMessage.media_url)
      ? rawMessage.media_url
      : [rawMessage.media_url]
    : [];
  
  rawMessage.thumbnail = rawMessage.thumbnail
    ? Array.isArray(rawMessage.thumbnail)
      ? rawMessage.thumbnail
      : [rawMessage.thumbnail]
    : [];
  
  rawMessage.duration = rawMessage.duration
    ? Array.isArray(rawMessage.duration)
      ? rawMessage.duration
      : [rawMessage.duration]
    : [];

  // 🧱 DB SAVE (RAW ONLY)
  await saveCommunityMessage(rawMessage, currentUser.id);

  // 🧠 UI DERIVED ONLY
  const uiMessage = rawMessage;

  setMessages(prev =>
    sortMessages([
      ...prev.filter(m => m.client_id !== client_id),
      uiMessage,
    ])
  );

  if (!canCommunicate) return uiMessage;

  const socket = socketRef.current;
  if (!socket) return uiMessage;

  const connected = await ensureConnected(socket);

  if (!connected) {
    await updateCommunityMessage(client_id, currentUser.id, {
      status: "pending",
    });

    return { ...uiMessage, status: "pending" };
  }

  try {
    // 🧱 MEDIA UPLOAD (SEPARATE PATCH ONLY)
    let mediaPatch = {};

    if (rawMessage.files?.length) {
      setMessages(prev =>
        prev.map(m =>
          m.client_id === client_id
            ? {
                ...m,
                status:
                  "uploading",
              }
            : m
        )
      );
  
      await updateCommunityMessage(client_id, currentUser.id, {
        status: "uploading",
      });

      const uploaded = 
        await uploadMediaFiles(
          rawMessage.files,
          percent => {
            setMessages(prev =>
              prev.map(m =>
                m.client_id ===
                client_id
                  ? {
                      ...m,
                      upload_progress:
                        percent,
                    }
                  : m
              )
            );

            updateCommunityMessage(
              client_id,
              currentUser.id,
              {
                upload_progress: percent,
              }
            );
          }
        );

      mediaPatch = {
        media_type: uploaded.media_type,
        media_url: uploaded.media_url,
        thumbnail: uploaded.thumbnail,
    
        files: rawMessage.files.map((f,i)=>({
            ...f,
            media_url: uploaded.media_url[i],
            thumbnail: uploaded.thumbnail[i],
        })),
        upload_progress: 100,
      };
    }

    // 🧱 FINAL SOCKET MESSAGE = RAW + PATCH ONLY
    const finalMessage = {
      ...rawMessage,
      ...mediaPatch,
      status: "sending",
    };
  
    setMessages(prev =>
      prev.map(m =>
        m.client_id === client_id
          ? {
              ...m,
              ...mediaPatch,
              status: "sending",
            }
          : m
      )
    );
  
    await updateCommunityMessage(
      client_id,
      currentUser.id,
      finalMessage
    );
  
    console.log("========== SEND TO SOCKET ==========");
    console.log("Socket exists:", !!socket);
    console.log("Socket connected:", socket?.connected);
    console.log("Message:", finalMessage);
    console.log("===================================");

    await emitCommunitySocketMessage(
      socket,
      finalMessage,
      currentUser.id,
      setMessages
    );

    return finalMessage;
  } catch (err) {
    await updateCommunityMessage(client_id, currentUser.id, {
      status: "failed",
    });

    setMessages(prev =>
      prev.map(m =>
        m.client_id === client_id
          ? { ...m, status: "failed" }
          : m
      )
    );

    return null;
  }
}