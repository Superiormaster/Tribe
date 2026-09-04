'use client';

import { useEffect, useState, useRef, useMemo } from "react";
import MediaGrid from '@/components/chat/MediaGridBubble';
import { Message } from "@/utils/chat/messageContract";
import { getMessageKey } from "@/utils/chat/messageMerger";
import { createPortal } from "react-dom";
import { formatCount } from '@/utils/formatCount';
import useMediaPreview from "@/utils/chat/useMediaPreview";
import useBubbleGestures from "@/utils/chat/useBubbleGestures";
import ReplyPreview from "@/components/Com-Pri-Chat/ReplyPreview";
import MessageFooter from "@/components/Com-Pri-Chat/MessageFooter";
import ReactionPicker from "@/components/Com-Pri-Chat/ReactionPicker";
import ForwardButton from "@/components/Com-Pri-Chat/ForwardButton";
import MediaContainer from "@/components/Com-Pri-Chat/MediaContainer";
import ReplyIcon from "@/components/Com-Pri-Chat/ReplyIcon";
import ProgressiveImage from '@/components/chat/ProgressiveImage';
import {
  Reply,
  Download,
  Play,
  Video,
  Forward,
} from "lucide-react";
import AudioBubble from "@/components/chat/AudioBubble";

type MediaItem = {
  url: string | null;
  thumbnail?: string;
  duration?: number;
  blob?: Blob;
};

type ReactionUser = {
  id: number;
  username: string;
};

type Reaction = {
  emoji: string;
  count: number;
  users: ReactionUser[];
};

export default function CommunityBubbles({
  msg,
  isCurrentUser,
  currentUserId,
  sameUser,
  resendPendingMessage,
  retryFailedMessage,
  resendMedia,
  closeReactionPicker,
  priority = false,

  selectedMessages,
  toggleSelectMessage,
  clearSelection,

  previewState,
  setPreviewState,
  onReaction, 
  onOpenDrawer,
  replyingTo,
  setReplyingTo,
  onForward,
  
  activeReaction,
  setActiveReaction,
  jumpToMessage,
}: any) {

  const messageKey = getMessageKey(msg);

  if (!messageKey) {
    console.warn(
      "[PrivateBubble] Message has no valid key:",
      msg
    );
    return null;
  }
  
  const id = messageKey;
  const isSelected = selectedMessages.has(id);
  const inSelectionMode = selectedMessages.size > 1;
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [reactionPosition, setReactionPosition] = useState({
    top: 0,
    left: 0,
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
  
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };
  
  const isVisualMedia =
    ["image", "video", "gif", "sticker", "gallery"].includes(
      msg.media_type
    );
  
  const canOpenMediaPreview =
    selectedMessages?.size === 0 &&
    ["image", "video", "gallery"].includes(
      msg.media_type
    );
  
  const reactionMessageId =
    msg.id != null
      ? String(msg.id)
      : null;

  const {
    mediaItems,
    mediaSrc,
    files,
    canPreview,
    openPreview,
  } = useMediaPreview({
    msg,
    isCurrentUser,
    setPreviewState,
    setReplyingTo,
  });
  
  const firstMedia = mediaItems[0];
  
  const handleMediaPreview = (index = 0) => {
    if (selectedMessages?.size > 0) {
      return;
    }
  
    const item = mediaItems[index];
  
    if (
      !item ||
      typeof item.url !== "string" ||
      !item.url.trim()
    ) {
      console.warn(
        "[MEDIA PREVIEW] Invalid media item",
        {
          messageId: msg.id,
          index,
          mediaItems,
        }
      );
  
      return;
    }
  
    openPreview(index);
  };

  const imageSrc =
    firstMedia?.url || null;
  
  const imageThumb =
    firstMedia?.thumbnail ||
    imageSrc ||
    null;
  
  const videoSrc =
    firstMedia?.url || null;
  
  const videoThumb =
    firstMedia?.thumbnail ||
    videoSrc ||
    null;
  
  const videoDuration =
    firstMedia?.duration || 0;

  const isMediaMessage =
    !!(
      msg.media_type ||
      msg.media_url?.length ||
      msg.media_assets?.length ||
      msg.external_media_urls?.length
    );
  
  const showReactions = activeReaction === id;
  const userReactionEmojis = useMemo(() => {
    const userId = Number(currentUserId);
  
    return new Set(
      (msg.reactions || [])
        .filter((reaction: Reaction) =>
          Array.isArray(reaction.users) &&
          reaction.users.some(
            (user) =>
              Number(user.id) === userId
          )
        )
        .map(
          (reaction: Reaction) =>
            reaction.emoji
        )
    );
  }, [
    msg.reactions,
    currentUserId,
  ]);
  
  const replyMessage = msg.reply_to ?? null;

  const hasValidReply = Boolean(replyMessage);
  
  const {
    dragX,
    dragging,
    bindBubble,
    TRIGGER,
    canReply,
  } = useBubbleGestures({
    id,
    msg,
    isCurrentUser,
    isMediaMessage,
    selectedMessages,
    toggleSelectMessage,
    setReplyingTo,
    setActiveReaction,
    openPreview: canOpenMediaPreview
      ? () => {
          if (selectedMessages?.size > 0) {
            return;
          }
  
          handleMediaPreview(0);
        }
      : () => {},
  });
  
  useEffect(() => {
    if (!showReactions || !bubbleRef.current) return;
  
    const rect = bubbleRef.current.getBoundingClientRect();

    const pickerWidth = 320; // approximate width
    const padding = 8;
    
    let left = rect.left + rect.width / 2;
    
    left = Math.max(
      pickerWidth / 2 + padding,
      Math.min(window.innerWidth - pickerWidth / 2 - padding, left)
    );
    
    setReactionPosition({
      top: rect.bottom + 8,
      left,
    });
  }, [showReactions]);
  
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
  
      case "image": {
        const item = mediaItems[0];
  
        const imageSrc =
          item?.url || null;
  
        const localPreview =
          msg.files?.[0]?.preview;
  
        const imageThumb =
          item?.thumbnail ||
          imageSrc ||
          localPreview ||
          null;
  
        if (!imageSrc && !localPreview) {
          return null;
        }
  
        return (
          <div
            data-media={imageSrc}
            data-type="image"
            className="select-none"
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDragStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <ProgressiveImage
              src={
                imageSrc ||
                localPreview
              }
              thumb={
                imageThumb
              }
              priority={priority}
              onClick={(e) => {
                if (selectedMessages?.size > 0) {
                  e.preventDefault();
                  e.stopPropagation();
                  return;
                }
              
                handleMediaPreview(0);
              }}
              className="
                w-full
                h-full
                object-cover
                aspect-[4/5]
                cursor-pointer
                transition-all
                duration-300
              "
            />
          </div>
        );
      }
  
      case "video": {
        const video = mediaItems[0];
      
        const videoSrc =
          typeof video?.url === "string"
            ? video.url
            : null;
      
        const thumbnail =
          typeof video?.thumbnail === "string" &&
          video.thumbnail.length > 0
            ? video.thumbnail
            : null;
      
        const duration =
          Number(video?.duration || 0);
      
        const localVideo =
          msg.files?.[0]?.preview || null;
      
        const actualVideoSrc =
          localVideo || videoSrc;
      
        if (!actualVideoSrc) {
          return (
            <div
              className="
                w-full
                aspect-[4/5]
                bg-black
                flex
                items-center
                justify-center
              "
            />
          );
        }
      
        const uploaded = [
          "sent",
          "delivered",
          "seen",
        ].includes(msg.status);
      
        return (
          <VideoBubble
            videoSrc={actualVideoSrc}
            thumbnail={thumbnail}
            uploaded={uploaded}
            duration={duration}
            priority={priority}
            onClick={(e) => {
              if (selectedMessages?.size > 0) {
                e.preventDefault();
                e.stopPropagation();
                return;
              }
            
              handleMediaPreview(0);
            }}
          />
        );
      }
  
      case "gallery": {
        const galleryItems = mediaItems.filter(
          (
            item
          ): item is typeof item & { url: string } =>
            typeof item.url === "string" &&
            item.url.length > 0
        );
      
        return (
          <MediaGrid
            items={galleryItems.map((item) => ({
              url: item.url,
              thumb:
                typeof item.thumbnail === "string"
                  ? item.thumbnail
                  : item.url,
              mediaType: item.mediaType,
              duration: item.duration,
            }))}
            onOpen={(index) => {
              if (selectedMessages?.size > 0) {
                return;
              }
      
              handleMediaPreview(index);
            }}
          />
        );
      }
  
      case "gif": {
        const item =
          mediaItems[0];
  
        if (!item?.url) {
          return null;
        }
  
        return (
          <div
            data-media={item.url}
            data-type="gif"
            className="select-none"
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDragStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <ProgressiveImage
              priority={priority}
              src={item.url}
              thumb={
                item.thumbnail ||
                item.url
              }
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
      }
  
      case "sticker": {
        const item =
          mediaItems[0];
  
        if (!item?.url) {
          return null;
        }
  
        return (
          <div
            data-media={item.url}
            data-type="sticker"
            className="select-none"
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDragStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <ProgressiveImage
              priority={priority}
              src={item.url}
              thumb={
                item.thumbnail ||
                item.url
              }
              className={`
                w-auto
                h-auto
                max-w-[140px]
                ${stickerSize}
                max-h-[140px]
                rounded-xl
                object-contain
                drop-shadow-lg
              `}
            />
          </div>
        );
      }
  
      default:
        return null;
    }
  };
  
  const reactionSummary = useMemo<[string, number][]>(() => {
    return (msg.reactions || [])
      .map(
        (reaction: Reaction): [string, number] => [
          reaction.emoji,
          Number(reaction.count || 0),
        ]
      )
      .filter(
        (item: [string, number]) => item[1] > 0
      )
      .sort(
        (a: [string, number], b: [string, number]) =>
          b[1] - a[1]
      );
  }, [msg.reactions]);
  
  const visibleReactionSummary =
    reactionSummary.slice(0, 4);
  
  const hiddenReactionTypes =
    Math.max(
      0,
      reactionSummary.length -
        visibleReactionSummary.length
    );
  
  const renderMessageText = () => {
    const text = msg.encrypted_text || "";
  
    if (!text) return null;
  
    const mentions = msg.mentions || [];
  
    // @all / @All / @ALL
    const allMentionRegex = /@all\b/gi;
  
    // Build username lookup
    const mentionUsernames = new Set(
      mentions
        .map((mention: any) => {
          // Local optimistic mention
          if (mention?.username) {
            return mention.username;
          }
    
          // Backend mention
          if (mention?.user?.username) {
            return mention.user.username;
          }
    
          return null;
        })
        .filter(Boolean)
    );
  
    // Match @username OR @all
    const parts = text.split(/(@[a-zA-Z0-9_]+)\b/g);
  
    return parts.map((part: string, index: number) => {
      if (!part.startsWith("@")) {
        return (
          <span key={index}>
            {part}
          </span>
        );
      }
  
      const value = part.slice(1);
  
      // @all should always be highlighted
      if (msg.mention_all && value.toLowerCase() === "all") {
        return (
          <span
            key={index}
            className="text-indigo-600 dark:text-indigo-400 font-semibold"
          >
            {part}
          </span>
        );
      }
  
      // User mention
      if (mentionUsernames.has(value)) {
        return (
          <span
            key={index}
            className="text-indigo-600 dark:text-indigo-400 font-semibold"
          >
            {part}
          </span>
        );
      }
  
      return (
        <span key={index}>
          {part}
        </span>
      );
    });
  };
  
  const showSenderName =
  !isCurrentUser && !sameUser;
  
  const canForward =
    isVisualMedia &&
    ["sent", "delivered", "seen"].includes(msg.status);
  
  const handleForwardClick = (
    e: React.MouseEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();
  
    setActiveReaction(null);
  
    onForward?.([msg]);
  };
  
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

      {...bindBubble}
      id={`message-${msg.id}`}
      data-message-id={msg.id}
      data-client-id={msg.client_id}
    >

      {/* REACTIONS */}
      {mounted && canReply &&
      showReactions &&
      reactionMessageId &&
      createPortal(
        <ReactionPicker
          top={reactionPosition.top}
          left={reactionPosition.left}
          visible={showReactions}
          messageId={reactionMessageId}
          onReact={onReaction}
          isCurrentUser={isCurrentUser}
          onClose={() => {
            setActiveReaction(null);
            closeReactionPicker?.();
            clearSelection();
          }}
          onClearSelection={clearSelection}
          onOpenEmojiDrawer={() => {
            clearSelection();
            closeReactionPicker?.();
            onOpenDrawer?.("emoji");
          }}
        />,
        document.body
      )}

      {/* FIXED AVATAR COLUMN */}
      {!isCurrentUser && (
        <div className="w-8 shrink-0 mr-2">
          {showSenderName ? (
            <div className="w-8 h-8 border rounded-full dark:border-indigo-500/5 border-gray-400 mt-1">
              {msg.sender_avatar ? (
                <img
                  src={msg.sender_avatar}
                  alt={
                    msg.sender_username ||
                    msg.sender_name ||
                    "User"
                  }
                  className="
                    w-8
                    h-8
                    rounded-full
                    object-cover
                    border
                    border-gray-300
                    dark:border-gray-700
                  "
                />
              ) : (
                <div
                  className="
                    w-8
                    h-8
                    rounded-full
                    bg-gray-300
                    dark:bg-gray-700
                    flex
                    items-center
                    justify-center
                    text-xs
                    border
                    font-semibold
                    text-gray-600
                    dark:text-gray-300
                  "
                >
                  {(
                    msg.sender_username ||
                    msg.sender_name ||
                    "?"
                  )
                    .charAt(0)
                    .toUpperCase()}
                </div>
              )}
            </div>
          ) : (
            // Keep the exact same space for grouped messages
            <div className="w-8 h-8" />
          )}
        </div>
      )}
  
      <div
        ref={bubbleRef}
        style={{
          transform: isCurrentUser
            ? `translateX(-${dragX}px)`
            : `translateX(${dragX}px)`,
      
          transition: dragging
            ? 'none'
            : 'transform 0.35s cubic-bezier(0.2,0.8,0.2,1)',
        }}
      
        className={`
          relative
          px-3
          py-2 ml-2
          shadow-sm
          w-auto
          max-w-[78%]
          min-w-[80px]
      
          ${
            ["sticker", "gif"].includes(msg.media_type)
              ? "bg-transparent shadow-none p-0"
              : isCurrentUser
                ? `
                  rounded-2xl
                  rounded-br-md
                  bg-gray-200
                  dark:bg-indigo-900
                  text-white
                `
                : `
                  bg-gray-400
                  dark:bg-indigo-500/5
                  text-white
                
                  rounded-tr-2xl
                  rounded-br-2xl
                  rounded-bl-md
                  rounded-tl-[10px]
                `
          }
        `}
      >
        {showSenderName && (
          <div className="mb-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            {msg.sender_username ||
              msg.sender_name ||
              msg.sender?.username ||
              "Unknown"}
          </div>
        )}
  
        {canForward && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <ForwardButton
              isCurrentUser={isCurrentUser}
              onClick={handleForwardClick}
            />
          </div>
        )}

        {/* REPLY ICON */}
        {dragging && dragX > 8 && canReply && (
          <ReplyIcon
              dragging={dragging}
              dragX={dragX}
              trigger={TRIGGER}
              isCurrentUser={isCurrentUser}
          />
        )}

        {/* REPLY PREVIEW */}
        {hasValidReply && (
          <ReplyPreview
            reply={msg.reply_to}
            isCurrentUser={isCurrentUser}
            onClick={() => {
              const originalId = Number(
                msg.reply_to?.id
              );
        
              if (!originalId) {
                console.warn(
                  "[REPLY JUMP] Original message ID missing:",
                  msg.reply_to
                );
                return;
              }
        
              jumpToMessage?.(originalId);
            }}
          />
        )}

        {/* MEDIA RENDER */}
        {isVisualMedia && (
          <>
            <MediaContainer
              status={msg.status}
              progress={msg.upload_progress}
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
              status={msg.status}
              onRetry={() => {
                resendMedia?.(msg);
              }}
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
              }}
            >
              {renderMessageText()}
            </p>
          )
        )}

        {/* FOOTER */}
        <MessageFooter
          msg={msg}
          isCurrentUser={isCurrentUser}
          isMediaMessage={isMediaMessage}
          retryFailedMessage={retryFailedMessage}
          resendPendingMessage={resendPendingMessage}
        />

        {/* REACTION SUMMARY */}
        {reactionSummary.length > 0 && (
          <div
            className={`
              mt-2 flex flex-wrap gap-2
              ${
                isCurrentUser
                  ? "justify-end"
                  : "justify-start"
              }
            `}
          >
            {visibleReactionSummary.map(
              ([emoji, count]) => {
                const isMine =
                  userReactionEmojis.has(emoji);
            
                return (
                  <button
                    key={emoji}
                    onClick={() => {
                      if (!reactionMessageId) return;
                  
                      onReaction?.(reactionMessageId, emoji);
                    }}
                    className={`
                      flex
                      items-center
                      gap-1
                      px-2.5
                      py-1
                      rounded-full
                      text-xs
                      transition-all
                      active:scale-95
            
                      ${
                        isMine
                          ? `
                            bg-gray-300 dark:bg-indigo-800 text-white
                          `
                          : `
                            bg-gray-300 dark:bg-indigo-500/10 text-white
                          `
                      }
            
                      text-gray-800
                      dark:text-white
                    `}
                  >
                    <span>{emoji}</span>
            
                    {count > 1 && (
                      <span
                        className="text-[11px] font-medium text-gray-600 dark:text-white opacity-90"
                      >
                        {formatCount(count)}
                      </span>
                    )}
                  </button>
                );
              }
            )}
        
            {hiddenReactionTypes > 0 && (
              <button
                className={`
                  px-2.5 py-1 rounded-full text-xs
                  ${
                    isCurrentUser
                      ? "bg-gray-300 dark:bg-indigo-800 text-white"
                      : "bg-gray-300 dark:bg-indigo-500/10 text-white"
                  }
                `}
              >
                +{hiddenReactionTypes}
              </button>
            )}
          </div>
        )}
        
      </div>
    </div>
  );
}

function VideoBubble({
  videoSrc,
  thumbnail,
  uploaded,
  duration,
  priority,
  onClick,
}: {
  videoSrc: string;
  thumbnail: string | null;
  uploaded: boolean;
  duration: number;
  priority?: boolean;
  onClick: (event: React.MouseEvent<HTMLDivElement>) => void;
}) {
  const [thumbnailFailed, setThumbnailFailed] =
    useState(false);

  const [videoFailed, setVideoFailed] =
    useState(false);

  const showThumbnail =
    uploaded &&
    !!thumbnail &&
    !thumbnailFailed;

  const showVideo =
    !showThumbnail &&
    !videoFailed;

  return (
    <div
      className="
        relative
        w-full
        aspect-[4/5]
        overflow-hidden
        bg-black
        cursor-pointer
        select-none
      "
      onClick={onClick}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDragStart={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >

      {/* THUMBNAIL */}
      {showThumbnail && (
        <img
          src={thumbnail}
          alt=""
          className="
            absolute
            inset-0
            w-full
            h-full
            object-cover
          "
          loading={
            priority
              ? "eager"
              : "lazy"
          }
          onError={() => {
            console.warn(
              "[VIDEO THUMBNAIL] Failed:",
              thumbnail
            );

            setThumbnailFailed(true);
          }}
        />
      )}

      {/* VIDEO FALLBACK */}
      {showVideo && (
        <video
          src={videoSrc}
          muted
          playsInline
          preload="metadata"
          className="
            absolute
            inset-0
            w-full
            h-full
            object-cover
          "
          onError={() => {
            console.warn(
              "[VIDEO FALLBACK] Failed:",
              videoSrc
            );

            setVideoFailed(true);
          }}
        />
      )}

      {/* BLACK FALLBACK */}
      {videoFailed && (
        <div
          className="
            absolute
            inset-0
            bg-black
          "
        />
      )}

      {/* PLAY BUTTON */}
      {!videoFailed && (
        <div
          className="
            absolute
            inset-0
            flex
            items-center
            justify-center
          "
        >
          <div
            className="
              w-16
              h-16
              rounded-full
              bg-black/50
              flex
              items-center
              justify-center
            "
          >
            <Play
              size={32}
              fill="white"
              className="
                text-white
                ml-1
              "
            />
          </div>
        </div>
      )}

      {/* DURATION */}
      <div
        className="
          absolute
          bottom-3
          left-3
          flex
          items-center
          gap-1
          bg-black/60
          px-2
          py-1
          rounded-full
          text-white
        "
      >
        <Video size={14} />

        <span className="text-xs">
          {formatVideoDuration(duration)}
        </span>
      </div>
    </div>
  );
}

function formatVideoDuration(
  seconds: number
) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  return `${mins}:${secs
    .toString()
    .padStart(2, "0")}`;
}