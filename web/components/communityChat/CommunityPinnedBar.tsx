'use client';

import { useState } from "react";
import {
  Pin,
  PanelTopOpen,
  PanelTopClose,
  Play,
  Sticker,
  Images,
  FileImage,
  Mic,
  FileText,
  MessageCircle,
} from "lucide-react";

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
        thumb: msg.media_url?.[0],
        text: msg.caption || "Photo",
      };

    case "video":
      return {
        type: "video",
        thumb:
          msg.thumbnail?.[0] ??
          msg.media_url?.[0],
        text: msg.caption || "Video",
      };

    case "gif":
      return {
        type: "gif",
        thumb: msg.media_url?.[0],
        text: "GIF",
      };

    case "sticker":
      return {
        type: "sticker",
        thumb: msg.media_url?.[0],
        text: "Sticker",
      };

    case "audio":
      return {
        type: "audio",
        text: "Voice message",
      };

    case "gallery": {
      const media = msg.media_url ?? [];

      const images = media.filter(
        (url) =>
          !url.includes(".mp4") &&
          !url.includes(".mov") &&
          !url.includes(".webm")
      ).length;

      const videos = media.length - images;

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
        text: msg.caption || "Attachment",
      };
  }
};

export default function CommunityPinnedBar({
  pinnedMessages,
  onJumpToMessage,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [expandedAll, setExpandedAll] = useState(false);

  if (!pinnedMessages.length) {
    return null;
  }

  const newest = pinnedMessages[0];

  const previewMessages = expandedAll
    ? pinnedMessages
    : pinnedMessages.slice(0, 3);

  const newestPreview =
    getPinnedPreview(newest);

  const handleJump = (message: Message) => {
    if (message.id == null) {
      console.warn(
        "[PINNED] Message has no backend ID:",
        message
      );
      return;
    }

    console.log(
      "[PINNED] Jumping to message:",
      message.id
    );

    onJumpToMessage?.(Number(message.id));
  };

  return (
    <div
      className="
        border-b
        sticky
        top-14
        z-20
        w-full
        border-gray-200
        dark:border-gray-800
        bg-gray-200
        dark:bg-[#0f1720]
      "
    >
      {/* =========================
          HEADER
      ========================== */}

      <button
        type="button"
        onClick={() => {
          if (pinnedMessages.length === 1) {
            handleJump(newest);
            return;
          }
  
          if (pinnedMessages.length > 1) {
            setExpanded((prev) => !prev);
          }
        }}
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
          text-left
        "
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Pin
            size={16}
            className="
              text-indigo-500
              flex-shrink-0
            "
          />

          <div className="min-w-0 flex-1">
            {pinnedMessages.length > 1 && (
              <div className="text-xs text-gray-500">
                1 of {pinnedMessages.length}
              </div>
            )}

            <div className="flex items-center gap-2 mt-1">
              {newestPreview.thumb && (
                <div className="relative flex-shrink-0">
                  <img
                    src={newestPreview.thumb}
                    alt=""
                    className="
                      w-10
                      h-10
                      rounded
                      object-cover
                    "
                  />

                  {newestPreview.type === "video" && (
                    <Play
                      size={12}
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
              )}

              <div className="min-w-0">
                <div
                  className="
                    text-sm
                    truncate
                    text-gray-600
                    dark:text-gray-200
                    font-medium
                  "
                >
                  {newestPreview.text}
                </div>
              </div>
            </div>
          </div>
        </div>

        {pinnedMessages.length > 1 &&
          (expanded ? (
            <PanelTopClose
              size={18}
              className="text-gray-700 dark:text-gray-100 flex-shrink-0"
            />
          ) : (
            <PanelTopOpen
              size={18}
              className="text-gray-700 dark:text-gray-100 flex-shrink-0"
            />
          ))}
      </button>

      {/* =========================
          PINNED MESSAGE LIST
      ========================== */}

      {expanded &&
        pinnedMessages.length > 1 && (
          <div
            className="
              border-t
              border-gray-300
              dark:border-gray-800
            "
          >
            {previewMessages.map((msg) => {
              const preview =
                getPinnedPreview(msg);

              return (
                <button
                  type="button"
                  key={
                    msg.id ??
                    msg.client_id
                  }
                  onClick={() =>
                    handleJump(msg)
                  }
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
                    <div
                      className="
                        relative
                        flex-shrink-0
                      "
                    >
                      <img
                        src={preview.thumb}
                        alt=""
                        className="
                          w-12
                          h-12
                          rounded-md
                          object-cover
                        "
                      />

                      {preview.type ===
                        "video" && (
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
                        bg-gray-300
                        dark:bg-gray-700
                        flex 
                        text-gray-700
                        dark:text-gray-300
                        items-center
                        justify-center
                        text-xl
                        flex-shrink-0
                      "
                    >
                      {preview.type ===
                      "gallery" ? (
                        <Images size={22} />
                      ) : preview.type ===
                        "audio" ? (
                        <Mic size={22} />
                      ) : preview.type ===
                        "gif" ? (
                        <FileImage size={22} />
                      ) : preview.type ===
                        "sticker" ? (
                        <Sticker size={22} />
                      ) : preview.type ===
                        "file" ? (
                        <FileText size={22} />
                      ) : (
                        <MessageCircle
                          size={22}
                        />
                      )}
                    </div>
                  )}

                  {/* Text */}

                  <div className="flex-1 min-w-0">
                    <div
                      className="
                        text-sm 
                        text-gray-700
                        dark:text-gray-100
                        font-medium
                        truncate
                      "
                    >
                      {preview.text}
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Show More */}

            {pinnedMessages.length > 3 &&
              !expandedAll && (
                <button
                  type="button"
                  onClick={() =>
                    setExpandedAll(true)
                  }
                  className="
                    w-full
                    py-2
                    text-sm
                    text-indigo-600
                    hover:bg-gray-50
                    dark:hover:bg-gray-800
                  "
                >
                  Show All (
                  {pinnedMessages.length})
                </button>
              )}

            {/* Show Less */}

            {expandedAll && (
              <button
                type="button"
                onClick={() =>
                  setExpandedAll(false)
                }
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