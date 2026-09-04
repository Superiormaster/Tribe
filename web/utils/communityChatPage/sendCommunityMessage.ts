// utils/chat/sendCommunityMessage.ts
import {
  saveCommunityMessage,
  updateCommunityMessage,
} from "@/lib/communityMessageDB";
import {
  enqueueMessage,
  flushOutbox,
} from "@/utils/chat/outboxProcessor";
import {
  getNextClientSequence,
} from "@/utils/chat/messageSequence";
import { sendCommunityMessageThroughQueue } from "./sendCommunityMessageThroughQueue";
import { sortMessages } from "@/utils/chat/messageMerger";
import { ensureConnected } from "@/utils/chat/waitForConnect";
import { restoreFiles } from "@/utils/chat/restoreFiles";
import type { Dispatch, SetStateAction } from "react";
import type { Message } from "@/utils/chat/messageContract";
import {
  hasSendableCommunityContent
} from "@/utils/chat/isRenderableMessage";

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

export async function sendCommunityMessage({
  message,
  currentUser,
  socketRef,
  setMessages,
  canCommunicate,
  connectionType,
  networkStatus,
}: SendChatMessageParams) {
  const client_id = message.client_id ?? crypto.randomUUID();

  const client_sequence =
    message.client_sequence ??
    await getNextClientSequence(
      currentUser.id
    );
  const hasMedia =
    !!message.files?.length ||
    !!message.media_url?.length;
  
  const communityId =
    message.communityId ??
    message.community ??
    message.chat;
  
  const mentionUserIds =
    message?.mention_user_ids ?? [];
  
  const mentionAll =
    message?.mention_all ?? false;
  
  if (!communityId) {
    throw new Error(
      "[sendCommunityMessage] Missing communityId"
    );
  }
  
  if (!hasSendableCommunityContent(message)) {
    console.warn(
      "[COMMUNITY SEND] Empty message blocked",
      message
    );
  
    return null;
  }

  // 🧱 RAW SOURCE (NEVER MUTATED)
  const rawMessage: Message = {
    ...message,
    client_id,
    client_sequence,
    chat: communityId,
  
    communityId: communityId,
  
    community: communityId,

    sender: currentUser.id,
    client_created_at:
      message.client_created_at,

    media_type: message.media_type || "text",
    mentions: Array.isArray(message.mentions)
      ? message.mentions
      : [],
    mention_user_ids: mentionUserIds,
    mention_all: mentionAll,

    media_source:
      message.media_source ??
      (
        message.media_asset_ids?.length
          ? "upload"
          : message.media_url?.length
            ? "external"
            : undefined
      ),
  
    encrypted_text: message.encrypted_text || "",
    caption: message.caption || "",
  
    files: message.files || [],
    duration: message.duration,
  
    reply_to: message.reply_to || null,

    status: canCommunicate ? "sending" : "pending",

    media_status:
      hasMedia
        ? "pending"
        : "none",
    upload_progress: 0,

    created_at: message.created_at,
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

  if (!hasSendableCommunityContent(message)) {
    console.warn(
      "[COMMUNITY SEND] Empty message blocked",
      message
    );
  
    return null;
  }

  // 🧱 DB SAVE (RAW ONLY)
  await saveCommunityMessage(rawMessage, currentUser.id);
  await enqueueMessage({
    client_id,
    ownerId: currentUser.id,
    chat_id: Number(communityId),
    chat_type: "community",
    client_sequence,
  });
  
  // 🧠 UI DERIVED ONLY
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

  if (!canCommunicate) {
    console.warn(
      "⚠️ [SEND 3] canCommunicate=false"
    );
  
    await updateCommunityMessage(
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
    await updateCommunityMessage(
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
    await updateCommunityMessage(
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
    privateSocket: undefined,
    communitySocket: socket,
    setMessages,
  });
  
  return uiMessage;
}