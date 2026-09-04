// utils/chat/sendChatMessage.ts
import {
  saveMessage,
  updateMessage,
} from "@/lib/messageDB";
import { sortMessages } from "@/utils/chat/messageMerger";
import {
  getNextClientSequence,
} from "@/utils/chat/messageSequence";
import {
  enqueueMessage,
  flushOutbox,
} from "@/utils/chat/outboxProcessor";
import { ensureConnected } from "@/utils/chat/waitForConnect";
import { restoreFiles } from "@/utils/chat/restoreFiles";
import type { Dispatch, SetStateAction } from "react";
import type { Message } from "@/utils/chat/messageContract";
import {
  hasSendableCommunityContent,
} from "@/utils/chat/isRenderableMessage";
import {
  UploadNetworkError,
} from "@/utils/mediaUpload/errors";

type SendChatMessageParams = {
  message: Partial<Message>;
  currentUser: { id: number };
  socketRef: any;
  setMessages: Dispatch<SetStateAction<Message[]>>;
  canCommunicate: boolean;
  networkStatus:
    | "offline"
    | "poor"
    | "slow"
    | "good";

  connectionType:
    | "wifi"
    | "cellular"
    | "unknown";
};

export async function sendChatMessage({
  message,
  currentUser,
  socketRef,
  setMessages,
  canCommunicate,
  networkStatus,
  connectionType,
}: SendChatMessageParams) {

  console.log("");
  console.log("========================================");
  console.log("🚀 [SEND 3] sendChatMessage START");
  console.log("========================================");

  console.log("Incoming message:", message);
  console.log("currentUser:", currentUser);
  console.log("canCommunicate:", canCommunicate);
  console.log("socketRef:", socketRef);
  console.log(
    "socketRef.current:",
    socketRef?.current
  );

  const client_id =
    message.client_id ??
    crypto.randomUUID();
  
  const client_sequence =
    message.client_sequence ??
    await getNextClientSequence(
      currentUser.id
    );
  if (!hasSendableCommunityContent(message)) {
    console.warn(
      "[COMMUNITY SEND] Empty message blocked",
      message
    );
  
    return null;
  }

  console.log(
    "🆔 [SEND 3] client_id:",
    client_id
  );
  
  const hasMedia =
  !!message.files?.length ||
  !!message.media_url?.length;

  const rawMessage: Message = {
    ...message,
    client_id,
    client_sequence,
    chat: message.chat,

    sender: currentUser.id,

    media_type:
      message.media_type || "text",

    encrypted_text:
      message.encrypted_text || "",

    caption:
      message.caption || "",

    files:
      message.files || [],
    client_created_at:
      message.client_created_at,

    media_source:
      message.media_source ||
      (
        message.media_asset_ids?.length
          ? "upload"
          : message.media_url?.length
            ? "external"
            : undefined
      ),

    duration:
      message.duration,

    reply_to:
      message.reply_to || null,

    status:
      canCommunicate
        ? "sending"
        : "pending",

    media_status:
      hasMedia
        ? "pending"
        : "none",

    upload_progress: 0,

    created_at:
      message.created_at,
  };

  console.log(
    "📦 [SEND 3] rawMessage:",
    rawMessage
  );

  try {

    if (rawMessage.files?.length) {

      console.log(
        "📁 [SEND 3] Restoring files..."
      );

      rawMessage.files =
        restoreFiles(
          rawMessage.files
        );

      console.log(
        "✅ [SEND 3] Files restored:",
        rawMessage.files
      );
    }

    rawMessage.media_url =
      rawMessage.media_url
        ? Array.isArray(
            rawMessage.media_url
          )
          ? rawMessage.media_url
          : [rawMessage.media_url]
        : [];

    rawMessage.thumbnail =
      rawMessage.thumbnail
        ? Array.isArray(
            rawMessage.thumbnail
          )
          ? rawMessage.thumbnail
          : [rawMessage.thumbnail]
        : [];

    rawMessage.duration =
      rawMessage.duration
        ? Array.isArray(
            rawMessage.duration
          )
          ? rawMessage.duration
          : [rawMessage.duration]
        : [];

    console.log(
      "🧹 [SEND 3] Normalized rawMessage:",
      rawMessage
    );

    console.log(
      "💾 [SEND 3] Saving message to IndexedDB..."
    );

    await saveMessage(
      rawMessage,
      currentUser.id
    );

    await enqueueMessage({
      client_id,
      ownerId: currentUser.id,
      chat_id: Number(message.chat),
      chat_type: "private",
      client_sequence,
    });

    console.log(
      "✅ [SEND 3] IndexedDB save SUCCESS"
    );

    const uiMessage = rawMessage;

    setMessages(prev =>
      sortMessages(
        [
          ...prev.filter(
            m =>
              m.client_id !== client_id
          ),
          uiMessage,
        ],
        currentUser.id
      )
    );

    console.log(
      "✅ [SEND 3] UI updated"
    );

    if (!canCommunicate) {
      console.warn(
        "⚠️ [SEND 3] canCommunicate=false"
      );
    
      await updateMessage(
        client_id,
        currentUser.id,
        {
          status: "pending",
        }
      );
    
      return uiMessage;
    }
    
    const socket =
      socketRef.current;
    
    if (!socket) {
      await updateMessage(
        client_id,
        currentUser.id,
        {
          status: "pending",
        }
      );
    
      return {
        ...uiMessage,
        status: "pending",
      };
    }
    
    const connected =
      await ensureConnected(socket);
    
    if (!connected) {
      await updateMessage(
        client_id,
        currentUser.id,
        {
          status: "pending",
        }
      );
    
      return {
        ...uiMessage,
        status: "pending",
      };
    }

    void flushOutbox({
      ownerId: currentUser.id,
      privateSocket: socket,
      communitySocket: undefined,
      setMessages,
    });
    
    return uiMessage;
  } catch (error) {
    console.error(
      "❌ [SEND 3] sendChatMessage failed:",
      error
    );

    await updateMessage(
      client_id,
      currentUser.id,
      {
        status: "failed",
      }
    );

    setMessages(prev =>
      sortMessages(
        prev.map(m =>
          m.client_id === client_id
            ? {
                ...m,
                status: "failed",
              }
            : m
        ),
        currentUser.id
      )
    );

    throw error;
  }
}