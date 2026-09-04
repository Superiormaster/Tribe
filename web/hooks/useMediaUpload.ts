import { useState } from "react";

import { sendChatMessage } from "@/utils/chat/sendChatMessage";
import { sendCommunityMessage } from "@/utils/communityChatPage/sendCommunityMessage";

import { getVideoDuration } from "@/utils/chat/videoThumbnail";
import { restoreFiles } from "@/utils/chat/restoreFiles";

import { createReplySnapshot } from "@/utils/chat/replySnapshot";
import type {
  Message,
  MessageType,
  UserSummary,
  ReplyMessage,
} from "@/utils/chat/messageContract";

import { useNetwork } from "@/components/networkConnection/NetworkContext";

type UploadFile = File & {
  preview?: string;
  thumbnail?: string;
  duration?: number;
};

type SendMediaPayload = {
  chat?: number;
  communityId?: number;
  community?: number;

  files?: UploadFile[];

  caption?: string;
  encrypted_text?: string;
  mention_user_ids?: number[];
  mention_all?: boolean;
  mentions?: UserSummary[];

  media_source?: "upload" | "forward" | "external";

  reply_to?: ReplyMessage | null;
};

type SendMediaArgs = {
  message?: SendMediaPayload;
};

type ExternalMediaPayload = {
  media_type: MessageType;
  media_url: string | string[];
  thumbnail?: string | string[];
  caption?: string;

  mention_user_ids?: number[];
  mention_all?: boolean;
  mentions?: UserSummary[];
};

export function useMediaUpload({
  chatId,
  currentUser,
  replyingTo,
  setReplyingTo,
  socketRef,
  setMessages,
  chatType = "private",
}: {
  chatId: number;
  currentUser: { id: number };
  socketRef: any;
  setMessages: any;
  replyingTo: any;
  setReplyingTo: (v: any) => void;
  chatType?: "private" | "community";
}) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [caption, setCaption] = useState("");

  const {
    canCommunicate,
    networkStatus,
    connectionType,
  } = useNetwork();

  const sendMessageByChatType = async (
    message: Partial<Message>
  ) => {
    const params = {
      message,
      currentUser,
      socketRef,
      setMessages,
      canCommunicate,
      networkStatus,
      connectionType,
    };

    if (chatType === "community") {
      return sendCommunityMessage(params);
    }

    return sendChatMessage(params);
  };

  const pickFile = async (
    fileOrFiles: UploadFile | UploadFile[]
  ) => {
    const processFile = async (
      file: UploadFile
    ): Promise<UploadFile> => {
      const preview = URL.createObjectURL(file);

      file.preview = preview;

      if (file.type.startsWith("image/")) {
        file.thumbnail = preview;
      }

      if (file.type.startsWith("video/")) {
        file.duration = await getVideoDuration(file);
      }

      return file;
    };

    if (Array.isArray(fileOrFiles)) {
      const processed = await Promise.all(
        fileOrFiles.map(processFile)
      );

      setFiles(prev => [
        ...prev,
        ...processed,
      ]);

      return;
    }

    const processed = await processFile(fileOrFiles);

    setFiles(prev => [
      ...prev,
      processed,
    ]);
  };

  const resendMedia = async (msg: any) => {
    console.log(
      "RESEND MEDIA FUNCTION",
      msg
    );

    const restoredFiles =
      restoreFiles(msg.files);

    setMessages((prev: any[]) =>
      prev.map((m: any) =>
        m.client_id === msg.client_id
          ? {
              ...m,
              status: "uploading",
              upload_progress: 0,
            }
          : m
      )
    );

    const media_url = msg.media_url
      ? Array.isArray(msg.media_url)
        ? msg.media_url
        : [msg.media_url]
      : [];

    const thumbnail = msg.thumbnail
      ? Array.isArray(msg.thumbnail)
        ? msg.thumbnail
        : [msg.thumbnail]
      : [];

    const duration = msg.duration
      ? Array.isArray(msg.duration)
        ? msg.duration
        : [msg.duration]
      : [];

    return sendMessageByChatType({
      ...msg,

      client_id: msg.client_id,

      files: restoredFiles,

      media_url,

      thumbnail,

      duration,

      status: "uploading",

      upload_progress: 0,
    });
  };

  const sendMedia = async (
    { message }: SendMediaArgs = {}
  ) => {
    const mediaFiles =
      message?.files ?? files;

    const mediaCaption =
      message?.caption ?? caption;

    const mediaChatId =
      message?.chat ?? chatId;
  
    const replySnapshot =
      createReplySnapshot(replyingTo);

    if (
      !mediaChatId ||
      mediaFiles.length === 0
    ) {
      return;
    }

    const optimisticMedia =
      await Promise.all(
        mediaFiles.map(
          async (file: UploadFile) => ({
            url:
              file.preview ||
              URL.createObjectURL(file),

            type: (
              file.type.startsWith("video/")
                ? "video"
                : "image"
            ) as MessageType,

            thumbnail:
              file.thumbnail || null,

            duration:
              file.duration || null,
          })
        )
      );
  
    const clientCreatedAt = new Date().toISOString();
    const mentionUserIds =
      message?.mention_user_ids ?? [];
    
    const mentionAll =
      message?.mention_all ?? false;
  
    const mentions =
      message?.mentions ?? [];

    const optimistic: Message = {
      client_id: crypto.randomUUID(),

      client_sequence: Date.now(),
      chat: mediaChatId,
      media_source: "upload",

      communityId:
        chatType === "community"
          ? mediaChatId
          : undefined,

      community:
        chatType === "community"
          ? mediaChatId
          : undefined,

      sender: currentUser.id,

      encrypted_text: mediaCaption,

      caption: mediaCaption,

      media_type:
        optimisticMedia.length > 1
          ? "gallery"
          : optimisticMedia[0].type,

      media_url:
        optimisticMedia.map(
          x => x.url
        ),

      thumbnail:
        optimisticMedia
          .map(x => x.thumbnail)
          .filter(Boolean),

      duration:
        optimisticMedia
          .map(x => x.duration)
          .filter(
            (duration): duration is number =>
              duration !== null
          ),

      waveform: [],

      reply_to: replySnapshot,

      reply_to_id:
        replySnapshot?.id ?? null,
      
      reply_to_client_id:
        replySnapshot?.client_id ?? undefined,
      mention_user_ids: mentionUserIds,
      mention_all: mentionAll,
      mentions: mentions ?? [],
      client_created_at: clientCreatedAt,

      status: "pending",

      upload_progress: 0,

      created_at:
        clientCreatedAt,

      reactions: [],

      hidden_for: [],

      is_deleted: false,

      files: mediaFiles,
    };

    await sendMessageByChatType(
      optimistic
    );

    setFiles([]);
    setCaption("");
  };

  const sendExternalMedia = async ({
    media_type,
    media_url,
    thumbnail,
    caption = "",
    mention_user_ids = [],
    mention_all = false,
    mentions = [],
  }: ExternalMediaPayload) => {
    if (!chatId) return;
    const clientCreatedAt = new Date().toISOString();
    const replySnapshot =
      createReplySnapshot(replyingTo);

    await sendMessageByChatType({
      chat: chatId,

      ...(chatType === "community"
        ? {
            communityId: chatId,
            community: chatId,
          }
        : {}),

      media_type,
      reply_to: replySnapshot,

      reply_to_id:
        replySnapshot?.id ?? null,
      
      reply_to_client_id:
        replySnapshot?.client_id ?? undefined,
      mention_user_ids,
      mention_all,
      mentions,
      client_created_at: clientCreatedAt,
      created_at:
        clientCreatedAt,

      media_url:
        Array.isArray(media_url)
          ? media_url
          : [media_url],

      thumbnail: thumbnail
        ? Array.isArray(thumbnail)
          ? thumbnail
          : [thumbnail]
        : [],

      caption,

      media_source: "external",
    });
  };

  return {
    files,
    caption,

    setCaption,

    resendMedia,

    handleFileSelect:
      pickFile,

    handleSendMedia:
      sendMedia,

    handleSendExternalMedia:
      sendExternalMedia,
  };
}