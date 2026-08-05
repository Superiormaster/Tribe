'use client';

import React, {
  useRef,
  useState,
  useEffect,
  useMemo,
} from 'react';

import PrivateBubble from '@/components/chat/PrivateBubble';
import formatMessageDate from '@/components/chat/utils';
import {
  saveChatScroll, getChatScroll,
} from "@/lib/messageDB";
import { Message } from "@/utils/chat/messageContract";

type Props = {
  chatId: number;
  messages: Message[];
  currentUserId: number;

  loadMore?: () => void;
  loadNewer?: () => void;
  hasMore?: boolean;
  hasNewer?: boolean;

  resendPendingMessage?: (msg: Message) => void;
  retryFailedMessage?: (msg: Message) => void;
  resendMedia: (message: any) => void;
  selectedMessages: Set<string | number>;
  toggleSelectMessage: (id: string | number) => void;
  clearSelection: () => void;
  
  previewState: {
    files: any[];
    index: number;
    msg: any;
    isMine: boolean;
    onReply?: (msg: Message) => void;
  } | null;
  
  setPreviewState: React.Dispatch<
    React.SetStateAction<{
      files: any[];
      index: number;
      msg: any;
      isMine: boolean;
      onReply?: (msg: Message) => void;
    } | null>
  >;

  onCancelReply?: () => void;
  onForward: (messages: Message[]) => void;
  
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
  chatId,
  messages,
  currentUserId,
  loadMore,
  loadNewer,
  hasMore,
  hasNewer,
  resendPendingMessage,
  retryFailedMessage,
  resendMedia,
  onReaction,
  onOpenDrawer,
  onReply,
  onForward,
  replyingTo,
  selectedMessages,
  previewState,
  setPreviewState,
  toggleSelectMessage,
  clearSelection,
}: Props) {

  const containerRef =
    useRef<HTMLDivElement | null>(null);

  const bottomRef =
    useRef<HTMLDivElement | null>(null);
  const [activeReaction, setActiveReaction] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasScrolledInitially = useRef(false);
  const loadingMoreRef = useRef(false);
  const loadingNewerRef = useRef(false);
  const lastMessageRef = useRef<Message["id"] | null>(null);
  
  const [showScrollButton, setShowScrollButton] =
    useState(false);
  
  const [unreadCount, setUnreadCount] =
    useState(0);
  const mediaCounter = { value: 0 };

  useEffect(() => {
    if (
      selectedMessages.size !== 1
    ) {
      setActiveReaction(null);
    }
  }, [selectedMessages]);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (!(entry.target instanceof HTMLElement)) return;
  
          const type = entry.target.dataset.type;
          const src = entry.target.dataset.media;
  
          if (!src) return;
  
          switch (type) {
            case "image":
            case "gif":
            case "sticker": {
              const img = new Image();
              img.src = src;
              break;
            }
  
            case "video": {
              const video = document.createElement("video");
              video.preload = "metadata";
              video.src = src;
              break;
            }
  
            case "audio": {
              const audio = new Audio();
              audio.preload = "metadata";
              audio.src = src;
              break;
            }
          }
  
          observer.unobserve(entry.target);
        });
      },
      {
        root: containerRef.current,
        rootMargin: "1000px",
        threshold: 0,
      }
    );
  
    const elements = containerRef.current?.querySelectorAll("[data-media]");
  
    elements?.forEach(el => observer.observe(el));
  
    return () => observer.disconnect();
  }, [messages]);

  // =========================
  // LOAD MORE
  // =========================

  useEffect(() => {
    const el = containerRef.current;
  
    if (!el) return;
  
    const handleScroll = async () => {
      // -----------------------
      // Load older messages
      // -----------------------
      if (
        loadMore &&
        hasMore &&
        !loadingMoreRef.current &&
        el.scrollTop < 300
      ) {
        loadingMoreRef.current = true;
  
        const oldHeight = el.scrollHeight;
  
        await loadMore();
  
        requestAnimationFrame(() => {
          const newHeight = el.scrollHeight;
  
          el.scrollTop += newHeight - oldHeight;
  
          loadingMoreRef.current = false;
        });
  
        return;
      }
  
      // -----------------------
      // Load newer messages
      // -----------------------
      const distanceFromBottom =
        el.scrollHeight -
        el.scrollTop -
        el.clientHeight;
  
      if (
        loadNewer &&
        hasNewer &&
        !loadingNewerRef.current &&
        distanceFromBottom < 300
      ) {
        loadingNewerRef.current = true;
  
        const oldTop = el.scrollTop;
  
        await loadNewer();
  
        requestAnimationFrame(() => {
          el.scrollTop = oldTop;
          loadingNewerRef.current = false;
        });
      }
    };
  
    el.addEventListener("scroll", handleScroll);
  
    return () => {
      el.removeEventListener(
        "scroll",
        handleScroll
      );
    };
  }, [
    loadMore,
    loadNewer,
    hasMore,
    hasNewer,
  ]);
  
  const prevCountRef = useRef(0);

  useEffect(() => {
    const el = containerRef.current;
  
    if (!el) return;
  
    const isNearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < 150;
  
    if (
      messages.length > prevCountRef.current &&
      isNearBottom
    ) {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: "smooth",
      });
    }
  
    prevCountRef.current = messages.length;
  }, [messages]);
  
  useEffect(() => {
    if (
      messages.length > 0 &&
      !hasScrolledInitially.current
    ) {
      const el = containerRef.current;
  
      if (!el) return;
  
      el.scrollTop = el.scrollHeight;
      hasScrolledInitially.current = true;
    }
  }, [messages.length]);
  
  useEffect(() => {
    const preload = (url: string | null | undefined) => {
      if (!url) return;
    
      const img = new Image();
      img.src = url;
    };
    
    messages.slice(-20).forEach(msg => {
      if (msg.media_type === "image") {
        msg.media_url?.forEach(preload);
      }
    
      msg.thumbnail?.forEach(preload);
    });
  }, [messages]);
  
  useEffect(() => {
    const el = containerRef.current;
  
    if (!el) return;
  
    const save = () => {
      const bubbles = Array.from(
        el.querySelectorAll("[data-message-id]")
      ) as HTMLElement[];
  
      const firstVisible = bubbles.find(
        bubble => bubble.offsetTop + bubble.offsetHeight > el.scrollTop
      );
  
      if (!firstVisible) return;
  
      saveChatScroll({
        chatId,
        userId: currentUserId,
        messageId: firstVisible.dataset.messageId,
        clientId: firstVisible.dataset.clientId,
        offset: el.scrollTop - firstVisible.offsetTop,
      });
    };
  
    el.addEventListener("scroll", save);
  
    return () => {
      el.removeEventListener("scroll", save);
    };
  }, [chatId, currentUserId]);
  
  useEffect(() => {
    if (!messages.length) return;
  
    const restore = async () => {
      const el = containerRef.current;
  
      if (!el) return;
  
      const saved = await getChatScroll(
        chatId,
        currentUserId
      );
  
      if (!saved) return;
  
      requestAnimationFrame(() => {
        let target =
          containerRef.current?.querySelector(
            `[data-message-id="${saved.messageId}"]`
          ) as HTMLElement | null;
      
        if (!target && saved.clientId) {
          target =
            containerRef.current?.querySelector(
              `[data-client-id="${saved.clientId}"]`
            ) as HTMLElement | null;
        }
      
        // Message no longer exists in current window
        if (!target) {
          el.scrollTop = el.scrollHeight;
          return;
        }
      
        el.scrollTop = target.offsetTop + (saved.offset ?? 0);
      });
    };
  
    restore();
  }, [chatId, currentUserId, messages.length]);
  
  useEffect(() => {
    const el = containerRef.current;
  
    if (!el) return;
  
    const onScroll = () => {
      const distance =
        el.scrollHeight -
        el.scrollTop -
        el.clientHeight;
  
      const atBottom =
        distance < 100;
  
      setShowScrollButton(
        !atBottom
      );
  
      if (atBottom) {
        setUnreadCount(0);
      }
    };
  
    el.addEventListener(
      "scroll",
      onScroll
    );
  
    return () =>
      el.removeEventListener(
        "scroll",
        onScroll
      );
  }, []);
  
  useEffect(() => {
    if (!messages.length) return;
  
    const last = messages[messages.length - 1];
  
    if (lastMessageRef.current === last.id) {
      return;
    }
  
    lastMessageRef.current = last.id;
  
    const el = containerRef.current;
  
    if (!el) return;
  
    const atBottom =
      el.scrollHeight -
        el.scrollTop -
        el.clientHeight <
      100;
  
    const isIncoming =
      last.sender !== currentUserId;
  
    if (atBottom) {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    } else if (isIncoming) {
      setUnreadCount(c => c + 1);
      setShowScrollButton(true);
    }
  }, [messages, currentUserId]);
  
  const scrollToBottom = () => {
    const el = containerRef.current;
  
    if (!el) return;
  
    el.scrollTo({
      top: el.scrollHeight,
      behavior: "smooth",
    });
  };
  
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
      className="flex flex-col h-full overflow-x-hidden overflow-y-auto py-5 px-2"
    >

      {Object.entries(grouped).map(
        ([date, msgs]: any) => (

          <div key={date} className="mb-4 mt-12">

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

                const isCurrentUser = msg.sender === currentUserId;

                const prev =
                  msgs[index - 1];

                const sameUser =
                  prev?.sender === msg.sender;
                const isMedia =
                  [
                    "image",
                    "video",
                    "gif",
                    "sticker",
                    "gallery",
                  ].includes(msg.media_type ?? "");
                
                let priority = false;
                
                if (isMedia) {
                  priority = mediaCounter.value < 10;
                  mediaCounter.value++;
                }

                return (
                  <PrivateBubble
                    key={
                      msg.client_id ||
                      msg.id
                    }
                    msg={msg}
                    isCurrentUser={isCurrentUser}
                    sameUser={sameUser}
                    priority={priority}
                    resendPendingMessage={resendPendingMessage}
                    retryFailedMessage={retryFailedMessage}
                    resendMedia={resendMedia}
                    onForward={onForward}
                  
                    selectedMessages={selectedMessages}
                    toggleSelectMessage={toggleSelectMessage}
                    selectedMode={selectedMessages.size > 0}
                    previewState={previewState}
                    setPreviewState={setPreviewState}
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

      {showScrollButton && (
        <button
          onClick={() => {
            scrollToBottom();
            setUnreadCount(0);
          }}
          className="fixed bottom-24 right-4 z-50 w-12 h-12 rounded-full border bg-gray-300 dark:bg-gray-900 text-gray-800 dark:text-white shadow-lg"
        >
          ↓
      
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-[11px] flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}