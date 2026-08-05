// components/chat/ReplyPreview.tsx

"use client";

import ProgressiveImage from "@/components/chat/ProgressiveImage";

type Reply = {
  encrypted_text?: string;
  caption?: string;
  media_type?: string;
  media_url?: string | string[];
  thumbnail?: string;
};

type Props = {
  reply?: Reply | null;
  isCurrentUser?: boolean;
};

function getReplyPreview(reply?: Reply | null) {
  if (!reply) return null;

  const media = Array.isArray(reply.media_url)
    ? reply.media_url
    : reply.media_url
      ? [reply.media_url]
      : [];

  if (reply.encrypted_text?.trim()) {
    return {
      type: "text",
      text: reply.encrypted_text,
    };
  }

  const first = media[0];

  if (!first) {
    return {
      type: "file",
      text: "Attachment",
    };
  }

  switch (reply.media_type) {
    case "image":
      return {
        thumb: first,
        text: reply.caption || "Photo",
      };

    case "video":
      return {
        thumb: reply.thumbnail || first,
        text: reply.caption || "Video",
      };

    case "gif":
      return {
        thumb: first,
        text: "GIF",
      };

    case "sticker":
      return {
        thumb: first,
        text: "Sticker",
      };

    case "gallery":
      return {
        thumb: first,
        text: `${media.length} media`,
      };

    default:
      return {
        thumb: first,
        text: "Attachment",
      };
  }
}

export default function ReplyPreview({
  reply,
  isCurrentUser,
}: Props) {
  const preview = getReplyPreview(reply);

  if (!preview) return null;

  return (
    <div
      className={`
        mb-2
        px-3
        py-2
        rounded-lg
        border-l-4
        ${
          isCurrentUser
            ? "bg-gray-300 dark:bg-[#037561] border-green-300"
            : "bg-[#182229] border-green-500"
        }
      `}
    >
      {preview.thumb && (
        <ProgressiveImage
          src={preview.thumb}
          thumb={preview.thumb}
          className="w-10 h-10 rounded object-cover mb-1"
        />
      )}

      <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2 break-words">
        {preview.text}
      </p>
    </div>
  );
}