// hooks/inbox/useRecentChats.ts

'use client';

import { useCallback, useMemo, useState } from "react";
import { apiRequest } from "@/utils/api";
import { sortInbox } from "@/utils/inbox/sorting";
import type{ Message } from "@/utils/chat/messageContract";

export type ChatStatus =
  | "sending"
  | "pending"
  | "sent"
  | "delivered"
  | "seen";

export type Chat = {
  id: number;
  username: string;
  avatar?: string;
  text: string;
  encrypted_text: string;
  created_at: string;
  fromUserId: number;
  toUserId: number;
  last_sender_id?: number;
  last_message_type?:
    | "text"
    | "image"
    | "video"
    | "audio"
    | "sticker"
    | "gif";
  chat_id: number;
  chat_type: "private";
  unseen?: number;
  last_media_type?: string;
  pinned?: boolean;
  pinned_at?: string | null;
  status?: ChatStatus;
};

export interface PendingMessage {
  id?: number;
  chat?: number;
  chatId?: number;
  username?: string;
  avatar?: string;
  text?: string;
  encrypted_text?: string;
  caption?: string;
  created_at: string;
  sender?: number;
  media_type?: string;
  status?: ChatStatus;
  reply_to?: Message|null
}

interface UseRecentChatsProps {
  pendingMap: Record<number, PendingMessage>;
}

export function useRecentChats({
  pendingMap,
}: UseRecentChatsProps) {
  const [recentChats, setRecentChats] = useState<Chat[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [recentLoaded, setRecentLoaded] = useState(false);
  const [nextPage, setNextPage] =
    useState<number | null>(1);
  const [initialFetchDone, setInitialFetchDone] = useState(false);

  const [pinnedCount, setPinnedCount] =
    useState(0);

  const mergePendingChats = useCallback(
    (serverChats: Chat[]) => {
      return serverChats;
    },
    []
  );

  const fetchRecent = useCallback(
    async (page = 1) => {
      if (loadingRecent) return;

      try {
        setLoadingRecent(true);

        const res = await apiRequest(
          `api/chats/recent/?page=${page}`
        );
        console.log("private recent chat", res);

        const merged = mergePendingChats(res.results).map(chat => ({
          ...chat,
          chat_type: "private",
        }));

        const sorted = sortInbox(merged);

        setRecentChats((prev: any) => {
          const merged =
              page === 1
                  ? sorted
                  : [...prev, ...sorted];
      
          return sortInbox(merged);
        });

        setPinnedCount(
          sorted.filter(c => c.pinned).length
        );

        setNextPage(res.next_page);
      } catch (err) {
        console.error(
          "Failed to fetch recent chats",
          err
        );
      } finally {
        setRecentLoaded(true);
        setLoadingRecent(false);
        setInitialFetchDone(true);
      }
    },
    [
      loadingRecent,
      mergePendingChats,
    ]
  );

  const updateRecentChats = useCallback(
    (
      updater:
        | Chat[]
        | ((prev: Chat[]) => Chat[])
    ) => {
      setRecentChats(prev => {
        const next =
          typeof updater === "function"
            ? updater(prev)
            : updater;

        const sorted = sortInbox(next);

        setPinnedCount(
          sorted.filter(c => c.pinned).length
        );

        return sorted;
      });
    },
    []
  );

  const backendChatIds = useMemo(
    () =>
      new Set(
        recentChats.map(c => c.chat_id)
      ),
    [recentChats]
  );

  return {
    recentChats,
    setRecentChats: updateRecentChats,

    fetchRecent,

    loadingRecent,
    recentLoaded,
    initialFetchDone,

    nextPage,

    pinnedCount,
    setPinnedCount,

    backendChatIds,
  };
}