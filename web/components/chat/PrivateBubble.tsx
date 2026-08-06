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
  setActiveReaction,
}: any) {

  const id = getMessageKey(msg);
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

  const isMediaMessage = !!(msg.media_type || msg.media_url);
  
  const showReactions = activeReaction === id;
  const isMine = (reaction: any) => false; 
  const hasValidReply =
    msg.reply_to &&
    (msg.reply_to.encrypted_text?.trim() ||
     msg.reply_to.media_url ||
     msg.reply_to.media_type);
  
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
    openPreview: () => openPreview(0),
  })
  
  const media =
    Array.isArray(msg.media_url)
      ? msg.media_url
      : mediaSrc
        ? [mediaSrc]
        : [];
  
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
  console.log("reply_to", msg.reply_to);

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
      createPortal(
        <ReactionPicker
          visible={showReactions}
          top={reactionPosition.top}
          left={reactionPosition.left}
          messageId={id}
          onReact={onReaction}
          onClose={() => {
            setActiveReaction(null);
            clearSelection();
          }}
          onClearSelection={clearSelection}
          isCurrentUser={isCurrentUser}
          onOpenEmojiDrawer={() => {
            clearSelection();
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
        {isVisualMedia && (
          <ForwardButton
            isCurrentUser={isCurrentUser}
            onClick={() => {
                setActiveReaction(null);
                onForward();
            }}
          />
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
          />
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