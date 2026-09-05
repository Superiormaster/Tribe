'use client';

import { useEffect } from "react";
import {
  getFeed,
  getReels,
} from "@/lib/feedDb";

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

  hasCacheRef: React.MutableRefObject<boolean>;

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
  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      try {
        const cachedPosts =
          await getFeed(
            filter,
            selectedTribe,
            1
          );

        const cachedReels =
          await getReels(
            filter,
            selectedTribe
          );

        if (cancelled) return;

        hasCacheRef.current =
          cachedPosts.length > 0;

        if (cachedPosts.length) {
          cachedPosts.forEach((post: any) => {
            if (post?._local_created) {
              const id = Number(post.id);
        
              if (id) {
                protectedPostIdsRef.current.add(id);
              }
            }
          });
        
          setPosts(cachedPosts);
          setInitialLoad(false);
          setLoading(false);
        }

        if (cachedReels.length) {
          setReels(cachedReels);
        }

        await fetchPosts(
          1,
          true,
          !cachedPosts.length,
          filter,
          selectedTribe
        );
        
        if (filter === "all") {
          await fetchReels();
        }
      } catch (err) {
        console.error(
          "Home initialization failed:",
          err
        );
      
        window.dispatchEvent(
          new CustomEvent("network-error")
        );
      }
    };

    initialize();

    return () => {
      cancelled = true;
    };
  }, [
    filter,
    selectedTribe,
  ]);
}