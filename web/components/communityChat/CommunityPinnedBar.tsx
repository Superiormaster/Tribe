'use client';

import { useMemo, useState } from "react";
import { Pin, ChevronDown, ChevronUp, Play } from "lucide-react";
import type { Message } from "@/utils/chat/messageContract";

type Props = {
  pinnedMessages: Message[];
  onJumpToMessage?: (id: number) => void;
};

type Preview = {
  type: string;
  thumb?: string;
  text: string;
};

const getPinnedPreview = (msg: Message): Preview => {

  if (msg.encrypted_text) {
    return {
      type: "text",
      text: msg.encrypted_text,
    };
  }

  switch (msg.media_type) {

    case "image":
      return {
        type: "image",
        thumb:
          msg.media_url?.[0],
        text:
          msg.caption ||
          "Photo",
      };

    case "video":
      return {
        type: "video",
        thumb:
          msg.thumbnail?.[0] ??
          msg.media_url?.[0],
        text:
          msg.caption ||
          "Video",
      };

    case "gif":
      return {
        type: "gif",
        thumb:
          msg.media_url?.[0],
        text: "GIF",
      };

    case "sticker":
      return {
        type: "sticker",
        thumb:
          msg.media_url?.[0],
        text: "Sticker",
      };

    case "audio":
      return {
        type: "audio",
        text: "Voice message",
      };

    case "gallery": {

      const media =
        msg.media_url ?? [];

      const images =
        media.filter(
          m =>
            !m.includes(".mp4") &&
            !m.includes(".mov") &&
            !m.includes(".webm")
        ).length;

      const videos =
        media.length - images;

      return {
        type: "gallery",
        thumb: media[0],
        text:
          images && videos
            ? `${media.length} media`
            : images
            ? `${images} photo${images > 1 ? "s" : ""}`
            : `${videos} video${videos > 1 ? "s" : ""}`,
      };
    }

    default:

      return {
        type: "file",
        text:
          msg.caption ||
          "Attachment",
      };
  }
};

export default function CommunityPinnedBar({
  pinnedMessages,
  onJumpToMessage,
}: Props) {

  const [expanded, setExpanded] =
    useState(false);
  
  const [expandedAll, setExpandedAll] =
    useState(false);
  
  const previewMessages =
    expandedAll
      ? pinnedMessages
      : pinnedMessages.slice(0, 3);

  if (!pinnedMessages.length)
    return null;

  const newest =
    pinnedMessages[0];
  
  return (
    <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0f1720]">
  
      {/* Header */}
      <button
        onClick={() => setExpanded(p => !p)}
        className="
          w-full
          flex
          items-center
          justify-between
          px-3
          py-2
          hover:bg-gray-50
          dark:hover:bg-gray-800/40
          transition
        "
      >
        <div className="flex items-center gap-3 flex-1 overflow-hidden">
  
          <Pin
            size={16}
            className="text-green-600 flex-shrink-0"
          />
  
          <div className="min-w-0 flex-1">
  
            <div className="flex items-center gap-2">
  
              <span className="font-semibold text-sm">
                Pinned Message
              </span>
  
              <span className="text-xs text-gray-500">
                1 of {pinnedMessages.length}
              </span>
  
            </div>
  
            {(() => {
  
              const preview =
                getPinnedPreview(newest);
  
              return (
  
                <div className="flex items-center gap-2 mt-1">
  
                  {preview.thumb && (
  
                    <div className="relative">
  
                      <img
                        src={preview.thumb}
                        className="
                          w-10
                          h-10
                          rounded
                          object-cover
                          flex-shrink-0
                        "
                      />
  
                      {preview.type === "video" && (
  
                        <Play
                          size={12}
                          className="
                            absolute
                            inset-0
                            m-auto
                            text-white
                            drop-shadow
                          "
                          fill="white"
                        />
  
                      )}
  
                    </div>
  
                  )}
  
                  <div className="min-w-0">
  
                    <div className="
                      text-sm
                      truncate
                      font-medium
                    ">
                      {preview.text}
                    </div>
  
                    <div className="
                      text-xs
                      text-gray-500
                      truncate
                    ">
                      {newest.sender_info?.username ??
                       "Unknown"}
                    </div>
  
                  </div>
  
                </div>
  
              );
  
            })()}
  
          </div>
  
        </div>
  
        {expanded ? (
          <ChevronUp size={18}/>
        ) : (
          <ChevronDown size={18}/>
        )}
  
      </button>
    
      {expanded && (
        <div className="border-t border-gray-200 dark:border-gray-800">
  
          {previewMessages.map((msg) => {
  
            const preview =
              getPinnedPreview(msg);
  
            return (
              <button
                key={msg.id}
                onClick={() => onJumpToMessage?.(msg.id!)}
                className="
                  w-full
                  flex
                  items-center
                  gap-3
                  px-3
                  py-2
                  hover:bg-gray-50
                  dark:hover:bg-gray-800/40
                  transition
                  text-left
                "
              >
  
                {/* Thumbnail */}
  
                {preview.thumb ? (
  
                  <div className="relative flex-shrink-0">
  
                    <img
                      src={preview.thumb}
                      className="
                        w-12
                        h-12
                        rounded-md
                        object-cover
                      "
                    />
  
                    {preview.type === "video" && (
                      <Play
                        size={16}
                        fill="white"
                        className="
                          absolute
                          inset-0
                          m-auto
                          text-white
                          drop-shadow
                        "
                      />
                    )}
  
                  </div>
  
                ) : (
  
                  <div
                    className="
                      w-12
                      h-12
                      rounded-md
                      bg-gray-200
                      dark:bg-gray-700
                      flex
                      items-center
                      justify-center
                      text-xl
                      flex-shrink-0
                    "
                  >
                    {preview.type === "audio"
                      ? "🎤"
                      : preview.type === "gif"
                      ? "GIF"
                      : preview.type === "sticker"
                      ? "😊"
                      : preview.type === "gallery"
                      ? "🖼"
                      : preview.type === "file"
                      ? "📄"
                      : "💬"}
                  </div>
  
                )}
  
                {/* Text */}
  
                <div className="flex-1 min-w-0">
  
                  <div
                    className="
                      text-sm
                      font-medium
                      truncate
                    "
                  >
                    {preview.text}
                  </div>
  
                  <div
                    className="
                      text-xs
                      text-gray-500
                      truncate
                    "
                  >
                    {msg.sender_info?.username ??
                     "Unknown"}
                  </div>
  
                </div>
  
              </button>
  
            );
  
          })}
  
          {/* Show More */}
  
          {pinnedMessages.length > 3 && !expandedAll && (
  
            <button
              onClick={() => setExpandedAll(true)}
              className="
                w-full
                py-2
                text-sm
                text-indigo-600
                hover:bg-gray-50
                dark:hover:bg-gray-800
              "
            >
              Show All ({pinnedMessages.length})
            </button>
  
          )}
  
          {expandedAll && (
  
            <button
              onClick={() => setExpandedAll(false)}
              className="
                w-full
                py-2
                text-sm
                text-indigo-600
                hover:bg-gray-50
                dark:hover:bg-gray-800
              "
            >
              Show Less
            </button>
  
          )}
  
        </div>
      )}
  
    </div>
  );
}