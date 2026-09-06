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
  const hasReconnected =
    useRef(false);

  useEffect(() => {
    if (
      !isOnline ||
      !reconnecting
    ) {
      return;
    }

    if (
      hasReconnected.current
    ) {
      return;
    }

    hasReconnected.current =
      true;

    let cancelled = false;

    const reconnectFeed =
      async () => {
        try {
          setRefreshingFeed(
            true
          );

          await fetchPosts(
            1,
            true,
            false,
            filter,
            selectedTribe
          );

          /**
           * React Native does not use navigator.onLine.
           * isOnline from NetworkContext is the source of truth.
           */
          if (
            cancelled ||
            !isOnline
          ) {
            return;
          }

          if (
            filter === "all"
          ) {
            await fetchReels();
          }

          if (!cancelled) {
            finishReconnect();
          }
        } catch (err) {
          console.error(
            "Failed to reconnect feed:",
            err
          );
        } finally {
          if (!cancelled) {
            setRefreshingFeed(
              false
            );
          }
        }
      };

    void reconnectFeed();

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
    if (
      !reconnecting
    ) {
      hasReconnected.current =
        false;
    }
  }, [reconnecting]);
}