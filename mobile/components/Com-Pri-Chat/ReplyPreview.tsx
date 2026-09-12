"use client";

import {
  Reply,
  Image as ImageIcon,
  Video,
  Images,
  Mic,
} from "lucide-react";

import ProgressiveImage from "@/components/chat/ProgressiveImage";

type ReplyMessage = {
  id?: number;

  username?: string;
  sender_username?: string;
  sender_info?: {
    username?: string;
  };

  encrypted_text?: string;
  text?: string;
  caption?: string;

  media_type?: string;

  media_url?: string | string[];
  thumbnail?: string | string[];

  media_assets?: Array<{
    original_url?: string;
    thumbnail_url?: string;
    media_type?: string;
    duration?: number | null;
  }>;
};

type Props = {
  reply?: ReplyMessage | null;
  isCurrentUser?: boolean;
  onClick?: () => void;
};

function normalizeArray(
  value?: string | string[] | null
): string[] {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  return value ? [value] : [];
}

function getReplyMedia(reply: ReplyMessage) {
  const localMedia = getLocalReplyMedia(reply);

  if (localMedia.length) {
    return localMedia;
  }
  
  const urls = normalizeArray(reply.media_url);

  const thumbnails = normalizeArray(reply.thumbnail);

  // Prefer MediaAsset data when available.
  if (reply.media_assets?.length) {
    return reply.media_assets.map((asset) => ({
      url: asset.original_url ?? null,
      thumbnail:
        asset.thumbnail_url ??
        asset.original_url ??
        null,
      type: asset.media_type ?? null,
    }));
  }

  return urls.map((url, index) => ({
    url,
    thumbnail: thumbnails[index] ?? url,
    type: null,
  }));
}

function getPreview(reply: ReplyMessage) {
  const media = getReplyMedia(reply);

  const text =
    reply.text?.trim() ||
    reply.encrypted_text?.trim() ||
    reply.caption?.trim() ||
    "";

  /*
   * TEXT
   */
  if (text) {
    return {
      kind: "text" as const,
      text,
      thumbnail: null,
      mediaCount: 0,
    };
  }

  /*
   * AUDIO
   */
  if (reply.media_type === "audio") {
    return {
      kind: "audio" as const,
      text: "Voice message",
      thumbnail: null,
      mediaCount: 0,
    };
  }

  if (
    reply.media_type === "gallery" ||
    media.length > 1
  ) {
    return {
      kind: "gallery" as const,
      text: `${media.length} media`,
      thumbnail: media[0]?.thumbnail ?? media[0]?.url ?? null,
      mediaCount: media.length,
    };
  }

  /*
   * SINGLE IMAGE
   */
  if (reply.media_type === "image") {
    return {
      kind: "image" as const,
      text: reply.caption?.trim() || "Photo",
      thumbnail:
        media[0]?.thumbnail ??
        media[0]?.url ??
        null,
      mediaCount: 1,
    };
  }

  /*
   * SINGLE VIDEO
   */
  if (reply.media_type === "video") {
    return {
      kind: "video" as const,
      text: reply.caption?.trim() || "Video",
      thumbnail:
        media[0]?.thumbnail ??
        media[0]?.url ??
        null,
      mediaCount: 1,
    };
  }

  /*
   * GIF
   */
  if (reply.media_type === "gif") {
    return {
      kind: "gif" as const,
      text: "GIF",
      thumbnail:
        media[0]?.thumbnail ??
        media[0]?.url ??
        null,
      mediaCount: 1,
    };
  }

  /*
   * STICKER
   */
  if (reply.media_type === "sticker") {
    return {
      kind: "sticker" as const,
      text: "Sticker",
      thumbnail:
        media[0]?.thumbnail ??
        media[0]?.url ??
        null,
      mediaCount: 1,
    };
  }

  /*
   * UNKNOWN ATTACHMENT
   */
  return {
    kind: "file" as const,
    text: "Attachment",
    thumbnail:
      media[0]?.thumbnail ??
      media[0]?.url ??
      null,
    mediaCount: media.length,
  };
}

function getLocalReplyMedia(reply: any) {
  if (!Array.isArray(reply.files)) {
    return [];
  }

  return reply.files.map((file: any) => ({
    url:
      file.preview ??
      file.media_url ??
      null,

    thumbnail:
      file.thumbnail ??
      file.preview ??
      file.media_url ??
      null,

    type: file.type?.startsWith("video/")
      ? "video"
      : "image",
  }));
}

export default function ReplyPreview({
  reply,
  isCurrentUser,
  onClick,
}: Props) {

  if (!reply) return null;

  const preview = getPreview(reply);

  const senderName =
    reply?.sender_info?.username ??
    reply?.sender_username ??
    reply?.username ??
    "Unknown";

  const isMedia =
    preview.kind !== "text" &&
    preview.kind !== "audio" &&
    Boolean(preview.thumbnail);

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={`
        mb-2
        overflow-hidden
        rounded-lg
        border-l-4
        ${
          isCurrentUser
            ? "bg-gray-300 dark:bg-[#037561] border-indigo-300"
            : "bg-gray-100 dark:bg-[#182229] border-indigo-500"
        }
      `}
    >
      <div className="flex min-h-[52px]">

        {/* LEFT CONTENT */}
        <div className="min-w-0 flex-1 px-3 py-2">

          {/* SENDER */}
          <div className="flex items-center gap-1.5">
            <Reply
              size={13}
              className="shrink-0 text-indigo-500"
            />

            <span
              className="
                truncate
                text-xs
                font-semibold
                text-indigo-600
                dark:text-indigo-400
              "
            >
              {senderName}
            </span>
          </div>

          {/* PREVIEW */}
          <div className="mt-1 flex items-center gap-1.5 min-w-0">

            {preview.kind === "audio" && (
              <Mic
                size={13}
                className="shrink-0 text-gray-500 dark:text-gray-300"
              />
            )}

            {preview.kind === "image" && (
              <ImageIcon
                size={13}
                className="shrink-0 text-gray-500 dark:text-gray-300"
              />
            )}

            {preview.kind === "video" && (
              <Video
                size={13}
                className="shrink-0 text-gray-500 dark:text-gray-300"
              />
            )}

            {preview.kind === "gallery" && (
              <Images
                size={13}
                className="shrink-0 text-gray-500 dark:text-gray-300"
              />
            )}

            <p
              className="
                min-w-0
                text-xs
                text-gray-600
                dark:text-gray-300
                line-clamp-2
                break-words
              "
            >
              {preview.text}
            </p>
          </div>
        </div>

        {/* THUMBNAIL */}
        {isMedia && (
          <div
            className="
              relative
              w-14
              h-14
              shrink-0
              overflow-hidden
            "
          >
            <ProgressiveImage
              src={preview.thumbnail!}
              thumb={preview.thumbnail!}
              className="
                w-full
                h-full
                object-cover
              "
            />

            {/* GALLERY COUNT */}
            {preview.kind === "gallery" && (
              <div
                className="
                  absolute
                  inset-0
                  flex
                  items-center
                  justify-center
                  bg-black/40
                  text-white
                "
              >
                <div className="flex items-center gap-1">
                  <Images size={14} />

                  <span className="text-xs font-semibold">
                    {preview.mediaCount}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}