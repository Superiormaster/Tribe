'use client';

import { useEffect, useMemo } from "react";
import { Message } from "@/utils/chat/messageContract";

type MediaItem = {
  url: string | null;
  thumbnail?: string;
  duration?: number;
  blob?: Blob;
};

type Props = {
  msg: any;
  isCurrentUser: boolean;
  setPreviewState: (state: any) => void;
  setReplyingTo: (msg: Message) => void;
};

export default function useMediaPreview({
  msg,
  isCurrentUser,
  setPreviewState,
  setReplyingTo,
}: Props) {

  const mediaItems = useMemo<MediaItem[]>(() => {
    if (!msg.files?.length) return [];

    return msg.files.map((item: any) => ({
      url:
        item.media_url ||
        item.preview ||
        (item.blob instanceof Blob
          ? URL.createObjectURL(item.blob)
          : null),

      thumbnail: item.thumbnail,
      duration: item.duration,
      blob: item.blob,
    }));
  }, [msg.files]);

  useEffect(() => {
    return () => {
      mediaItems.forEach((item) => {
        if (item.url?.startsWith("blob:")) {
          URL.revokeObjectURL(item.url);
        }
      });
    };
  }, [mediaItems]);

  const files = useMemo(() => {
    return mediaItems.map((item, i) => {
      const file = msg.files?.[i];

      const blob =
        file instanceof File
          ? file
          : file?.blob;

      return {
        media_url: item.url,
        thumbnail: item.thumbnail,
        duration: item.duration,
        media_type: blob?.type?.startsWith("video/")
          ? "video"
          : "image",
      };
    });
  }, [mediaItems, msg.files]);

  const mediaSrc = useMemo(() => {
    if (
      Array.isArray(msg.media_url) &&
      msg.media_url.length
    ) {
      return msg.media_url[0];
    }

    return mediaItems[0]?.url ?? null;
  }, [msg.media_url, mediaItems]);

  const canPreview = useMemo(() => {
    return [
      "sent",
      "delivered",
      "seen",
    ].includes(msg.status);
  }, [msg.status]);

  const openPreview = (index = 0) => {
    if (!canPreview) return;

    setPreviewState({
      files,
      index,
      msg,
      isMine: isCurrentUser,

      onReply: (message: Message) => {
        setReplyingTo(message);
      },
    });
  };

  return {
    mediaItems,
    mediaSrc,
    files,
    canPreview,
    openPreview,
  };
}