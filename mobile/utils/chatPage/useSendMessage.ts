'use client';

import { useCallback } from "react";


interface UseSendMessageProps {
  chatIdNum: number | null;

  input: string;

  files: File[];

  caption: string;

  replyingTo: any;

  sendMessage: (payload: {
    encrypted_text: string;
    mention_user_ids?: number[];
    mention_all?: boolean;
  }) => Promise<void>;

  handleSendMedia: (payload: any) => Promise<void>;

  handleSendExternalMedia: (payload: any) => Promise<void>;

  setSelectedFiles: React.Dispatch<
    React.SetStateAction<File[]>
  >;

  setReplyingTo: React.Dispatch<
    React.SetStateAction<any>
  >;
}

export function useSendMessage({
  chatIdNum,
  input,
  files,
  caption,
  replyingTo,
  sendMessage,
  handleSendMedia,
  handleSendExternalMedia,
  setSelectedFiles,
  setReplyingTo,
}: UseSendMessageProps) {

  const handleSendMessage = useCallback(
    async (payload?: any) => {
  
      console.log("");
      console.log("========================================");
      console.log("🚀 [COMMUNITY SEND]");
      console.log("========================================");
  
      console.log("[COMMUNITY SEND RAW PAYLOAD]", payload);
  
      if (!chatIdNum) {
        console.error(
          "❌ [PRIVATE SEND] NO  ID"
        );
        return;
      }
  
      const text =
        payload?.encrypted_text ?? input;
  
      const mediaCaption =
        payload?.caption ?? caption;
  
      const mediaFiles =
        payload?.files ?? files;
  
      const mentionUserIds =
        Array.isArray(payload?.mention_user_ids)
          ? payload.mention_user_ids
          : [];
  
      const mentionAll =
        payload?.mention_all === true;
  
      console.log("[COMMUNITY SEND MENTIONS]", {
        text,
        mention_user_ids: mentionUserIds,
        mention_all: mentionAll,
      });
  
      const hasMedia =
        mediaFiles.length > 0;
  
      const hasText =
        text.trim().length > 0;
  
      // ----------------------------------------
      // GIF / STICKER
      // ----------------------------------------
  
      if (
        payload?.media_type === "gif" ||
        payload?.media_type === "sticker"
      ) {
        await handleSendExternalMedia({
          ...payload,
          mention_user_ids: mentionUserIds,
          mention_all: mentionAll,
        });
  
        return;
      }
  
      // ----------------------------------------
      // MEDIA
      // ----------------------------------------
  
      if (hasMedia) {
  
        await handleSendMedia({
          message: {
            chat: chatIdNum,
            files: mediaFiles,
            caption: mediaCaption,
            encrypted_text: mediaCaption,
            media_source: "upload",
            reply_to: replyingTo,
  
            // IMPORTANT
            mention_user_ids: mentionUserIds,
            mention_all: mentionAll,
          },
        });
  
        setSelectedFiles([]);
        setReplyingTo(null);
  
        return;
      }
  
      // ----------------------------------------
      // TEXT
      // ----------------------------------------
  
      if (hasText) {
  
        console.log(
          "[COMMUNITY SEND → sendMessage]",
          {
            encrypted_text: text,
            mention_user_ids: mentionUserIds,
            mention_all: mentionAll,
          }
        );
  
        await sendMessage({
          encrypted_text: text,
  
          // IMPORTANT
          mention_user_ids: mentionUserIds,
          mention_all: mentionAll,
        });
  
        return;
      }
  
      console.warn(
        "⚠️ [COMMUNITY SEND] Nothing to send"
      );
  
    },
    [
      chatIdNum,
      input,
      files,
      caption,
      replyingTo,
      sendMessage,
      handleSendMedia,
      handleSendExternalMedia,
      setSelectedFiles,
      setReplyingTo,
    ]
  );

  return {
    handleSendMessage,
  };
}