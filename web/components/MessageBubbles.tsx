'use client';

import React, {
  useRef,
  useState,
  useEffect,
  useMemo,
} from 'react';

import AudioWaveform from '@/components/AudioWaveform';

type Message = {
  id: number | string;
  text?: string;
  encrypted_text?: string;
  username: string;
  avatar?: string;
  preview?: string;
  created_at?: string;
  seen_by?: number[];
  media_type?: 'image' | 'video' | 'audio' | 'sticker' | 'gif';
  media_source: 'upload' | 'external';
  media_url?: string;
  sender?: number;
  reply_to?: {
    id: number | string;
    username: string;
    text?: string;
  } | null;
  
  reactions?: {
    emoji: string;
    count: number;
  }[];
  waveform?: number[];
  
  status?: 'sending' | 'sent' | 'pending' | 'delivered' | 'seen' | 'failed'
  seen_by?: number[];
  delivered_to?: number[];
};

type Props = {
  messages: Message[];
  currentUserId: number;

  onLoadMore?: () => void;
  hasMore?: boolean;

  resendMessage?: (msg: Message) => void;
  selectedMessages: Set<string | number>;
  toggleSelectMessage: (id: string | number) => void;
  clearSelection: () => void;

  onCancelReply?: () => void;
  
  onReaction?: (
    messageId: any,
    emoji: string
  ) => void;
  
  replyingTo?: any;
  onReply?: (msg: Message) => void;
  onOpenDrawer?: (
    mode: "plus" | "emoji"
  ) => void;
};

export default function MessageBubbles({
  messages,
  currentUserId,
  onLoadMore,
  hasMore,
  resendMessage,
  onReaction,
  onOpenDrawer,
  onReply,
  replyingTo,
  selectedMessages,
  toggleSelectMessage,
  clearSelection,
}: Props) {

  const containerRef =
    useRef<HTMLDivElement | null>(null);

  const bottomRef =
    useRef<HTMLDivElement | null>(null);
  const [activeReaction, setActiveReaction] = useState<string | null>(null);

  useEffect(() => {
    if (
      selectedMessages.size !== 1
    ) {
      setActiveReaction(null);
    }
  }, [selectedMessages]);

  // =========================
  // LOAD MORE
  // =========================

  useEffect(() => {
    const el = containerRef.current;

    if (!el || !onLoadMore) return;

    const handleScroll = () => {
      if (el.scrollTop < 50 && hasMore) {
        onLoadMore();
      }
    };

    el.addEventListener('scroll', handleScroll);

    return () =>
      el.removeEventListener(
        'scroll',
        handleScroll
      );

  }, [hasMore, onLoadMore]);
  
  const prevLengthRef = useRef(0);

  useEffect(() => {
    const el = containerRef.current;
  
    if (!el) return;
  
    const messageCount = messages.length;
    const prevCount = prevLengthRef.current;
  
    const isNearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < 150;
  
    // Only scroll when a new message is added
    if (messageCount > prevCount && isNearBottom) {
      el.scrollTop = el.scrollHeight;
    }
  
    prevLengthRef.current = messageCount;
  }, [messages]);
  useEffect(() => {
    const el = containerRef.current;
  
    if (!el) return;
  
    const messageCount = messages.length;
    const prevCount = prevLengthRef.current;
  
    const isNearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < 150;
  
    // Only scroll when a new message is added
    if (messageCount > prevCount && isNearBottom) {
      el.scrollTop = el.scrollHeight;
    }
  
    prevLengthRef.current = messageCount;
  }, [messages]);

  // =========================
  // GROUP BY DATE
  // =========================
  
  const grouped = useMemo(() => {

    return messages.reduce(
      (acc: any, msg) => {
  
        const date =
          formatMessageDate(msg.created_at);
  
        if (!acc[date]) {
          acc[date] = [];
        }
  
        acc[date].push(msg);
  
        return acc;
  
      },
      {}
    );
  
  }, [messages]);

  return (
    <div
      ref={containerRef}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          clearSelection();
        }
      }}
      className="flex flex-col h-full overflow-x-hidden overflow-y-auto py-3 px-2"
    >

      {Object.entries(grouped).map(
        ([date, msgs]: any) => (

          <div key={date} className="mb-4">

            {/* DATE */}
            <div className="flex justify-center mb-4">
              <span className="text-[11px] bg-gray-700 text-white px-3 py-1 rounded-full">
                {date}
              </span>
            </div>

            {/* MESSAGES */}
            {msgs.map(
              (
                msg: Message,
                index: number
              ) => {

                const isCurrentUser = msg.senderId === currentUserId;

                const prev =
                  msgs[index - 1];

                const sameUser =
                  prev?.sender === msg.sender;

                return (
                  <PrivateBubble
                    key={
                      msg.localId ||
                      msg.clientId ||
                      msg.id
                    }
                    msg={msg}
                    isCurrentUser={isCurrentUser}
                    sameUser={sameUser}
                    resendMessage={resendMessage}
                  
                    selectedMessages={selectedMessages}
                    toggleSelectMessage={toggleSelectMessage}
                    selectedMode={selectedMessages.size > 0}
                    onOpenDrawer={onOpenDrawer}
                    clearSelection={clearSelection}
                  
                    replyingTo={replyingTo}
                    setReplyingTo={onReply}
                    onReaction={onReaction}
                    activeReaction={activeReaction}
                    setActiveReaction={setActiveReaction}
                  />
                );
              }
            )}
          </div>
        )
      )}
    </div>
  );
}

function PrivateBubble({
  msg,
  isCurrentUser,
  sameUser,
  resendMessage,

  selectedMessages,
  toggleSelectMessage,
  clearSelection,

  setReplyingTo,
  onReaction, 
  onOpenDrawer,
  replyingTo,
  
  activeReaction,
  setActiveReaction,
}: any) {

  const [dragX, setDragX] =
    useState(0);

  const [dragging, setDragging] =
    useState(false);

  const startX = useRef(0);

  const id = String(msg.localId ?? msg.id);
  const isSelected = selectedMessages.has(id);
  const inSelectionMode = selectedMessages.size > 1;

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

  const mediaItems = useMemo(() => {
    if (Array.isArray(msg.media_url)) return msg.media_url;
    if (msg.media_url) return [msg.media_url];
    return [];
  }, [msg]);
  
  const mediaSrc = msg.media_url;
  
  const images =
    Array.isArray(msg.media_url)
      ? msg.media_url
      : mediaSrc
        ? [mediaSrc]
        : [];
  
  const showReactions = activeReaction === id;
  const isMine = (reaction: any) =>
  false; 
  
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

      onClick={(e) => {
        e.stopPropagation();
      
        if (selectedMessages.size > 0) {
          return toggleSelectMessage(id);
        }
      }}

      onPointerDown={(e) => {
        setDragging(true);
        startX.current = e.clientX;
      }}

      onPointerMove={(e) => {
        if (!dragging) return;
      
        const delta = e.clientX - startX.current;
      
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

        setDragging(false);

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

        const timer =
          setTimeout(() => {
            setActiveReaction(id);
            toggleSelectMessage(id);
          }, 500);

        (
          e.currentTarget as HTMLElement
        ).dataset.timer =
          String(timer);
      }}

      onTouchEnd={(e) => {

        clearTimeout(
          Number(
            (
              e.currentTarget as HTMLElement
            ).dataset.timer
          )
        );
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
            msg.media_type === "sticker"
              ? 'bg-transparent shadow-none'
              : isCurrentUser
                ? 'bg-gray-200 dark:bg-indigo-900 text-white rounded-br-md'
                : 'bg-gray-400 dark:bg-indigo-500/5 text-white rounded-bl-md'
          }
        `}
      >

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
              text-green-400 text-xs
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
            ↩
          </div>
        )}

        {/* REPLY PREVIEW */}
        {msg.reply_to && (
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

            <p className="text-xs font-semibold text-gray-700 dark:text-green-400">
              {msg.reply_to.username}
            </p>

            <p className="text-xs text-gray-700 line-clamp-2 break-words dark:text-gray-300 truncate">
              {msg.reply_to.text}
            </p>

          </div>
        )}

        {/* MEDIA RENDER */}
        {msg.media_url && (
          <>
            {/* STICKER */}
            {msg.media_type === "sticker" && (
              <img
                src={msg.media_url}
                className="w-28 h-28 object-contain drop-shadow-lg"
                draggable={false}
              />
            )}
        
            {/* GIF */}
            {msg.media_type === "gif" && (
              <img
                src={msg.media_url}
                className="rounded-2xl max-h-[300px] object-cover"
                loading="lazy"
              />
            )}
        
            {/* IMAGE (UPLOAD ONLY) */}
            {msg.media_type !== "sticker" &&
            images.length > 0 ? (
              <MediaGrid items={images} />
            ) : (
              msg.media_type === "image" &&  mediaSrc &&
              msg.media_source === "upload" && (
                <div className="relative mb-2">
                  <img
                    src={mediaSrc}
                    className="rounded-2xl max-h-[420px] object-cover"
                  />
        
                  {msg.status === "uploading" && (
                    <>
                      <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center">
                        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
        
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                        <div
                          className="h-full bg-green-400"
                          style={{ width: `${msg.uploadProgress || 0}%` }}
                        />
                      </div>
                    </>
                  )}
                </div>
              ))}
        
            {/* VIDEO (UPLOAD ONLY) */}
            {msg.media_type === "video" &&
              msg.media_source === "upload" && mediaItems.length > 0 && mediaSrc && (
                <div className="relative mb-2">
                  <video controls className="rounded-2xl max-h-[420px] bg-black">
                    <source src={mediaSrc} />
                  </video>
        
                  {msg.status === "uploading" && (
                    <>
                      <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center">
                        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    </>
                  )}
                </div>
              )}
          </>
        )}

        {/* AUDIO */}
        {msg.media_type ===
          'audio' && mediaSrc && (
            <AudioBubble
              url={mediaSrc}
              waveform={msg.waveform || []}
              isMe={isCurrentUser}
            />
        )}

        {/* TEXT */}
        {msg.is_deleted ? (
          <p className="text-xs italic text-gray-900 dark:text-gray-400">
            {msg.deleted_by_admin
              ? "This message was deleted by an admin"
              : "This message was deleted"}
          </p>
        ) : (
          msg.text && (
            <p className="text-sm whitespace-pre-wrap break-all text-gray-700 dark:text-white overflow-hidden break-words overflow-wrap-anywhere
            "
            style={{
              overflowWrap: "anywhere",
              wordBreak: "break-word",
            }}>
              {msg.text}
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

              <span className="text-indigo-600">
                {msg.status ===
                  'delivered' && '✓✓'}
  
                {msg.status ===
                  'seen' && '✓✓(seen)'}
              </span>
              {msg.status === "uploading" && "⏳"}

              {msg.status === 'failed' && !msg._optimistic && (
                  <button
                    onClick={() =>
                      resendMessage?.(msg)
                    }
                    className="text-red-300"
                  >
                    Retry
                  </button>
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

function AudioBubble({
  url,
  isMe,
  waveform,
}: {
  url: string;
  isMe: boolean;
  waveform: number[];
}) {

  const audioRef =
    useRef<HTMLAudioElement | null>(
      null
    );

  const [progress, setProgress] =
    useState(0);

  const [playing, setPlaying] =
    useState(false);

  const togglePlay = () => {

    if (!audioRef.current) return;

    if (
      audioRef.current.paused
    ) {

      audioRef.current.play();
      setPlaying(true);

    } else {

      audioRef.current.pause();
      setPlaying(false);

    }
  };

  const updateProgress = () => {

    if (!audioRef.current) return;

    const p =
      audioRef.current.currentTime /
      audioRef.current.duration;

    setProgress(
      isNaN(p) ? 0 : p
    );
  };

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-full mb-2 ${
        isMe
          ? 'bg-green-600'
          : 'bg-gray-700'
      }`}
    >

      <button
        onClick={togglePlay}
      >
        {playing
          ? '⏸'
          : '▶️'}
      </button>

      <AudioWaveform
        progress={progress}
      />

      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={
          updateProgress
        }
        onEnded={() =>
          setPlaying(false)
        }
      />

    </div>
  );
}

function formatMessageDate(dateStr?: string) {

  if (!dateStr) return 'Today';

  const date = new Date(dateStr);
  const now = new Date();

  // RESET TIMES
  const msgDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const diffDays =
    Math.round(
      (today.getTime() - msgDate.getTime()) /
      (1000 * 60 * 60 * 24)
    );

  if (diffDays === 0) {
    return 'Today';
  }

  if (diffDays === 1) {
    return 'Yesterday';
  }

  return date.toLocaleDateString(
    undefined,
    {
      day: '2-digit',
      month: 'short',
      year:
        date.getFullYear() !== now.getFullYear()
          ? 'numeric'
          : undefined,
    }
  );
}

function MediaGrid({ items }: { items: string[] }) {
  const [open, setOpen] = useState(false);

  const visible = items.slice(0, 4);
  const remaining = items.length - 4;

  return (
    <>
      <div className="grid grid-cols-2 gap-1 rounded-2xl overflow-hidden mb-2">
        {visible.map((url, index) => {
          const isLast = index === 3 && items.length > 4;

          return (
            <div
              key={index}
              className="relative cursor-pointer"
              onClick={() => setOpen(true)}
            >
              <img
                src={url}
                className="w-full h-32 object-cover"
              />

              {isLast && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xl font-bold">
                  +{remaining}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {open && (
        <div
          className="fixed inset-0 bg-black z-[999] flex items-center justify-center"
          onClick={() => setOpen(false)}
        >
          <div className="grid grid-cols-1 gap-2 p-4 max-h-screen overflow-y-auto">
            {items.map((url, i) => (
              <img
                key={i}
                src={url}
                className="w-full max-h-[80vh] object-contain"
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}