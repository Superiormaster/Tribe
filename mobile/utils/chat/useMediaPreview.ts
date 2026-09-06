'use client';

import { useEffect, useMemo } from "react";
import { Message } from "@/utils/chat/messageContract";

type MediaItem = {
  url: string | null;
  thumbnail?: string | null;
  duration?: number | null;
  blob?: Blob;
  mediaType?: "image" | "video" | "audio";
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

  const localItems = useMemo<MediaItem[]>(() => {
    if (!Array.isArray(msg.files) || !msg.files.length) {
      return [];
    }
  
    return msg.files.map((item: any) => {

      let url =
        item?.media_url ||
        item?.preview ||
        null;
  
      if (!url && item?.blob instanceof Blob) {
        url = URL.createObjectURL(item.blob);
      }
  
      const explicitMediaType =
        item?.mediaType;
      
      const fileType =
        item?.type ||
        item?.blob?.type ||
        "";
  
      let mediaType:
      | "image"
      | "video"
      | "audio"
      | undefined =
      explicitMediaType;
  
      if (fileType.startsWith("image/")) {
        mediaType = "image";
      } else if (fileType.startsWith("video/")) {
        mediaType = "video";
      } else if (fileType.startsWith("audio/")) {
        mediaType = "audio";
      }
  
      if (!mediaType) {
        const name =
          item?.name ||
          item?.blob?.name ||
          "";
  
        const extension =
          name
            .split(".")
            .pop()
            ?.toLowerCase();
  
        if (
          [
            "jpg",
            "jpeg",
            "png",
            "webp",
            "gif",
            "heic",
            "heif",
          ].includes(extension || "")
        ) {
          mediaType = "image";
        } else if (
          [
            "mp4",
            "mov",
            "webm",
            "mkv",
            "avi",
          ].includes(extension || "")
        ) {
          mediaType = "video";
        } else if (
          [
            "mp3",
            "wav",
            "ogg",
            "m4a",
            "aac",
          ].includes(extension || "")
        ) {
          mediaType = "audio";
        }
      }
  
      return {
        url,
  
        thumbnail:
          item?.thumbnail ||
          null,
  
        duration:
          item?.duration ??
          null,
  
        blob:
          item instanceof File
            ? item
            : item?.blob instanceof Blob
              ? item.blob
              : undefined,
  
        mediaType,
      };
    });
  }, [msg.files]);

  const assetItems = useMemo<MediaItem[]>(() => {
    if (
      !Array.isArray(msg.media_assets) ||
      !msg.media_assets.length
    ) {
      return [];
    }
  
    return msg.media_assets
      .map((asset: any) => {
  
        const contentType =
          asset.content_type || "";
  
        let mediaType:
          | "image"
          | "video"
          | "audio"
          | undefined;
  
        if (contentType.startsWith("image/")) {
          mediaType = "image";
        } else if (contentType.startsWith("video/")) {
          mediaType = "video";
        } else if (contentType.startsWith("audio/")) {
          mediaType = "audio";
        }
  
        if (!mediaType) {
          if (asset.media_type === "video") {
            mediaType = "video";
          } else if (asset.media_type === "audio") {
            mediaType = "audio";
          } else {
            mediaType = "image";
          }
        }
  
        const originalUrl =
          Array.isArray(asset.original_url)
            ? asset.original_url[0]
            : asset.original_url;
  
        const thumbnailUrl =
          Array.isArray(asset.thumbnail_url)
            ? asset.thumbnail_url[0]
            : asset.thumbnail_url;
  
        const url =
          typeof originalUrl === "string" &&
          originalUrl.trim()
            ? originalUrl
            : null;
  
        const thumbnail =
          typeof thumbnailUrl === "string" &&
          thumbnailUrl.trim()
            ? thumbnailUrl
            : null;
  
        return {
          url,
  
          thumbnail,
  
          duration:
            asset.duration != null
              ? Number(asset.duration)
              : null,
  
          mediaType,
        };
      })
      .filter(
        (item: MediaItem) =>
          typeof item.url === "string" &&
          item.url.length > 0
      );
  
  }, [msg.media_assets]);

  const externalItems = useMemo<MediaItem[]>(() => {

    if (
      !Array.isArray(
        msg.external_media_urls
      )
    ) {
      return [];
    }
  
    return msg.external_media_urls
      .filter(
        (url: any) =>
          typeof url === "string" &&
          url.trim()
      )
      .map(
        (url: string, index: number) => {
  
          const thumbnail =
            msg.thumbnail?.[index] ||
            url;
  
          const duration =
            msg.duration?.[index] ??
            null;
  
          const mediaType =
            msg.media_type === "video"
              ? "video"
              : msg.media_type === "audio"
                ? "audio"
                : "image";
  
          return {
            url,
            thumbnail,
            duration,
            mediaType,
          };
        }
      );
  
  }, [
    msg.external_media_urls,
    msg.thumbnail,
    msg.duration,
    msg.media_type,
  ]);

  const legacyItems = useMemo<MediaItem[]>(() => {
  
    if (
      !Array.isArray(msg.media_url) ||
      !msg.media_url.length
    ) {
      return [];
    }
  
    return msg.media_url
      .filter(
        (url: any) =>
          typeof url === "string" &&
          url.trim()
      )
      .map(
        (url: string, index: number) => {
  
          const mediaType =
            msg.media_type === "video"
              ? "video"
              : msg.media_type === "audio"
                ? "audio"
                : "image";
  
          return {
            url,
  
            thumbnail:
              msg.thumbnail?.[index] ||
              url,
  
            duration:
              msg.duration?.[index] ??
              null,
  
            mediaType,
          };
        }
      );
  
  }, [
    msg.media_url,
    msg.thumbnail,
    msg.duration,
    msg.media_type,
  ]);

  const mediaItems = useMemo<MediaItem[]>(() => {

    const usableLocalItems =
      localItems.filter(
        item =>
          !!item.url ||
          !!item.blob
      );
  
    if (usableLocalItems.length) {
      return usableLocalItems;
    }
  
    // Backend uploaded media
    if (assetItems.length) {
      return assetItems;
    }
  
    // External media
    if (externalItems.length) {
      return externalItems;
    }
  
    // Legacy media_url
    return legacyItems;
  
  }, [
    localItems,
    assetItems,
    externalItems,
    legacyItems,
  ]);

  const mediaSrc = useMemo(() => {
    return (
      mediaItems[0]?.url ||
      null
    );
  }, [mediaItems]);

  const files = useMemo(() => {

    return mediaItems.map(
      (item, index) => {
  
        const originalFile =
          msg.files?.[index];
  
        const blob =
          originalFile instanceof File
            ? originalFile
            : originalFile?.blob;
  
        return {
          media_url:
            item.url,
  
          thumbnail:
            item.thumbnail,
  
          duration:
            item.duration,
  
          media_type:
            item.mediaType ||
            (
              msg.media_type === "video"
                ? "video"
                : msg.media_type === "audio"
                  ? "audio"
                  : "image"
            ),
  
          blob,
        };
      }
    );
  
  }, [
    mediaItems,
    msg.files,
    msg.media_type,
  ]);

  const canPreview = useMemo(() => {

    return (
      !!mediaItems.length &&
      [
        "sent",
        "delivered",
        "seen",
      ].includes(msg.status)
    );

  }, [
    mediaItems,
    msg.status,
  ]);

  const openPreview = (
    index = 0
  ) => {

    if (!canPreview) {
      return;
    }

    setPreviewState({
      files,

      index,

      msg,

      isMine:
        isCurrentUser,

      onReply: (
        message: Message
      ) => {
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