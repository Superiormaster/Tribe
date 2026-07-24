// hooks/inbox/useCommunityRecentChats.ts

'use client';

import { useCallback, useMemo, useState } from "react";
import { apiRequest } from "@/utils/api";
import { sortInbox } from "@/utils/inbox/sorting";

export type CommunityChat = {
  community_id: number;
  chat_id: number;

  community_name: string;
  community_cover?: string;

  username: string;
  avatar?: string;

  text: string;
  created_at: string;

  last_sender_id?: number;
  media_type?: string;

  unseen?: number;

  pinned?: boolean;
  pinned_at?: string | null;

  is_muted?: boolean;
  chat_type: "community";
};

export function useCommunityRecentChats() {
  const [recentChats, setRecentChats] =
    useState<CommunityChat[]>([]);

  const [loadingRecent, setLoadingRecent] =
    useState(false);

  const [recentLoaded, setRecentLoaded] =
    useState(false);

  const [nextPage, setNextPage] =
    useState<number | null>(1);

  const [pinnedCount, setPinnedCount] =
    useState(0);

  const fetchRecent = useCallback(
    async (page = 1) => {
      if (loadingRecent) return;

      try {
        setLoadingRecent(true);

        const res = await apiRequest(
          `api/chats/community-recent/?page=${page}`
        );
        console.log("community recent chat", res);

        const merged = res.results.map((chat: CommunityChat) => ({
          ...chat,
          chat_type: "community" as const,
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
          "Failed to fetch community chats",
          err
        );
      } finally {
        setRecentLoaded(true);
        setLoadingRecent(false);
      }
    },
    [loadingRecent]
  );

  const updateRecentChats = useCallback(
    (
      updater:
        | CommunityChat[]
        | ((
            prev: CommunityChat[]
          ) => CommunityChat[])
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

    nextPage,

    pinnedCount,
    setPinnedCount,

    backendChatIds,
  };
}