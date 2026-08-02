"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { apiRequest } from "@/utils/api";
import { useNetwork } from "@/components/networkConnection/NetworkContext";
import { REFRESH_HOME_EVENT } from "@/lib/authEvents";
import {
  saveFeed,
  saveReels,
  getFeed,
  getReels,
  clearFeed,
  clearReels,
} from "@/lib/feedDb";

interface UseHomeFeedProps {
  filter: "all" | "tribes";
  selectedTribe: number | null;
}

export function useHomeFeed({
  filter,
  selectedTribe,
}: UseHomeFeedProps) {
  const {
    isOnline
  } = useNetwork();

  // -----------------------------
  // STATE
  // -----------------------------
  const [posts, setPosts] = useState<any[]>([]);
  const [reels, setReels] = useState<any[]>([]);
  const [feedResponse, setFeedResponse] = useState<any>(null);
  const [starredUsers, setStarredUsers] =
    useState<Set<number>>(new Set());

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [reachedLimit, setReachedLimit] = useState(false);

  // -----------------------------
  // CONSTANTS
  // -----------------------------
  const MAX_PAGES = 5;

  // -----------------------------
  // REFS
  // -----------------------------
  const pagesCache =
    useRef<Record<number, any[]>>({});

  const reelsCache =
    useRef<any[]>([]);

  const lastPageRef =
    useRef(1);

  const hasCacheRef =
    useRef(false);

  const loadingRef =
    useRef(false);

  const loadingMoreRef =
    useRef(false);

  const hasMoreRef =
    useRef(true);

  const postsRequestIdRef =
    useRef(0);

  const reelsRequestIdRef =
    useRef(0);

  const loadMoreRef =
    useRef<HTMLDivElement>(null);

  // -----------------------------
  // KEEP REFS UPDATED
  // -----------------------------
  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    loadingMoreRef.current = loadingMore;
  }, [loadingMore]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);
  
  useEffect(() => {
    let mounted = true;

    const fetchStarredUsers = async () => {
      try {
        const res = await apiRequest(
          "api/users/starred/"
        );

        if (!mounted) return;

        setStarredUsers(
          new Set(res.starred_users ?? [])
        );
      } catch (err) {
        console.error(
          "Failed to fetch starred users",
          err
        );
      }
    };

    fetchStarredUsers();

    return () => {
      mounted = false;
    };
  }, []);

  const starredUserIds = useMemo(() => {
    return new Set<number>(
      (feedResponse?.starred_user_ids ?? []) as number[]
    );
  }, [feedResponse]);


  // -----------------------------
  // RESET
  // -----------------------------
  const resetFeedState = () => {
    pagesCache.current = {};
    reelsCache.current = [];
    lastPageRef.current = 1;

    setPosts([]);
    setReels([]);

    setPage(1);
    setHasMore(true);
    setReachedLimit(false);

    loadingMoreRef.current = false;
    hasMoreRef.current = true;
  };

  // -----------------------------
  // FETCH POSTS
  // -----------------------------
  const fetchPosts = useCallback(async (
    pageNumber = 1,
    replace = false,
    showSkeleton = true,
    currentFilter = filter,
    currentTribe = selectedTribe
  ) => {
    if (
      loadingMoreRef.current ||
      !hasMoreRef.current
    ) {
      return;
    }

    const requestId =
      ++postsRequestIdRef.current;

    try {
      if (
        showSkeleton &&
        !hasCacheRef.current &&
        pageNumber === 1
      ) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      loadingMoreRef.current = true;

      let url =
        `api/feed/?page=${pageNumber}`;

      if (
        currentFilter === "tribes" &&
        currentTribe
      ) {
        url += `&tribe=${currentTribe}`;
      }

      const data =
        await apiRequest(url);

      if (!navigator.onLine) return;

      if (
        requestId !==
        postsRequestIdRef.current
      ) {
        return;
      }

      const results =
        data.results ?? [];

      setFeedResponse(data);

      if (!data.next) {
        hasMoreRef.current = false;
      }

      setHasMore(!!data.next);

      const newItems = results.map((item: any) => ({
        ...item.data,
      
        reactKey:
          item.type === "repost"
            ? `repost-${item.data.id}`
            : `post-${item.data.id}`,
      
        feed_type: item.type,
      
        is_starred_by_user:
          starredUserIds.has(item.data.user?.id),
      }));

      await saveFeed(
        currentFilter,
        currentTribe,
        pageNumber,
        newItems
      );

      pagesCache.current[pageNumber] =
        newItems;

      if (pageNumber === 1) {
        const saved =
          sessionStorage.getItem(
            "new_post"
          );

        if (saved) {
          const localPost =
            JSON.parse(saved);

          if (
            !newItems.some(
              (p: any) => p.reactKey === localPost.reactKey
            )
          ) {
            newItems.unshift(localPost);
          }

          sessionStorage.removeItem(
            "new_post"
          );
        }

        setPosts(newItems);
      } else {
        setPosts((prev) => {
          const ids = new Set(prev.map((p: any) => p.reactKey));

          return [
            ...prev,
            ...newItems.filter(
              (p: any) => !ids.has(p.reactKey)
            ),
          ];
        });
      }

      lastPageRef.current =
        pageNumber;

      setPage(pageNumber);
    } catch (err) {
      console.error(
        "Failed to fetch posts",
        err
      );

      window.dispatchEvent(
        new CustomEvent(
          "network-error",
          {
            detail:
              "Failed to fetch posts",
          }
        )
      );
    } finally {
      loadingMoreRef.current =
        false;

      setLoading(false);
      setLoadingMore(false);

      if (initialLoad) {
        setInitialLoad(false);
      }
    }
  }, [filter, selectedTribe, starredUserIds,]);

    // -----------------------------
  // FETCH REELS
  // -----------------------------
  const fetchReels = useCallback(async () => {
    if (!isOnline) return;

    const requestId =
      ++reelsRequestIdRef.current;

    try {
      let url = "api/post/reels/?";

      if (
        filter === "tribes" &&
        selectedTribe
      ) {
        url += `&tribe=${selectedTribe}`;
      }

      const data =
        await apiRequest(url);

      if (!navigator.onLine) return;

      if (
        requestId !==
        reelsRequestIdRef.current
      ) {
        return;
      }

      const results =
        data.results ?? data;

      const validReels =
        results.filter((reel: any) =>
          reel?.media_files?.some(
            (m: any) => m?.file_url
          )
        );

      const shuffled = [...validReels].sort(
        () => Math.random() - 0.5
      );

      reelsCache.current = shuffled;

      setReels(shuffled);

      await saveReels(
        filter,
        selectedTribe,
        shuffled
      );
    } catch (err) {
      console.error(
        "Failed to fetch reels",
        err
      );
    }
  }, [filter, selectedTribe, isOnline]);

  // -----------------------------
  // REFRESH FEED
  // -----------------------------
  const refreshFeed = async () => {
    if (
      loadingMore ||
      loadingMoreRef.current
    ) {
      return;
    }

    await clearFeed(
      filter,
      selectedTribe
    );

    await clearReels(
      filter,
      selectedTribe
    );

    hasCacheRef.current = false;

    resetFeedState();

    setInitialLoad(true);
    setLoading(true);

    try {
      await apiRequest(
        "api/feed/refresh/",
        {
          method: "POST",
        }
      );

      await fetchPosts(
        1,
        true,
        true,
        filter,
        selectedTribe
      );

      if (filter === "all") {
        await fetchReels();
      }
    } catch {
      window.dispatchEvent(
        new CustomEvent(
          "network-error",
          {
            detail:
              "Couldn't refresh feed",
          }
        )
      );
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  // LOAD MORE
  // -----------------------------
  const loadMore = async () => {
    if (
      loading ||
      loadingMore ||
      !hasMore ||
      reachedLimit ||
      loadingRef.current ||
      loadingMoreRef.current ||
      !hasMoreRef.current
    ) {
      return;
    }

    const canScroll =
      document.documentElement
        .scrollHeight >
      window.innerHeight;

    if (!canScroll) return;

    if (page >= MAX_PAGES) {
      setReachedLimit(true);
      return;
    }

    const nextPage = page + 1;

    const cached =
      await getFeed(
        filter,
        selectedTribe,
        nextPage
      );

    if (cached.length) {
      pagesCache.current[nextPage] =
        cached;

      setPosts((prev) => {
        const ids = new Set(
          prev.map((p) => p.id)
        );

        return [
          ...prev,
          ...cached.filter(
            (p: any) => !ids.has(p.id)
          ),
        ];
      });

      setPage(nextPage);
      return;
    }

    await fetchPosts(nextPage);
  };

  // -----------------------------
  // INCREMENT VIEW
  // -----------------------------
  const incrementPostView = (
    postId: number
  ) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              views_count:
                (post.views_count || 0) +
                1,
            }
          : post
      )
    );
  };

  // -----------------------------
  // REFRESH EVENT
  // -----------------------------
  useEffect(() => {
    const refresh = async () => {
        await refreshFeed();
    };

    window.addEventListener(REFRESH_HOME_EVENT, refresh);

    return () =>
        window.removeEventListener(REFRESH_HOME_EVENT, refresh);

  }, [refreshFeed]);

  // -----------------------------
  // OBSERVER
  // -----------------------------
  useEffect(() => {
    const target =
      loadMoreRef.current;

    if (!target) return;
    if (!hasMore) return;

    const observer =
      new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            loadMore();
          }
        },
        {
          threshold: 1,
        }
      );

    observer.observe(target);

    return () =>
      observer.disconnect();
  }, [
    page,
    hasMore,
    loading,
    loadingMore,
  ]);

  // -----------------------------
  // CLEANUP
  // -----------------------------
  useEffect(() => {
    return () => {
      postsRequestIdRef.current++;
      reelsRequestIdRef.current++;
    };
  }, []);

  // -----------------------------
  // RETURN
  // -----------------------------
  return {
    posts,
    setPosts,
    reels,
    setReels,
    setLoading,
    setInitialLoad,
    hasCacheRef,
    loading,
    loadingMore,
    initialLoad,
    page,
    hasMore,
    reachedLimit,
    feedResponse,
    loadMoreRef,
    starredUserIds,
    setStarredUsers,
    starredUsers,

    fetchPosts,
    fetchReels,
    refreshFeed,
    loadMore,
    incrementPostView,
    resetFeedState,
  };
}