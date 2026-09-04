'use client';

import React, {
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from 'react';

import CommunityBubbles from '@/components/communityChat/CommunityBubbles';
import formatMessageDate from '@/components/chat/utils';
import {
  saveCommunityChatScroll, getCommunityChatScroll,
  saveCommunityRead, getCommunityRead,
} from "@/lib/communityMessageDB";
import { Message } from "@/utils/chat/messageContract"

type Props = {
  communityId: number;
  messages: Message[];
  currentUserId: number;

  loadMore?: () => void;
  loadNewer?: () => void;
  hasMore?: boolean;
  hasNewer?: boolean;
  onCloseReactionPicker: () => void;

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
  loadMessageWindow?: (
    messageId: number
  ) => Promise<void>;
  
  replyingTo?: any;
  onReply?: (msg: Message) => void;
  onOpenDrawer?: (
    mode: "plus" | "emoji"
  ) => void;
};

export type CommunityMessageBubblesHandle = {
  jumpToMessage: (messageId: number) => Promise<void>;
  closeReactionPicker: () => void;
};

const CommunityMessageBubbles = React.forwardRef<
  CommunityMessageBubblesHandle,
  Props
>(function CommunityMessageBubbles({
  communityId,
  messages,
  currentUserId,
  loadMore,
  loadNewer,
  hasMore,
  hasNewer,
  loadMessageWindow,
  onCloseReactionPicker,
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
}: Props,
  ref
) {

  const containerRef =
    useRef<HTMLDivElement | null>(null);

  const bottomRef =
    useRef<HTMLDivElement | null>(null);
  const [activeReaction, setActiveReaction] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasScrolledInitially = useRef(false);
  const jumpInProgressRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const loadingNewerRef = useRef(false);
  const lastMessageRef = useRef<string | number | null>(null);
  const lastUnreadMessageIdRef = useRef<Message["id"] | string | null>(null);
  const lastReadMessageKeyRef = useRef<string | number | null>(null);
  
  const [showScrollButton, setShowScrollButton] =
    useState(false);
  const [scrollReady, setScrollReady] = useState(false);
  const restoringScrollRef = useRef(true);
  const scrollReadyRef = useRef(false);
  const scrollRestoredRef = useRef(false);
  
  const [unreadCount, setUnreadCount] =
    useState(0);
  const mediaCounter = useRef(0);
  
  const getMessageKey = useCallback((msg: Message) => {
    return msg.client_id ?? msg.id;
  }, []);
  
  const closeReactionPicker = useCallback(() => {
    setActiveReaction(null);
    onCloseReactionPicker?.();
  }, [onCloseReactionPicker]);

  useEffect(() => {
    if (
      selectedMessages.size !== 1
    ) {
      setActiveReaction(null);
    }
  }, [selectedMessages]);
  
  // =========================
  // WAIT FOR MESSAGE
  // =========================

  const waitForMessageElement = useCallback(
    async (
      messageId: number,
      timeout = 5000
    ): Promise<HTMLElement | null> => {
      const start = Date.now();
  
      while (Date.now() - start < timeout) {
        const container = containerRef.current;
  
        if (!container) {
          return null;
        }
  
        const element = container.querySelector(
          `[data-message-id="${messageId}"]`
        ) as HTMLElement | null;
  
        if (element) {
          return element;
        }
  
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        });
      }
  
      return null;
    },
    []
  );
  
  const highlightMessage = useCallback(
    (messageId: number) => {
      const container = containerRef.current;
  
      if (!container) {
        return;
      }
  
      const element =
        container.querySelector(
          `[data-message-id="${messageId}"]`
        ) as HTMLElement | null;
  
      if (!element) {
        return;
      }
  
      const classes = [
        "ring-2",
        "ring-indigo-500",
        "bg-indigo-50",
        "dark:bg-indigo-950/40",
        "message-jump-highlight",
      ];
  
      // Remove previous highlights
      container
        .querySelectorAll(
          ".message-jump-highlight"
        )
        .forEach((el) => {
          el.classList.remove(...classes);
        });
  
      element.classList.add(...classes);
  
      window.setTimeout(() => {
        element.classList.remove(...classes);
      }, 2000);
    },
    []
  );
  
  const jumpToMessage = useCallback(
    async (messageId: number) => {
      if (jumpInProgressRef.current) {
        console.log(
          "[JUMP] Already in progress"
        );
        return;
      }
  
      if (!messageId) {
        console.warn(
          "[JUMP] Invalid message ID:",
          messageId
        );
        return;
      }
  
      const container =
        containerRef.current;
  
      if (!container) {
        console.warn(
          "[JUMP] Scroll container not available"
        );
        return;
      }
  
      jumpInProgressRef.current = true;
  
      try {
        console.log(
          "[JUMP] Starting:",
          messageId
        );
  
        let target =
          container.querySelector(
            `[data-message-id="${messageId}"]`
          ) as HTMLElement | null;
  
        if (target) {
          console.log(
            "[JUMP] Message already rendered:",
            messageId
          );
        }
  
        if (!target) {
          console.log(
            "[JUMP] Message not rendered."
          );
  
          if (!loadMessageWindow) {
            console.warn(
              "[JUMP] loadMessageWindow is unavailable."
            );
  
            return;
          }
  
          console.log(
            "[JUMP] Loading message window:",
            messageId
          );
  
          await loadMessageWindow(
            messageId
          );
  
          console.log(
            "[JUMP] Message window loaded. Waiting for render..."
          );
  
          target =
            await waitForMessageElement(
              messageId,
              5000
            );
        }
  
        if (!target) {
          console.warn(
            "[JUMP] Message could not be rendered:",
            messageId
          );
  
          return;
        }
  
        console.log(
          "[JUMP] Message rendered:",
          messageId
        );
  
        const containerRect =
          container.getBoundingClientRect();
  
        const targetRect =
          target.getBoundingClientRect();
  
        const targetCenter =
          targetRect.top +
          targetRect.height / 2;
  
        const containerCenter =
          containerRect.top +
          container.clientHeight / 2;
  
        const scrollOffset =
          targetCenter -
          containerCenter;
  
        container.scrollTo({
          top:
            container.scrollTop +
            scrollOffset,
          behavior: "smooth",
        });
  
        window.setTimeout(() => {
          highlightMessage(
            messageId
          );
        }, 400);
  
        console.log(
          "[JUMP] Completed:",
          messageId
        );
  
      } catch (error) {
        console.error(
          "[JUMP] Failed:",
          error
        );
      } finally {
        // Small cooldown prevents accidental double jumps
        window.setTimeout(() => {
          jumpInProgressRef.current =
            false;
        }, 450);
      }
    },
    [
      loadMessageWindow,
      waitForMessageElement,
      highlightMessage,
    ]
  );
  
  React.useImperativeHandle(
    ref,
    () => ({
      jumpToMessage,
      closeReactionPicker,
    }),
    [
      jumpToMessage,
      closeReactionPicker,
    ]
  );
  
  useEffect(() => {
    restoringScrollRef.current = true;
    scrollReadyRef.current = false;
  
    scrollRestoredRef.current = false;
    hasScrolledInitially.current = false;
    lastMessageRef.current = null;
  
    setScrollReady(false);
    setUnreadCount(0);
    setShowScrollButton(false);
  }, [communityId, currentUserId]);
  
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
  
    if (restoringScrollRef.current) {
      prevCountRef.current = messages.length;
      return;
    }
  
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
    const preloadImage = (url?: string | null) => {
      if (!url) return;
  
      const img = new Image();
      img.src = url;
    };
  
    const preloadVideo = (url?: string | null) => {
      if (!url) return;
  
      const video = document.createElement("video");
      video.preload = "metadata";
      video.src = url;
    };
  
    const preloadAudio = (url?: string | null) => {
      if (!url) return;
  
      const audio = new Audio();
      audio.preload = "metadata";
      audio.src = url;
    };
  
    messages.slice(-20).forEach((msg) => {
      const type = msg.media_type;
  
      if (!type) return;
  
      const urls = msg.media_url ?? [];
      const thumbnails = msg.thumbnail ?? [];
  
      switch (type) {
        case "image":
        case "gif":
        case "sticker":
          urls.forEach((url) => preloadImage(url));
  
          thumbnails.forEach((url) => {
            preloadImage(url);
          });
          break;
  
        case "video":
          urls.forEach((url) => preloadVideo(url));
  
          thumbnails.forEach((url) => {
            preloadImage(url);
          });
          break;
  
        case "audio":
          urls.forEach((url) => preloadAudio(url));
          break;
  
        case "gallery":
          urls.forEach((url) => preloadImage(url));
  
          thumbnails.forEach((url) => {
            preloadImage(url);
          });
          break;
  
        default:
          break;
      }
    });
  }, [messages]);
  
  useEffect(() => {
    const el = containerRef.current;
  
    if (!el) return;
  
    const save = () => {
      if (restoringScrollRef.current) {
        return;
      }
  
      const bubbles = Array.from(
        el.querySelectorAll("[data-message-id]")
      ) as HTMLElement[];
  
      const firstVisible = bubbles.find(
        bubble => bubble.offsetTop + bubble.offsetHeight > el.scrollTop
      );
  
      if (!firstVisible) return;
  
      saveCommunityChatScroll({
        communityId,
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
  }, [communityId, currentUserId]);
  
  const mediaPriorityIds = useMemo(() => {
    const ids = new Set<string | number>();
    let count = 0;
  
    for (const msg of messages) {
      const isMedia = [
        "image",
        "video",
        "gif",
        "sticker",
        "gallery",
      ].includes(msg.media_type ?? "");
  
      if (!isMedia) continue;
  
      if (count < 10) {
        const messageId = msg.client_id ?? msg.id;
      
        if (messageId !== undefined && messageId !== null) {
          ids.add(messageId);
          count++;
        }
      }
    }
  
    return ids;
  }, [messages]);
  
  useEffect(() => {
    if (!messages.length) return;
  
    let cancelled = false;
  
    const restoreScroll = async () => {
      const el = containerRef.current;
  
      if (!el) return;
  
      restoringScrollRef.current = true;
      scrollReadyRef.current = false;
      scrollRestoredRef.current = false;
  
      setScrollReady(false);
      setUnreadCount(0);
      setShowScrollButton(false);
  
      try {
        const saved = await getCommunityChatScroll(
          communityId,
          currentUserId
        );
  
        const savedRead = await getCommunityRead(
          communityId,
          currentUserId
        );
        
        if (cancelled) return;
        
        if (savedRead) {
          lastReadMessageKeyRef.current =
            savedRead.clientId ??
            savedRead.messageId ??
            null;
        }
  
        // Wait until the message DOM has actually been painted.
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              resolve();
            });
          });
        });
  
        if (cancelled) return;
  
        const container = containerRef.current;
  
        if (!container) return;
  
        let target: HTMLElement | null = null;
  
        if (saved) {
          target = container.querySelector(
            `[data-message-id="${saved.messageId}"]`
          ) as HTMLElement | null;
  
          if (!target && saved.clientId) {
            target = container.querySelector(
              `[data-client-id="${saved.clientId}"]`
            ) as HTMLElement | null;
          }
        }
  
        if (target && saved) {
          container.scrollTop =
            target.offsetTop +
            (saved.offset ?? 0);
        } else {
          container.scrollTop =
            container.scrollHeight;
        }
  
        requestAnimationFrame(() => {
          if (cancelled) return;
  
          const last =
            messages[messages.length - 1];
  
          lastMessageRef.current =
            last.client_id ?? last.id;
  
          hasScrolledInitially.current = true;
          scrollRestoredRef.current = true;
  
          restoringScrollRef.current = false;
          scrollReadyRef.current = true;
  
          setUnreadCount(0);
          setShowScrollButton(false);
          setScrollReady(true);
        });
  
      } catch (error) {
        console.error(
          "[COMMUNITY SCROLL RESTORE] Failed:",
          error
        );
  
        if (cancelled) return;
  
        const container = containerRef.current;
  
        if (!container) return;
  
        container.scrollTop =
          container.scrollHeight;
  
        requestAnimationFrame(() => {
          if (cancelled) return;
  
          const last =
            messages[messages.length - 1];
  
          lastMessageRef.current =
            last.client_id ?? last.id;
  
          hasScrolledInitially.current = true;
          scrollRestoredRef.current = true;
  
          restoringScrollRef.current = false;
          scrollReadyRef.current = true;
  
          setUnreadCount(0);
          setShowScrollButton(false);
          setScrollReady(true);
        });
      }
    };
  
    restoreScroll();
  
    return () => {
      cancelled = true;
    };
  
  }, [communityId, currentUserId, messages.length]);
  
  const markVisibleMessagesAsRead = useCallback(() => {
    const el = containerRef.current;
  
    if (!el || restoringScrollRef.current) {
      return;
    }
  
    const bubbles = Array.from(
      el.querySelectorAll("[data-message-id]")
    ) as HTMLElement[];
  
    if (!bubbles.length) {
      return;
    }
  
    const containerRect =
      el.getBoundingClientRect();
  
    let lastVisible: HTMLElement | null = null;
  
    for (const bubble of bubbles) {
      const rect = bubble.getBoundingClientRect();
  
      const visible =
        rect.bottom > containerRect.top &&
        rect.top < containerRect.bottom;
  
      if (visible) {
        lastVisible = bubble;
      }
    }
  
    if (!lastVisible) {
      return;
    }
  
    const messageId =
      lastVisible.dataset.messageId;
  
    const clientId =
      lastVisible.dataset.clientId;
  
    if (!messageId && !clientId) {
      return;
    }
  
    lastReadMessageKeyRef.current =
      clientId ?? messageId ?? null;
  
    saveCommunityRead({
      communityId,
      userId: currentUserId,
      messageId,
      clientId,
    }).catch(error => {
      console.error(
        "[CHAT READ] Failed to save:",
        error
      );
    });
  }, [communityId, currentUserId]);
  
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

      markVisibleMessagesAsRead();
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
  }, [markVisibleMessagesAsRead]);
  
  useEffect(() => {
    if (!messages.length) return;
  
    if (
      !scrollRestoredRef.current ||
      restoringScrollRef.current
    ) {
      return;
    }
  
    const readKey =
      lastReadMessageKeyRef.current;
  
    const el = containerRef.current;
  
    if (!el) return;
  
    if (!readKey) {
      return;
    }
  
    const readIndex = messages.findIndex(
      msg =>
        String(getMessageKey(msg)) ===
        String(readKey)
    );
  
    if (readIndex === -1) {
      return;
    }
  
    const unreadMessages =
      messages
        .slice(readIndex + 1)
        .filter(msg =>
          String(msg.sender) !==
          String(currentUserId)
        );
  
    const distanceFromBottom =
      el.scrollHeight -
      el.scrollTop -
      el.clientHeight;
  
    const atBottom =
      distanceFromBottom < 100;
  
    if (atBottom) {
      setUnreadCount(0);
      setShowScrollButton(false);
      return;
    }
  
    setUnreadCount(
      unreadMessages.length
    );
  
    setShowScrollButton(
      unreadMessages.length > 0 ||
      distanceFromBottom >= 100
    );
  
  }, [
    messages,
    currentUserId,
    getMessageKey,
  ]);
  
  const scrollToBottom = () => {
    const el = containerRef.current;
  
    if (!el) return;
  
    el.scrollTo({
      top: el.scrollHeight,
      behavior: "smooth",
    });
  
    setUnreadCount(0);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        markVisibleMessagesAsRead();
      });
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
      style={{
        visibility: scrollReady ? "visible" : "hidden",
      }}
      className="flex flex-col h-full overflow-x-hidden overflow-y-auto py-3 px-2"
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
                  !!prev &&
                  String(prev.sender) === String(msg.sender);
                  const messageKey = msg.client_id || msg.id;

                const isMedia = [
                  "image",
                  "video",
                  "gif",
                  "sticker",
                  "gallery",
                ].includes(msg.media_type ?? "");
                
                const priority =
                  isMedia &&
                  messageKey != null &&
                  mediaPriorityIds.has(messageKey);

                return (
                  <CommunityBubbles
                    key={
                      msg.client_id ||
                      msg.id
                    }
                    msg={msg}
                    closeReactionPicker={closeReactionPicker}
                    isCurrentUser={isCurrentUser}
                    currentUserId={currentUserId}
                    sameUser={sameUser}
                    priority={priority}
                    resendPendingMessage={resendPendingMessage}
                    jumpToMessage={jumpToMessage}
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
          onClick={scrollToBottom}
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
});

export default CommunityMessageBubbles;