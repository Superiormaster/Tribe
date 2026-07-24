'use client';

import { useCallback } from "react";

interface UseSendMessageProps {
  communityId: number | null;

  input: string;

  files: File[];

  caption: string;

  replyingTo: any;

  sendMessage: (text: string) => Promise<void>;

  handleSendMedia: (payload: any) => Promise<void>;

  handleSendExternalMedia: (payload: any) => Promise<void>;

  setSelectedFiles: React.Dispatch<
    React.SetStateAction<File[]>
  >;

  setReplyingTo: React.Dispatch<
    React.SetStateAction<any>
  >;
}

export function useSendCommunityMessage({
  communityId,
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
      if (!communityId) return;

      console.log("SEND BUTTON PRESSED");

      // GIF / Sticker
      if (
        payload?.media_type === "gif" ||
        payload?.media_type === "sticker"
      ) {
        await handleSendExternalMedia(payload);
        return;
      }

      const text =
        payload?.encrypted_text ?? input;

      const mediaCaption =
        payload?.caption ?? caption;

      const mediaFiles =
        payload?.files ?? files;

      const hasMedia =
        mediaFiles.length > 0;

      const hasText =
        text.trim().length > 0;

      if (hasMedia) {
        await handleSendMedia({
          message: {
            chat: communityId,
            files: mediaFiles,
            caption: mediaCaption,
            encrypted_text: mediaCaption,
            media_source: "upload",
            reply_to: replyingTo,
          },
        });

        setSelectedFiles([]);
        setReplyingTo(null);

        return;
      }

      if (hasText) {
        await sendMessage(text);
      }
    },
    [
      communityId,
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