'use client';

import { useEffect, useState, useRef, useMemo } from "react";
import MediaGrid from '@/components/chat/MediaGridBubble';
import { Message } from "@/utils/chat/messageContract";
import { formatCount } from '@/utils/formatCount';
import { createPortal } from "react-dom";
import { getMessageKey } from "@/utils/chat/messageMerger";
import useMediaPreview from "@/utils/chat/useMediaPreview";
import useBubbleGestures from "@/utils/chat/useBubbleGestures";
import ReplyPreview from "@/components/Com-Pri-Chat/ReplyPreview";
import MessageFooter from "@/components/Com-Pri-Chat/MessageFooter";
import ReactionPicker from "@/components/Com-Pri-Chat/ReactionPicker";
import ReplyIcon from "@/components/Com-Pri-Chat/ReplyIcon";
import ForwardButton from "@/components/Com-Pri-Chat/ForwardButton";
import MediaContainer from "@/components/Com-Pri-Chat/MediaContainer";
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
  mediaType?: "image" | "video" | "gif" | "sticker" | "audio";
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

  previewState,
  setPreviewState,
  onReaction, 
  onOpenDrawer,
  replyingTo,
  setReplyingTo,
  onForward,
  
  activeReaction,
  closeReactionPicker,
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
  
    if (!canPreview) {
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
  const isMine = (reaction: any) => false; 

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
  })
  
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
  
  const reactionMessageId =
    msg.id != null
      ? String(msg.id)
      : null;
  
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
        const [videoFailed, setVideoFailed] = useState(false);
      
        const videoSrc =
          typeof video?.url === "string"
            ? video.url
            : null;
      
        const thumbnail =
          typeof video?.thumbnail === "string"
            ? video.thumbnail
            : null;
      
        const duration =
          Number(video?.duration || 0);
      
        const localVideo =
          msg.files?.[0]?.preview || null;
      
        const uploaded = [
          "sent",
          "delivered",
          "seen",
        ].includes(msg.status);
      
        const source =
          uploaded
            ? videoSrc
            : localVideo || videoSrc;
      
        if (!source) {
          return (
            <div
              className="
                relative
                w-full
                aspect-[4/5]
                bg-black
                flex
                items-center
                justify-center
              "
            >
              <Play
                size={32}
                className="text-white/70"
              />
            </div>
          );
        }
      
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
            onClick={(e) => {
              if (selectedMessages?.size > 0) {
                e.preventDefault();
                e.stopPropagation();
                return;
              }
            
              handleMediaPreview(0);
            }}
            data-media={videoSrc}
            data-type="video"
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDragStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
      
            {uploaded && thumbnail && !videoFailed ? (
      
              <ProgressiveImage
                priority={priority}
                src={thumbnail}
                thumb={thumbnail}
                className="
                  absolute
                  inset-0
                  w-full
                  h-full
                  object-cover
                "
              />
      
            ) : (
      
              <video
                src={source}
                muted
                playsInline
                preload="metadata"
                className="
                  absolute
                  inset-0
                  w-full
                  h-full
                  object-cover
                  bg-black
                "
              />
      
            )}
      
            {/*
             * PLAY BUTTON
             */}
            <div
              className="
                absolute
                inset-0
                flex
                items-center
                justify-center
                pointer-events-none
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
      
            {/*
             * DURATION
             */}
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
                pointer-events-none
              "
            >
              <Video size={14} />
      
              <span className="text-xs">
                {formatDuration(duration)}
              </span>
            </div>
      
          </div>
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
      data-message-id={msg.id}
      data-client-id={msg.client_id}
    >

      {/* REACTIONS */}
      {mounted && canReply &&
      showReactions && 
      reactionMessageId &&
      createPortal(
        <ReactionPicker
          visible={showReactions}
          top={reactionPosition.top}
          left={reactionPosition.left}
          messageId={reactionMessageId}
          onReact={onReaction}
          onClose={() => {
            setActiveReaction(null);
            closeReactionPicker();
            clearSelection();
          }}
          onClearSelection={clearSelection}
          isCurrentUser={isCurrentUser}
          onOpenEmojiDrawer={() => {
            clearSelection();
            closeReactionPicker();
            onOpenDrawer?.("emoji");
          }}
        />,
        document.body
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
            }}>
              {msg.encrypted_text}
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
                  onReaction?.(
                    msg.server_id ?? msg.id,
                    reaction.emoji
                  )
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