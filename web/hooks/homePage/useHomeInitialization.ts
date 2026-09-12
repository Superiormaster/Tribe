'use client';

import { useEffect, useState } from "react";

import {
  getFeed,
  getReels,
} from "@/lib/feedDb";

import { useNetwork } from "@/components/networkConnection/NetworkContext";

interface UseHomeInitializationProps {
  filter: "all" | "tribes";
  selectedTribe: number | null;

  setPosts: React.Dispatch<
    React.SetStateAction<any[]>
  >;

  setReels: React.Dispatch<
    React.SetStateAction<any[]>
  >;

  setLoading: React.Dispatch<
    React.SetStateAction<boolean>
  >;

  protectedPostIdsRef:
    React.MutableRefObject<Set<number>>;

  setInitialLoad: React.Dispatch<
    React.SetStateAction<boolean>
  >;

  hasCacheRef:
    React.MutableRefObject<boolean>;

  fetchPosts: (
    page?: number,
    replace?: boolean,
    showSkeleton?: boolean,
    filter?: "all" | "tribes",
    tribe?: number | null
  ) => Promise<void>;

  fetchReels: () => Promise<void>;
}

export function useHomeInitialization({
  filter,
  selectedTribe,
  setPosts,
  setReels,
  setLoading,
  setInitialLoad,
  hasCacheRef,
  fetchPosts,
  fetchReels,
  protectedPostIdsRef,
}: UseHomeInitializationProps) {

  const { isOnline } = useNetwork();

  const [cacheReady, setCacheReady] =
    useState(false);

  useEffect(() => {
    let cancelled = false;

    setCacheReady(false);

    const initialize = async () => {
      try {
        console.log(
          "🏠 [HOME INIT] Loading cached feed..."
        );

        const [
          cachedPosts,
          cachedReels,
        ] = await Promise.all([
          getFeed(
            filter,
            selectedTribe,
            1
          ),

          getReels(
            filter,
            selectedTribe
          ),
        ]);

        if (cancelled) return;

        const hasCachedPosts =
          cachedPosts.length > 0;

        const hasCachedReels =
          cachedReels.length > 0;

        console.log(
          "🏠 [HOME INIT] Cache result:",
          {
            posts: cachedPosts.length,
            reels: cachedReels.length,
            hasCachedPosts,
            hasCachedReels,
          }
        );

        hasCacheRef.current =
          hasCachedPosts;

        if (hasCachedPosts) {
          cachedPosts.forEach(
            (post: any) => {
              if (
                post?._local_created
              ) {
                const id =
                  Number(post.id);

                if (id) {
                  protectedPostIdsRef.current.add(
                    id
                  );
                }
              }
            }
          );

          setPosts(cachedPosts);

          setInitialLoad(false);
          setLoading(false);
        }

        if (hasCachedReels) {
          setReels(cachedReels);
        }

        setCacheReady(true);

        if (hasCachedPosts) {
          console.log(
            "🏠 [HOME INIT] Cache exists — skipping feed API fetch."
          );

          return;
        }

        if (!isOnline) {
          console.log(
            "🏠 [HOME INIT] No cache + offline."
          );

          setInitialLoad(false);
          setLoading(false);

          return;
        }

        console.log(
          "🏠 [HOME INIT] No cached posts — fetching feed."
        );

        setInitialLoad(true);
        setLoading(true);

        await fetchPosts(
          1,
          true,
          true,
          filter,
          selectedTribe
        );

        if (
          cancelled
        ) {
          return;
        }

        if (
          filter === "all" &&
          !hasCachedReels &&
          isOnline
        ) {
          await fetchReels();
        }

      } catch (err) {
        if (cancelled) return;

        console.error(
          "❌ Home initialization failed:",
          err
        );

        setCacheReady(true);
        setInitialLoad(false);
        setLoading(false);

        if (!hasCacheRef.current) {
          window.dispatchEvent(
            new CustomEvent(
              "network-error"
            )
          );
        }
      }
    };

    initialize();

    return () => {
      cancelled = true;
    };
  }, [
    filter,
    selectedTribe,
    fetchPosts,
    fetchReels,
    isOnline,
    setPosts,
    setReels,
    setLoading,
    setInitialLoad,
    hasCacheRef,
    protectedPostIdsRef,
  ]);

  return {
    cacheReady,
  };
}