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
          setPosts(cachedPosts);
          setInitialLoad(false);
          setLoading(false);
        }

        const saved =
          sessionStorage.getItem(
            "new_post"
          );

        if (saved) {
          const localPost =
            JSON.parse(saved);

          setPosts(prev => {
            if (
              prev.some(
                p => p.id === localPost.id
              )
            ) {
              return prev;
            }

            return [
              localPost,
              ...prev,
            ];
          });

          sessionStorage.removeItem(
            "new_post"
          );
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

          console.error(err);
      
          const cached = await getFeed(
              currentFilter,
              currentTribe,
              pageNumber
          );
      
          if (cached.length) {
      
              setPosts(prev =>
                  pageNumber === 1
                      ? cached
                      : [...prev, ...cached]
              );
          }
      
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