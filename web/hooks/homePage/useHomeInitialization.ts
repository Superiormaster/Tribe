"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  getFeed,
  getReels,
} from "@/lib/feedDb";

import { useNetwork } from "@/components/networkConnection/NetworkContext";

interface UseHomeInitializationProps {
  filter: "all" | "tribes";
  selectedTribe: number | null;

  initializedFeedsRef:
    React.MutableRefObject<Set<string>>;

  resetFeedState: () => void;

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
  initializedFeedsRef,
  resetFeedState,
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

    const feedKey =
      `${filter}:${selectedTribe ?? "all"}`;

    const alreadyInitialized =
      initializedFeedsRef.current.has(
        feedKey
      );

    const initialize = async () => {
      try {
        console.log(
          "🏠 [HOME INIT]",
          {
            feedKey,
            alreadyInitialized,
            isOnline,
          }
        );

        resetFeedState();

        setPosts([]);
        setReels([]);

        hasCacheRef.current = false;

        setCacheReady(false);
        setInitialLoad(true);
        setLoading(true);

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
          "🏠 [HOME INIT] Loaded cache",
          {
            feedKey,
            posts:
              cachedPosts.length,
            reels:
              cachedReels.length,
          }
        );

        hasCacheRef.current =
          hasCachedPosts;

        /*
         * Restore local protected posts.
         */
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

        if (hasCachedPosts) {
          setPosts(cachedPosts);
        }

        if (hasCachedReels) {
          setReels(cachedReels);
        }

        setCacheReady(true);

        if (!isOnline) {
          console.log(
            "🏠 [HOME INIT] Offline — cache only:",
            feedKey
          );

          setInitialLoad(false);
          setLoading(false);

          initializedFeedsRef.current.add(
            feedKey
          );

          return;
        }

        if (!alreadyInitialized) {
          console.log(
            "🏠 [HOME INIT] First network sync:",
            feedKey
          );

          await fetchPosts(
            1,
            true,
            !hasCachedPosts,
            filter,
            selectedTribe
          );

          if (cancelled) return;

          if (filter === "all") {
            await fetchReels();
          }

          initializedFeedsRef.current.add(
            feedKey
          );
        } else {
          console.log(
            "🏠 [HOME INIT] Using existing feed:",
            feedKey
          );
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

      } finally {
        if (cancelled) return;

        setInitialLoad(false);
        setLoading(false);
      }
    };

    void initialize();

    return () => {
      cancelled = true;
    };

  }, [
    filter,
    selectedTribe,
    isOnline,
    initializedFeedsRef,
    resetFeedState,
    fetchPosts,
    fetchReels,
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