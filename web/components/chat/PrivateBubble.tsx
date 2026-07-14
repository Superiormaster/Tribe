'use client';

import { useEffect, useState, useRef, useMemo } from "react";
import MediaGrid from '@/components/chat/MediaGridBubble';
import { Message } from "@/utils/chat/messageContract";
import { getMessageKey } from "@/utils/chat/messageMerger";
import ProgressiveImage from '@/components/chat/ProgressiveImage';
import {
  Reply,
  Download,
  Play, 
  Video,
  Forward,
} from 'lucide-react';

import AudioWaveform from '@/components/AudioWaveform';
import AudioBubble from "@/components/chat/AudioBubble";

type MediaItem = {
  url: string | null;
  thumbnail?: string;
  duration?: number;
  blob?: Blob;
};

export default function PrivateBubble({
  msg,
  isCurrentUser,
  sameUser,
  resendPendingMessage,
  retryFailedMessage,
  resendMedia,
  priority = false,

  selectedMessages,
  toggleSelectMessage,
  clearSelection,

  setReplyingTo,
  previewState,
  setPreviewState,
  onReaction, 
  onOpenDrawer,
  replyingTo,
  onForward,
  
  activeReaction,
  setActiveReaction,
}: any) {

  const [dragX, setDragX] =
    useState(0);

  const [dragging, setDragging] =
    useState(false);
  const isDraggingRef = useRef(false);
  const hasMoved = useRef(false);
  const didLongPress = useRef(false);

  const startX = useRef(0);

  const id = getMessageKey(msg);
  const isSelected = selectedMessages.has(id);
  const inSelectionMode = selectedMessages.size > 1;
  
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  const movedDuringTouch = useRef(false);

  const MAX_DRAG = 120;

  const TRIGGER = 60;
  
  const emojis = [
    '👍',
    '❤️',
    '😂',
    '😮',
    '😢',
    '🙏',
    '🔥',
    '👏',
    '🎉',
    '😎',
  ];
  
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
  
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };
  
  const handleDownload = async (url: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = "media";
    a.target = "_blank";
    a.click();
  };
  
  const mediaItems = useMemo<MediaItem[]>(() => {
    if (!msg.files?.length) return [];
  
    return msg.files.map((item: any): MediaItem => ({
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
  
  const files = mediaItems.map((item: MediaItem, i: number) => {
    const file = msg.files?.[i];
  
    const blob =
      file instanceof File
        ? file
        : file?.blob;
  
    const isVideo = blob?.type?.startsWith("video/");
  
    return {
      media_url: item.url,
      thumbnail: item.thumbnail,
      duration: item.duration,
      media_type: isVideo ? "video" : "image",
    };
  });
  
  useEffect(() => {
    return () => {
      mediaItems.forEach((item) => {
        if (
          item.url?.startsWith("blob:")
        ) {
          URL.revokeObjectURL(
            item.url
          );
        }
      });
    };
  }, []);
  
  const isVisualMedia =
    ["image", "video", "gif", "sticker", "gallery"].includes(
      msg.media_type
    );

  const isMediaMessage =
    msg.media_type ||
    msg.media_url 
  
  const mediaSrc =
    msg.media_url?.[0] ||
    (msg.files?.[0] instanceof File
      ? URL.createObjectURL(msg.files[0])
      : msg.files?.[0]?.blob
        ? URL.createObjectURL(msg.files[0].blob)
        : null);

  const canPreview = [
    "sent",
    "delivered",
    "seen",
  ].includes(msg.status);
  
  const media =
    Array.isArray(msg.media_url)
      ? msg.media_url
      : mediaSrc
        ? [mediaSrc]
        : [];
  
  const openPreview = (index: number) => {
    if (isDraggingRef.current && dragX > 10) return;
    if (!canPreview) return;
  
    setPreviewState({
      files,
      index,
      msg,
      isMine: isCurrentUser,
      onReply: (msg: Message) => {
        setReplyingTo(msg);
      }
    });
  };
  
  const showReactions = activeReaction === id;
  const isMine = (reaction: any) => false; 
  const hasValidReply =
    msg.reply_to &&
    (msg.reply_to.text?.trim() ||
     msg.reply_to.media_url ||
     msg.reply_to.media_type);
  
  const isUploading = msg.status === "uploading";
  const isPending = msg.status === "pending";
  const isSending = msg.status === "sending";
  const isFailed = msg.status === "failed";
  const isSent = msg.status === "sent";
  
  useEffect(() => {

    const reset = () => {
      setDragging(false);
      setDragX(0);
    };

    window.addEventListener(
      'pointerup',
      reset
    );

    window.addEventListener(
      'pointercancel',
      reset
    );

    return () => {

      window.removeEventListener(
        'pointerup',
        reset
      );

      window.removeEventListener(
        'pointercancel',
        reset
      );
    };

  }, []);
  
  const MediaContainer = ({
    children,
    msg,
    status,
    progress,
    onRetry,
    fixedAspect = true,
  }: any) => {
    return (
      <div className={`
        relative w-full ${fixedAspect ? "max-w-[320px] min-w-[220px]" : "max-w-[180px] min-w-[150px]"}
        rounded-2xl overflow-hidden
        mb-2 bg-black/10
        flex flex-col
        [&>img]:max-h-[280px]
        [&>video]:max-h-[360px]
        [&>img]:w-full
        [&>video]:w-full
      `}>
  
        {/* MEDIA AREA (fixed visual space) */}
        <div className={`
          relative w-full ${fixedAspect ? "aspect-[4/5]" : ""}
          overflow-hidden
        `}>
          {children}
  
          {/* overlays stay INSIDE media area */}
          {(status === "uploading" || status === "sending") && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
  
          {status === "download" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/45">
              <button onClick={() => handleDownload(msg.media_url)}>
                <Download />
              </button>
            </div>
          )}
  
          {(status === "uploading" || status === "sending") && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
              <div
                className="h-full bg-green-400"
                style={{ width: `${progress || 0}%` }}
              />
            </div>
          )}
  
          {(status === "failed" || status === "pending") && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center"
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
            >
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                onClick={onRetry}
                className="px-3 py-1 bg-black/60 text-white rounded-full"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  const stickerSize =
    msg.reply_to
      ? "max-w-[110px] max-h-[110px]"
      : "max-w-[150px] max-h-[150px]";
  
  const gifSize =
    msg.reply_to
      ? "max-w-[130px]"
      : "max-w-[180px]";
  
  const renderMedia = () => {
    switch (msg.media_type) {
      case "image":
        const localPreview =
          msg.files?.[0]?.preview;
      
        const serverUrl =
          Array.isArray(msg.media_url)
              ? msg.media_url[0]
              : msg.media_url;
      
        const imageSrc =
          msg.status === "sent" ||
          msg.status === "delivered" ||
          msg.status === "seen"
              ? serverUrl
              : localPreview || serverUrl;

        return (
          <div
            data-media={imageSrc}
            data-type="image"
          >
            <ProgressiveImage
              src={
                imageSrc ||
                localPreview
              }
              thumb={
                imageSrc ||
                localPreview
              }
              priority={priority}
              onClick={() => openPreview(0)}
              className={`
                w-full h-full object-cover aspect-[4/5] cursor-pointer transition-all duration-300 
                ${canPreview ? "cursor-pointer" : "pointer-events-none opacity-80"}
              `}
            />
          </div>
        );
  
      case "video":
        const videoSrc =
          Array.isArray(msg.media_url)
            ? msg.media_url[0]
            : msg.media_url;
    
        const duration =
          Array.isArray(msg.duration)
            ? msg.duration[0]
            : msg.duration;
    
        const localVideo =
          msg.files?.[0]?.preview;
      
        const serverVideo =
          Array.isArray(msg.media_url)
              ? msg.media_url[0]
              : msg.media_url;
      
        const thumbnail =
          Array.isArray(msg.thumbnail)
              ? msg.thumbnail[0]
              : msg.thumbnail;
      
        const uploaded =
          ["sent","delivered","seen"].includes(msg.status);

        return (
          <div
            className="
              relative w-full cursor-pointer
            "
            onClick={() => openPreview(0)}
            data-media={videoSrc}
            data-type="video"
          >
            {uploaded ? (
              <ProgressiveImage
                priority={priority}
                  src={thumbnail}
                  thumb={thumbnail}
                  className="w-full h-full aspect-[4/5] object-cover"
              />
            ) : (
              <video
                  src={localVideo}
                  muted
                  playsInline
                  preload="metadata"
                  className="w-full aspect-[4/5] h-full object-cover"
              />
            )}
      
            <div
              className="
                absolute inset-0
                flex items-center justify-center
              "
            >
              <div
                className="
                  w-16 h-16 rounded-full
                  bg-black/50
                  flex items-center justify-center
                "
              >
                <Play
                  size={32}
                  fill="white"
                  className="text-white ml-1"
                />
              </div>
            </div>
      
            <div
              className="
                absolute bottom-3 left-3
                flex items-center gap-1
                bg-black/60
                px-2 py-1
                rounded-full
                text-white
              "
            >
              <Video size={14} />
      
              <span className="text-xs">
                {formatDuration(
                  duration || 0
                )}
              </span>
            </div>
          </div>
        );
  
      case "gallery":
        return (
          <MediaGrid
            items={mediaItems
            .filter(
              (item): item is typeof item & { url: string } =>
                item.url !== null
            )
            .map((item, index) => ({
              url: item.url,
              thumb: item.thumbnail,
              priority: priority && index < 2,
            }))}
            onOpen={(i) => openPreview(i)}
          />
        );
  
      case "gif":
        return (
          <div
            data-media={msg.media_url}
            data-type="gif"
          >
            <ProgressiveImage
              priority={priority}
              src={msg.media_url}
              thumb={msg.thumbnail}
              className={`
                w-full
                max-w-[180px]
                ${gifSize}
                max-h-[180px]
                rounded-xl
                cursor-pointer
              `}
            />
          </div>
        );

      case "sticker":
        return (
          <div
            data-media={msg.media_url}
            data-type="sticker"
          >
            <ProgressiveImage
              priority={priority}
              src={msg.media_url}
              thumb={msg.thumbnail}
              className={`
                w-auto h-auto
                max-w-[140px]
                ${stickerSize}
                max-h-[140px] rounded-xl
                object-contain
                drop-shadow-lg
              `}
            />
          </div>
        );
  
      default:
        return null;
    }
  };
  
  const getReplyPreview = (reply: any) => {
    if (!reply) return null;
  
    // normalize media safely
    const media = Array.isArray(reply.media_url)
      ? reply.media_url
      : typeof reply.media_url === "string"
        ? [reply.media_url]
        : [];
  
    // 1. TEXT FIRST
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
  
    const type = reply.media_type;
  
    switch (type) {
      case "image":
        return {
          type: "image",
          thumb: first,
          text: reply.caption || "Photo",
        };
  
      case "video":
        return {
          type: "video",
          thumb: reply.thumbnail || first,
          text: reply.caption || "Video",
        };
  
      case "gif":
        return {
          type: "gif",
          thumb: first,
          text: "GIF",
        };
  
      case "sticker":
        return {
          type: "sticker",
          thumb: first,
          text: "Sticker",
        };
  
      case "gallery":
        return {
          type: "gallery",
          thumb: first,
          text: `${media.length} media`,
        };
  
      default:
        return {
          type: "file",
          thumb: first,
          text: "Attachment",
        };
    }
  };

  const replyPreview = msg.reply_to
    ? getReplyPreview(msg.reply_to)
    : null;

  return (
    <div
      className={`
        relative px-2 py-[2px] z-20 flex
        ${
          isCurrentUser
            ? 'justify-end'
            : 'justify-start'
        }

        ${
          isSelected
            ? 'bg-indigo-900/30'
            : ''
        }
      `}

      data-message-id={msg.id}
      data-client-id={msg.client_id}

      onClick={(e) => {
        e.stopPropagation();
      
        if (selectedMessages.size > 0) {
          return toggleSelectMessage(id);
        }
      }}

      onPointerDown={(e) => {
        setDragging(true);
        startX.current = e.clientX;
        hasMoved.current = false;
      }}

      onPointerMove={(e) => {
        if (!dragging) return;
      
        const delta = e.clientX - startX.current;
      
        if (Math.abs(delta) > 8) {
          hasMoved.current = true;
        }
      
        if (!hasMoved.current) return;
        isDraggingRef.current = true;
      
        let raw = 0;
      
        if (isCurrentUser) {
          // My bubble -> swipe left
          if (delta < 0) {
            raw = Math.abs(delta);
          }
        } else {
          // Other user's bubble -> swipe right
          if (delta > 0) {
            raw = delta;
          }
        }
      
        if (raw > 0) {
          const resisted = Math.min(
            MAX_DRAG,
            raw * 0.6 + Math.pow(raw, 0.7)
          );
      
          setDragX(resisted);
        }
      
        if (Math.abs(delta) > 8) {
          clearTimeout(
            Number(
              (e.currentTarget as HTMLElement).dataset.timer
            )
          );
        }
      }}

      onPointerUp={() => {
        const wasSwipe = hasMoved.current;

        setDragging(false);
      
        const wasDrag = dragX > 10; // small threshold
      
        if (!wasSwipe && !didLongPress.current && isMediaMessage) {
          openPreview(0);
        }
      
        setTimeout(() => {
          isDraggingRef.current = false;
        }, 0);
      
        if (!wasDrag && dragX === 0) {
          // allow click to pass
        }
      
        if (dragX > TRIGGER) {
          setReplyingTo(msg);
        }
      
        requestAnimationFrame(() => {
          setDragX(0);
        });
      }}

      onPointerCancel={() => {
        setDragging(false);
        setDragX(0);
      }}

      onTouchStart={(e) => {
        didLongPress.current = false;
      
        const touch = e.touches[0];
      
        touchStartX.current = touch.clientX;
        touchStartY.current = touch.clientY;
        movedDuringTouch.current = false;
      
        longPressTimer.current = setTimeout(() => {
          if (!movedDuringTouch.current) {
            didLongPress.current = true;
      
            setActiveReaction(id);
            toggleSelectMessage(id);
          }
        }, 500);
      }}
  
      onTouchMove={(e) => {
        const touch = e.touches[0];
      
        const dx = Math.abs(
          touch.clientX - touchStartX.current
        );
      
        const dy = Math.abs(
          touch.clientY - touchStartY.current
        );
      
        if (dx > 5 || dy > 5) {
          movedDuringTouch.current = true;
      
          if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
          }
        }
      }}

      onTouchEnd={() => {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
      
        setTimeout(() => {
          didLongPress.current = false;
        }, 100);
      }}

      onTouchCancel={() => {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
      }}
    >

      {/* REACTIONS */}
      {showReactions && (
        <div className="absolute top-[60px] left-1/2 -translate-x-1/2 z-[998]">
  
          <div className="bg-gray-200 dark:bg-[#202c33] rounded-full px-2 py-1 flex items-center gap-4 shadow-2xl border border-indigo-400 dark:border-gray-700 overflow-x-auto max-w-[95vw]">
  
            {emojis.map(
              (emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
  
                    onReaction?.(
                      id,
                      emoji
                    );

                    setActiveReaction(null);
    
                    clearSelection();
                  }}
                  className="text-[15px] active:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              )
            )}
  
            <button className="w-10 h-10 flex items-center justify-center text-gray-700 dark:text-white text-2xl"
              onClick={() => {

                clearSelection();
  
                setTimeout(() => {
                  onOpenDrawer?.("emoji");
                }, 0);
              }}
            >
              +
            </button>
  
          </div>
        </div>
      )}

      <div
        style={{
          transform: isCurrentUser
            ? `translateX(-${dragX}px)`
            : `translateX(${dragX}px)`,

          transition: dragging
            ? 'none'
            : 'transform 0.35s cubic-bezier(0.2,0.8,0.2,1)',
        }}

        className={`
          relative px-3 py-2 rounded-2xl shadow-sm
          w-auto
          max-w-[78%]
          min-w-[80px]

          ${
            ["sticker", "gif"].includes(msg.media_type)
              ? 'bg-transparent shadow-none p-0'
              : isCurrentUser
                ? 'bg-gray-200 dark:bg-indigo-900 text-white rounded-br-md'
                : 'bg-gray-400 dark:bg-indigo-500/5 text-white rounded-bl-md'
          }
        `}
      >
        {isVisualMedia && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              console.log("FORWARD", msg);
              onForward([msg]);
            }}
            className={`
              absolute top-1/2 -translate-y-1/2
              ${
                isCurrentUser
                  ? '-left-10'
                  : '-right-10'
              }
              z-20
              p-2
              rounded-full
              bg-black/40
              text-white
            `}
          >
            <Forward size={18} />
          </button>
        )}

        {/* REPLY ICON */}
        {dragging && dragX > 8 && (
          <div
            className={`
              absolute top-1/2 -translate-y-1/2
              ${
                isCurrentUser
                  ? '-left-8'
                  : '-right-8'
              }

              pointer-events-none
              dark:text-white text-gray-700 text-xs
            `}
            style={{
              opacity: Math.min(
                1,
                dragX / TRIGGER
              ),

              transform: `
                translateY(-50%)
                scale(${Math.min(
                  1,
                  0.7 + dragX / 300
                )})
              `,
            }}
          >
            <Reply />
          </div>
        )}

        {/* REPLY PREVIEW */}
        {hasValidReply && (
          <div
            className={`
              mb-2 px-3 py-2 rounded-lg border-l-4

              ${
                isCurrentUser
                  ? 'bg-gray-300 dark:bg-[#037561] border-green-300'
                  : 'bg-[#182229] border-green-500'
              }
            `}
          >
  
            {replyPreview?.thumb && (
              <img
                src={replyPreview.thumb}
                className="w-10 h-10 rounded object-cover mt-1"
              />
            )}

            <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2 break-words">
              {replyPreview?.text}
            </p>

          </div>
        )}

        {/* MEDIA RENDER */}
        {isVisualMedia && (
          <>
            <MediaContainer
              status={msg.status}
              progress={msg.uploadProgress}
              onRetry={() => {
                console.log("RETRY CLICKED", msg);
                resendMedia?.(msg);
              }}
              fixedAspect={
                msg.media_type !== "gif" &&
                msg.media_type !== "sticker"
              }
              msg={msg}
            >
              {renderMedia()}
            </MediaContainer>
          </>
        )}

        {/* AUDIO */}
        {msg.media_type === "audio" && mediaSrc && (
          <div
            data-media={mediaSrc}
            data-type="audio"
          >
            <AudioBubble
              url={mediaSrc}
              waveform={msg.waveform}
              duration={msg.duration?.[0]}
              isMe={isCurrentUser}
            />
          </div>
        )}

        {/* TEXT */}
        {msg.is_deleted ? (
          <p className="text-xs italic text-gray-900 dark:text-gray-400">
            {msg.deleted_by_admin
              ? "This message was deleted by an admin"
              : "This message was deleted"}
          </p>
        ) : (
          msg.encrypted_text && (
            <p className="text-sm whitespace-pre-wrap break-all text-gray-700 dark:text-white overflow-hidden break-words overflow-wrap-anywhere
            "
            style={{
              overflowWrap: "anywhere",
              wordBreak: "break-word",
            }}>
              {msg.encrypted_text}
            </p>
          )
        )}

        {/* FOOTER */}
        <div className="flex justify-end items-center gap-1 mt-1">

          <span
            className={`text-[10px] ${
              isCurrentUser
                ? 'text-gray-700 dark:text-green-100'
                : 'text-gray-700 dark:text-gray-400'
            }`}
          >
            {msg.created_at &&
              new Date(
                msg.created_at
              ).toLocaleTimeString(
                [],
                {
                  hour: '2-digit',
                  minute: '2-digit',
                }
              )}
          </span>

          {isCurrentUser && (
            <span className="text-[10px] opacity-80 text-gray-700 dark:text-white">

              {msg.status ===
                'sending' && '⏳'}

              {msg.status ===
                'pending' && '⏳'}

              {msg.status ===
                'sent' && '✓'}

                {msg.status ===
                  'delivered' && '✓✓'}

              <span className="text-indigo-600 dark:text-indigo-300">
                {msg.status ===
                  'seen' && '✓✓'}
              </span>
              {msg.status === "uploading" && "⏳"}
              {msg.status === "failed" && isMediaMessage && ("⏳")}

              {!isMediaMessage && (
                <>
                  {msg.status === "failed" && (
                    <button
                      onClick={() =>
                        retryFailedMessage?.(msg)
                      }
                      className="text-red-500 dark:text-red-300"
                    >
                      Retry
                    </button>
                  )}
              
                  {msg.status === "pending" && (
                    <button
                      onClick={() =>
                        resendPendingMessage?.(msg)
                      }
                      className="text-red-300"
                    >
                      Resend
                    </button>
                  )}
                </>
              )}

            </span>
          )}

        </div>

        {/* REACTION SUMMARY */}
        {msg.reactions?.length > 0 && (
          <div
            className={`
              mt-2
              flex flex-wrap gap-1
              ${
                isCurrentUser
                  ? 'justify-end'
                  : 'justify-start'
              }
            `}
          >
            {msg.reactions.map((reaction: any) => (
              <button
                key={reaction.emoji}
                onClick={() =>
                  onReaction?.(id, reaction.emoji)
                }
                className={`
                  px-2 py-[3px]
                  rounded-full
                  text-xs
                  ${
                    isCurrentUser
                      ? 'bg-gray-300 dark:bg-indigo-800 text-white'
                      : 'bg-gray-300 dark:bg-indigo-500/5 text-white'
                  }
                `}
              >
                {reaction.emoji}
              </button>
            ))}
          </div>
        )}
        
      </div>
    </div>
  );
}