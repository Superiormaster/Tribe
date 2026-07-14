'use client';

import AppLink from '@/components/AppLink';
import {
  useState,
  useRef,
  useEffect
} from 'react';

import {
  Pin,
  Trash2,
  Shield,
  Crown,
  Heart,
  Reply,
  Forward,
  X,
} from 'lucide-react';

type Reaction = {
  emoji: string;

  count: number;

  users?: {
    id: number;
    username: string;
  }[];
};

type ReplyData = {
  id: number;
  username: string;
  text?: string;
};

type CommunityMessage = {
  id: number;

  text?: string;

  media_url?: string;
  media_type?: string;

  thumbnail?: string;

  created_at: string;

  sender: number;

  sender_username: string;
  sender_avatar?: string;

  sender_role?: 'member' | 'moderator' | 'admin' | 'owner';
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

  is_pinned?: boolean;

  deleted?: boolean;
  deleted_by_admin?: boolean;

  reactions?: Reaction[];

  reply_to?: ReplyData | null;
};

type Props = {
  messages: CommunityMessage[];

  currentUserId: number;

  onDelete?: (
    messageId: number,
    senderId: number,
    byAdmin?: boolean
  ) => void;

  onPin?: (messageId: number) => void;

  onReaction?: (
    messageId: number,
    emoji: string
  ) => void;

  onReply?: (
    message: CommunityMessage
  ) => void;

  isModerator?: boolean;
};

type MessageBubbleProps = {
  message: CommunityMessage;
  isOwn: boolean;
  sameUser: boolean;
  currentUserId: number;
  isSelected: boolean;
  setSelectedMessage: React.Dispatch<React.SetStateAction<number | null>>;
  onReply?: (message: CommunityMessage) => void;
  renderStatus: (status?: string) => React.ReactNode;
  onReaction?: (messageId: number, emoji: string) => void;
  isModerator: boolean;
  emojis: string[];
  formatTime: (timestamp: string) => string;
  getRoleBadge: (role?: string) => React.ReactNode;
};

export default function CommunityMessageBubbles({
  messages,
  currentUserId,
  onDelete,
  onPin,
  onReaction,
  onReply,
  isModerator = false,
}: Props) {

  const [selectedMessage, setSelectedMessage] =
    useState<number | null>(null);
  
  const emojis: string[] = [
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

  const formatTime = (
    timestamp: string
  ) => {
    return new Date(
      timestamp
    ).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  const applyFriction = (x: number) => {
    const abs = Math.abs(x);
  
    const friction = 0.35; // lower = more resistance
    const sign = x < 0 ? -1 : 1;
  
    return sign * (abs * friction);
  };

  const getDateLabel = (
    dateString: string
  ) => {
    const date = new Date(dateString);

    const today = new Date();

    const yesterday = new Date();
    yesterday.setDate(
      today.getDate() - 1
    );

    if (
      date.toDateString() ===
      today.toDateString()
    ) {
      return 'Today';
    }

    if (
      date.toDateString() ===
      yesterday.toDateString()
    ) {
      return 'Yesterday';
    }

    return date.toLocaleDateString(
      undefined,
      {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }
    );
  };

  const sortedMessages = [...messages].sort(
    (a, b) =>
      new Date(a.created_at).getTime() -
      new Date(b.created_at).getTime()
  );

  const groupedMessages =
    sortedMessages.reduce(
      (
        groups: Record<
          string,
          CommunityMessage[]
        >,
        msg
      ) => {

        const label =
          getDateLabel(
            msg.created_at
          );

        if (!groups[label]) {
          groups[label] = [];
        }

        groups[label].push(msg);

        return groups;
      },
      {}
    );
  
  const renderStatus = (status?: string) => {
    switch (status) {
      case 'sending':
        return '⏳';
  
      case 'sent':
        return '✓';
  
      case 'delivered':
        return '✓✓';
  
      case 'read':
        return '✓✓';
  
      case 'failed':
        return '⚠️';
  
      default:
        return null;
    }
  };

  const getRoleBadge = (
    role?: string
  ) => {
    switch (role) {

      case 'owner':
        return (
          <Crown
            size={12}
            className="text-yellow-500"
          />
        );

      case 'admin':
      case 'moderator':
        return (
          <Shield
            size={12}
            className="text-indigo-400"
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="relative flex flex-col pb-28">

      {/* TOP ACTION BAR */}
      {selectedMessage && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setSelectedMessage(null)}
          />
  
          <div className="fixed top-0 left-0 right-0 md:left-64 z-50 h-14 bg-[#202c33] flex items-center justify-between px-4">
  
            <div className="flex items-center gap-4">
              <button
                onClick={() =>
                  setSelectedMessage(null)
                }
              >
                <X size={22} />
              </button>
  
              <span className="font-semibold">
                {selectedMessage ? 1 : 0}
              </span>
            </div>
  
            <div className="flex items-center gap-5">
  
              <Reply size={20} />
  
              <Forward size={20} />
  
              <Trash2 size={20} />
  
              {isModerator && (
                <Pin size={20} />
              )}
  
            </div>
          </div>
         </>
      )}

      <div className="flex flex-col overflow-y-auto h-[calc(100vh-120px)] pb-28">
        {Object.entries(
          groupedMessages
        ).map(([date, msgs]) => (
  
          <div key={date}>
  
            {/* DATE */}
            <div className="flex justify-center my-3">
  
              <span className="text-xs bg-gray-700 text-white px-3 py-1 rounded-full">
                {date}
              </span>
  
            </div>
  
            {msgs.map((message, index) => {
              const previous = msgs[index - 1];
              const sameUser = previous?.sender === message.sender;
              const isOwn = message.sender === currentUserId;
              const isSelected = selectedMessage === message.id;
            
              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isOwn={isOwn}
                  renderStatus={renderStatus}
                  sameUser={sameUser}
                  currentUserId={currentUserId}
                  isSelected={isSelected}
                  setSelectedMessage={setSelectedMessage}
                  onReply={onReply}
                  getRoleBadge={getRoleBadge}
                  onReaction={onReaction}
                  isModerator={isModerator}
                  emojis={emojis}
                  formatTime={formatTime}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  isOwn,
  sameUser,
  currentUserId,
  isSelected,
  setSelectedMessage,
  onReply,
  renderStatus,
  onReaction,
  isModerator,
  getRoleBadge,
  emojis,
  formatTime,
}: MessageBubbleProps) {
  const [dragX, setDragX] = useState(0);
  
  const [dragging, setDragging] = useState(false);
  
  const startX = useRef(0);
  
  const MAX_DRAG = 120;
  
  const TRIGGER_POINT = 60;

  return (

    <div
      key={message.id}
      className={`
        relative px-2 py-[2px] flex
        ${
          isOwn
            ? 'justify-end'
            : 'justify-start'
        }
        ${
          isSelected
            ? 'bg-green-900/30'
            : ''
        }
      `}
      onPointerDown={(e) => {
        setDragging(true);
        startX.current = e.clientX;
      }}
      
      onPointerMove={(e) => {
        if (!dragging) return;
      
        const delta = startX.current - e.clientX;

        // only allow LEFT swipe for reply
        if (delta > 0) {
          const raw = Math.abs(delta);
      
          // apply resistance curve (elastic feel)
          const resisted = Math.min(
            MAX_DRAG,
            raw * 0.6 + Math.pow(raw, 0.7)
          );
      
          setDragX(resisted);
        }

        if (Math.abs(delta) > 8) {
          clearTimeout(
            Number(
              (
                e.currentTarget as HTMLElement
              ).dataset.timer
            )
          );
        }
      }}
      
      onPointerUp={() => {
        setDragging(false);
      
        // SNAP BEHAVIOR
        if (dragX > TRIGGER_POINT) {
          onReply?.(message);
        }
      
        // spring back animation
        requestAnimationFrame(() => {
          setDragX(0);
        });
      }}
  
      onPointerCancel={() => {
        setDragging(false);
        setDragX(0);
      }}

      onTouchStart={(e) => {
        const timer = setTimeout(() => {
          setSelectedMessage(message.id);
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

    {/* REACTION POPUP */}
    {isSelected && (
      <div className="absolute top-[60px] left-1/2 -translate-x-1/2 z-50">

        <div className="bg-[#202c33] rounded-full px-2 py-1 flex items-center gap-4 shadow-2xl border border-gray-700 overflow-x-auto max-w-[95vw]">

          {emojis.map(
            (emoji) => (
              <button
                key={emoji}
                onClick={() => {

                  onReaction?.(
                    message.id,
                    emoji
                  );
  
                  setSelectedMessage(
                    null
                  );
                }}
                className="text-[15px] active:scale-125 transition-transform"
              >
                {emoji}
              </button>
            )
          )}

          <button className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white text-2xl">
            +
          </button>

        </div>
      </div>
    )}

    <div
      className={`
        flex gap-2 w-full
        ${isOwn ? 'justify-end' : 'justify-start'}
      `}
    >

      {/* AVATAR */}
      {!isOwn && (
        <div className="w-8 shrink-0">

          {!sameUser && (

            <>
              {message.sender_avatar ? (

                <img
                  src={
                    message.sender_avatar
                  }
                  alt=""
                  className="w-8 h-8 rounded-full object-cover"
                />

              ) : (

                <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-xs text-white">
                  {message.sender_username
                  .slice(0, 2)
                  .toUpperCase()}
                </div>

              )}
            </>
          )}
        </div>
      )}

      {/* MESSAGE */}
      <div className="flex flex-col w-fit max-w-[78%] min-w-[80px]">

        {/* USERNAME */}
        {!sameUser &&
          !isOwn && (
            <div className="flex items-center gap-1 px-2 mb-1">

              <AppLink
                href={`/main/profile/${message.sender_username}`}
                prefetch={false}
                className="text-sm font-semibold text-green-500"
              >
                {
                  message.sender_username
                }
              </AppLink>

              {getRoleBadge(
                message.sender_role
              )}

              {message.is_pinned && (
                <Pin
                  size={12}
                  className="text-yellow-500"
                />
              )}
            </div>
          )}

          {/* BUBBLE */}
          <div
            id={`bubble-${message.id}`}
            style={{
              transform: isOwn
                ? `translateX(-${dragX}px)`
                : `translateX(${dragX}px)`,
              transition: dragging
                ? 'none'
                : 'transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}
            className={`
              relative px-3 py-2 rounded-2xl shadow-sm transition-all duration-200
              ${
                isOwn
                  ? 'bg-indigo-900 text-white rounded-br-md'
                  : 'bg-indigo-500/5 text-white rounded-bl-md'
              }
            `}
          >

            {dragX > 8 && (
              <div
                className={`
                  absolute top-1/2 -translate-y-1/2
                  ${isOwn ? '-left-5' : '-right-5'}
                  pointer-events-none
                  text-green-400 text-xs
                `}
                style={{
                  opacity: Math.min(1, dragX / TRIGGER_POINT),
            
                  transform: `
                    translateY(-50%)
                    translateX(${Math.min(10, dragX * 0.15)}px)
                    scale(${Math.min(1, 0.7 + dragX / 300)})
                  `,
            
                  transition: dragging
                    ? 'none'
                    : 'opacity 0.15s ease',
                }}
              >
                ↩
              </div>
            )}

            {/* REPLY */}
            {message.reply_to && (
              <div
                className={`
                  mb-2 px-3 py-2 rounded-lg border-l-4
                  ${
                    isOwn
                      ? 'bg-[#037561] border-green-300'
                      : 'bg-[#182229] border-green-500'
                  }
                `}
              >

              <p className="text-xs font-semibold text-green-400">
                {
                  message.reply_to
                  .username
                }
              </p>

              <p className="text-xs text-gray-300 truncate">
                {
                  message.reply_to
                  .text
                }
              </p>

            </div>
          )}

          {/* DELETED */}
          {message.deleted ? (

            <p className="italic text-sm opacity-70">
              {message.deleted_by_admin
                ? 'Deleted by administrator'
                : 'Deleted message'}
            </p>

          ) : (
            <>
              {/* TEXT */}
              {message.text && (
                <p className="text-sm whitespace-pre-wrap break-words">
                  {message.text}
                </p>
              )}

              {/* IMAGE */}
              {message.media_type ===
                'image' &&
                message.media_url && (
                  <img
                    src={
                      message.media_url
                    }
                    alt=""
                    className="mt-2 rounded-xl max-w-[260px]"
                  />
              )}

              {/* VIDEO */}
              {message.media_type ===
                'video' &&
                message.media_url && (
                  <video
                    src={
                      message.media_url
                    }
                    controls
                    className="mt-2 rounded-xl max-w-[260px]"
                  />
              )}

              {/* AUDIO */}
              {message.media_type ===
                'audio' &&
                message.media_url && (
                  <audio
                    src={
                      message.media_url
                    }
                    controls
                    className="mt-2 w-full"
                  />
              )}
            </>
          )}

          {/* TIME */}
          <div
            className={`
              text-[10px] mt-1 text-right
              ${
                isOwn
                  ? 'text-green-100'
                  : 'text-gray-400'
              }
            `}
          >
            {formatTime(
              message.created_at
            )}
          </div>
          <div className="flex items-center gap-1">
            <span
              className={`text-[10px] ${
                isOwn ? 'text-green-100' : 'text-gray-400'
              }`}
            >
              {formatTime(message.created_at)}
            </span>
          
            {isOwn && (
              <span className="text-[10px] opacity-80">
                {renderStatus(message.status)}
              </span>
            )}
          </div>
        </div>

        {/* REACTIONS */}
        {message.reactions &&
          message.reactions
          .length > 0 && (
            <div className="flex gap-2 mt-1 px-1 flex-wrap">

              {message.reactions.map(
                (
                  reaction,
                  idx
                ) => (
                  <button
                    key={idx}
                    onClick={() =>
                      onReaction?.(
                        message.id,
                        reaction.emoji
                      )
                    }
                    className="px-2 py-[3px] rounded-full bg-gray-700 text-xs flex items-center gap-1"
                  >
                    <span>
                      {
                        reaction.emoji
                      }
                    </span>

                    <span>
                      {
                        reaction.count
                      }
                    </span>
                  </button>
                )
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}