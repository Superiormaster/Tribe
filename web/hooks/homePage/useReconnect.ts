'use client';

import { useEffect, useRef } from "react";

interface UseReconnectProps {
  isOnline: boolean;
  reconnecting: boolean;
  finishReconnect: () => void;

  filter: "all" | "tribes";
  selectedTribe: number | null;

  fetchPosts: (
    page?: number,
    replace?: boolean,
    showSkeleton?: boolean,
    filter?: "all" | "tribes",
    tribe?: number | null
  ) => Promise<void>;

  fetchReels: () => Promise<void>;

  setRefreshingFeed: (
    value: boolean
  ) => void;
}

export function useReconnect({
  isOnline,
  reconnecting,
  finishReconnect,
  filter,
  selectedTribe,
  fetchPosts,
  fetchReels,
  setRefreshingFeed,
}: UseReconnectProps) {

  const hasReconnected = useRef(false);

  useEffect(() => {
    if (!isOnline || !reconnecting) return;

    if (hasReconnected.current) return;

    hasReconnected.current = true;

    let cancelled = false;

    const reconnectFeed = async () => {
      try {
        setRefreshingFeed(true);

        await fetchPosts(
          1,
          true,
          false,
          filter,
          selectedTribe
        );

        if (cancelled || !navigator.onLine) return;

        if (filter === "all") {
          await fetchReels();
        }

        finishReconnect();
      } finally {
        if (!cancelled) {
          setRefreshingFeed(false);
        }
      }
    };

    reconnectFeed();

    return () => {
      cancelled = true;
    };
  }, [
    isOnline,
    reconnecting,
    filter,
    selectedTribe,
    fetchPosts,
    fetchReels,
    finishReconnect,
    setRefreshingFeed,
  ]);

  useEffect(() => {
    if (!reconnecting) {
      hasReconnected.current = false;
    }
  }, [reconnecting]);
}