import { useCallback } from "react";

import type { UserSummary } from "@/utils/chat/messageContract";
import type { NativeUploadFile } from "@/utils/mediaUpload/uploadFile";

interface UseSendMessageProps {
  communityId: number | null;

  input: string;

  files: NativeUploadFile[];

  caption: string;

  replyingTo: any;

  sendMessage: (payload: {
    encrypted_text: string;
    mention_user_ids?: number[];
    mention_all?: boolean;
    mentions?: UserSummary[];
  }) => Promise<void>;

  handleSendMedia: (payload: any) => Promise<void>;

  handleSendExternalMedia: (payload: any) => Promise<void>;

  setSelectedFiles: React.Dispatch<
    React.SetStateAction<NativeUploadFile[]>
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

      if (!communityId) {
        console.error(
          "❌ [COMMUNITY SEND] NO COMMUNITY ID"
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
        Array.isArray(
          payload?.mention_user_ids
        )
          ? payload.mention_user_ids
          : [];

      const mentionAll =
        payload?.mention_all === true;

      const mentions =
        payload?.mentions ?? [];

      const hasMedia =
        mediaFiles.length > 0;

      const hasText =
        text.trim().length > 0;

      if (
        payload?.media_type === "gif" ||
        payload?.media_type === "sticker"
      ) {
        await handleSendExternalMedia({
          ...payload,

          mention_user_ids:
            mentionUserIds,

          mention_all:
            mentionAll,

          mentions:
            mentions ?? [],
        });

        return;
      }

      if (hasMedia) {

        await handleSendMedia({
          message: {
            chat: communityId,

            files: mediaFiles,

            caption:
              mediaCaption,

            encrypted_text:
              mediaCaption,

            media_source:
              "upload",

            reply_to:
              replyingTo,

            // IMPORTANT
            mention_user_ids:
              mentionUserIds,

            mentions:
              mentions ?? [],

            mention_all:
              mentionAll,
          },
        });

        setSelectedFiles([]);

        setReplyingTo(null);

        return;
      }

      if (hasText) {

        console.log(
          "[COMMUNITY SEND → sendMessage]",
          {
            encrypted_text:
              text,

            mention_user_ids:
              mentionUserIds,

            mentions:
              mentions ?? [],

            mention_all:
              mentionAll,
          }
        );

        await sendMessage({
          encrypted_text:
            text,

          // IMPORTANT
          mention_user_ids:
            mentionUserIds,

          mentions:
            mentions ?? [],

          mention_all:
            mentionAll,
        });

        return;
      }

      console.warn(
        "⚠️ [COMMUNITY SEND] Nothing to send"
      );

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