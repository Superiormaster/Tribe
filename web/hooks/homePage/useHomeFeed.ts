"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";

import { apiRequest } from "@/utils/api";
import { useNetwork } from "@/components/networkConnection/NetworkContext";
import { REFRESH_HOME_EVENT } from "@/lib/authEvents";

import {
  saveFeed,
  saveReels,
  getFeed,
  clearFeed,
  clearReels,
  updateFeedPost,
  insertFeedPost,
  removeFeedPost,
  updateReel,
} from "@/lib/feedDb";

import { removePostFromAllFeedCaches } from "@/lib/feedDb";

import { emitPostDeleted } from "@/lib/postEvents";
import { removePostFromState } from "@/lib/removePostFromState";

interface UseHomeFeedProps {
  filter: "all" | "tribes";
  selectedTribe: number | null;
}

export function useHomeFeed({
  filter,
  selectedTribe,
}: UseHomeFeedProps) {
  const { isOnline } = useNetwork();

  const [posts, setPosts] = useState<any[]>([]);
  const [reels, setReels] = useState<any[]>([]);
  const [feedResponse, setFeedResponse] = useState<any>(null);
  const protectedPostIdsRef = useRef<Set<number>>(new Set());

  const [starredUsers, setStarredUsers] =
    useState<Set<number>>(new Set());

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [reachedLimit, setReachedLimit] = useState(false);

  const MAX_PAGES = 10;

  const pagesCache = useRef<Record<number, any[]>>({});
  const reelsCache = useRef<any[]>([]);

  const lastPageRef = useRef(1);

  const hasCacheRef = useRef(false);

  const loadingRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);

  const postsRequestIdRef = useRef(0);
  const reelsRequestIdRef = useRef(0);

  const loadMoreRef =
    useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!starredUsers.size) return;

    setPosts(prev =>
      prev.map(post => ({
        ...post,
        is_starred_by_user:
          starredUsers.has(post.user?.id),
      }))
    );

    const syncStarred = async () => {
      const currentPosts = posts;

      await Promise.all(
        currentPosts.map(post =>
          updateFeedPost(post.id, {
            is_starred_by_user:
              starredUsers.has(post.user?.id),
          })
        )
      );
    };

    syncStarred().catch(err =>
      console.error(
        "Failed to sync starred state",
        err
      )
    );
  }, [starredUsers]);

  const getSessionPost = useCallback(() => {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      const saved =
        sessionStorage.getItem("new_post");

      if (!saved) return null;

      const post = JSON.parse(saved);

      if (!post?.id) {
        sessionStorage.removeItem("new_post");
        return null;
      }

      return post;
    } catch (err) {
      console.error(
        "Failed to read session post",
        err
      );

      sessionStorage.removeItem("new_post");

      return null;
    }
  }, []);

  const clearSessionPost = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    sessionStorage.removeItem("new_post");
  }, []);

  const mergeSessionPost = useCallback(
    (items: any[]) => {
      const sessionPost = getSessionPost();

      if (!sessionPost) {
        return items;
      }

      const exists = items.some(
        post =>
          Number(post.id) === Number(sessionPost.id)
      );

      if (exists) {
        clearSessionPost();

        return items;
      }

      return [
        {
          ...sessionPost,

          reactKey:
            sessionPost.reactKey ??
            `post-${sessionPost.id}`,

          feed_type:
            sessionPost.feed_type ?? "post",

          is_starred_by_user:
            starredUsers.has(
              sessionPost.user?.id
            ),
        },

        ...items,
      ];
    },
    [
      getSessionPost,
      clearSessionPost,
      starredUsers,
    ]
  );

  const resetFeedState = useCallback(() => {
    pagesCache.current = {};
    reelsCache.current = [];

    lastPageRef.current = 1;

    loadingRef.current = false;
    loadingMoreRef.current = false;
    hasMoreRef.current = true;

    hasCacheRef.current = false;

    setPosts([]);
    setReels([]);

    setPage(1);
    setHasMore(true);
    setReachedLimit(false);

    setLoadingMore(false);
  }, []);

  const removePostEverywhere = useCallback(
    async (postId: number) => {
      const id = Number(postId);

      if (!id) return;

      postsRequestIdRef.current++;

      setPosts(prev =>
        removePostFromState(prev, id)
      );

      await removePostFromAllFeedCaches(id);

      emitPostDeleted(id);
    },
    []
  );

  const fetchPosts = useCallback(
    async (
      pageNumber = 1,
      replace = false,
      showSkeleton = true,
      currentFilter = filter,
      currentTribe = selectedTribe
    ) => {
      // Do not allow duplicate requests.
      if (loadingMoreRef.current) {
        return;
      }

      // Only stop pagination after page 1.
      if (
        pageNumber > 1 &&
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

        console.log("🔥 FEED RESPONSE", {
          pageNumber,
          filter: currentFilter,
          tribe: currentTribe,
          count: data.count,
          next: data.next,
          previous: data.previous,
          resultsLength:
            data.results?.length,
        });

        // Request became obsolete.
        if (
          requestId !==
          postsRequestIdRef.current
        ) {
          return;
        }

        // Device went offline while request was running.
        if (
          typeof navigator !== "undefined" &&
          !navigator.onLine
        ) {
          return;
        }

        const results =
          data.results ?? [];

        const newItems = results.map(
          (item: any) => {
            const data =
              item?.data ?? item;

            const type =
              item?.type ?? "post";

            let reactKey = `post-${data.id}`;

            if (type === "repost") {
              reactKey =
                `repost-${data.id}`;
            }

            if (type === "share") {
              reactKey =
                `share-${data.id}`;
            }

            return {
              ...data,

              reactKey,

              feed_type: type,

              is_starred_by_user:
                starredUsers.has(
                  data.user?.id
                ),
            };
          }
        );

        await saveFeed(
          currentFilter,
          currentTribe,
          pageNumber,
          newItems
        );

        pagesCache.current[
          pageNumber
        ] = newItems;

        hasCacheRef.current = true;

        setFeedResponse(data);

        const nextExists =
          Boolean(data.next);

        hasMoreRef.current =
          nextExists;

        setHasMore(nextExists);

        if (pageNumber === 1) {
          let firstPage =
            [...newItems];

          firstPage =
            mergeSessionPost(firstPage);

          setPosts(prev => {
            const map =
              new Map<string, any>();

            // Preserve anything already present.
            prev.forEach(post => {
              if (post?.reactKey) {
                map.set(
                  post.reactKey,
                  post
                );
              }
            });

            // Backend items take priority.
            firstPage.forEach(post => {
              if (!post?.reactKey) {
                return;
              }
            
              const postId =
                Number(post.id);
           
              if (
                postId &&
                protectedPostIdsRef.current.has(
                  postId
                )
              ) {
                return;
              }
            
              map.set(
                post.reactKey,
                post
              );
            });

            return [...map.values()];
          });
        } else {
          setPosts(prev => {
            const map =
              new Map<string, any>();

            prev.forEach((post: any) => {
              if (post?.reactKey) {
                map.set(
                  post.reactKey,
                  post
                );
              }
            });

            newItems.forEach((post: any) => {
              if (!post?.reactKey) {
                return;
              }
            
              const postId =
                Number(post.id);
            
              if (
                postId &&
                protectedPostIdsRef.current.has(
                  postId
                )
              ) {
                return;
              }
            
              map.set(
                post.reactKey,
                post
              );
            });

            return [...map.values()];
          });
        }

        lastPageRef.current =
          pageNumber;

        setPage(pageNumber);
      } catch (err) {
        console.error(
          "❌ Failed to fetch feed",
          err
        );

        try {
          const cached =
            await getFeed(
              currentFilter,
              currentTribe,
              pageNumber
            );

          if (cached.length) {
            hasCacheRef.current = true;

            const cachedItems =
              pageNumber === 1
                ? mergeSessionPost(cached)
                : cached;

            setPosts(prev => {
              if (pageNumber === 1) {
                return cachedItems;
              }

              const map =
                new Map<string, any>();

              prev.forEach(post => {
                map.set(
                  post.reactKey,
                  post
                );
              });

              cachedItems.forEach((post: any) => {
                map.set(
                  post.reactKey,
                  post
                );
              });

              return [...map.values()];
            });
          }
        } catch (cacheError) {
          console.error(
            "❌ Failed to load feed cache",
            cacheError
          );
        }

        window.dispatchEvent(
          new CustomEvent(
            "network-error"
          )
        );
      } finally {
        loadingMoreRef.current =
          false;

        loadingRef.current =
          false;

        setLoading(false);
        setLoadingMore(false);

        setInitialLoad(false);
      }
    },
    [
      filter,
      selectedTribe,
      starredUsers,
      mergeSessionPost,
    ]
  );

  const addFeedPost = useCallback(
    async (post: any) => {
      const normalizedPost = {
        ...post,
  
        reactKey:
          post.reactKey ??
          `post-${post.id}`,
  
        feed_type:
          post.feed_type ?? "post",
  
        is_starred_by_user:
          starredUsers.has(
            post.user?.id
          ),
      };
  
      const postId =
        Number(normalizedPost.id);
  
      if (postId) {
        protectedPostIdsRef.current.add(
          postId
        );
      }
  
      // Save to IndexedDB.
      await insertFeedPost(
        filter,
        selectedTribe,
        normalizedPost
      );
  
      // Save temporary session copy.
      if (
        typeof window !== "undefined"
      ) {
        sessionStorage.setItem(
          "new_post",
          JSON.stringify(
            normalizedPost
          )
        );
      }
  
      // Put immediately at top of UI.
      setPosts(prev => {
        const exists =
          prev.some(
            item =>
              Number(item.id) ===
              postId
          );
  
        if (exists) {
          return prev;
        }
  
        return [
          normalizedPost,
          ...prev,
        ];
      });
    },
    [
      filter,
      selectedTribe,
      starredUsers,
    ]
  );

  const fetchReels = useCallback(
    async () => {
      if (!isOnline) {
        return;
      }

      const requestId =
        ++reelsRequestIdRef.current;

      try {
        let url =
          "api/post/reels/?";

        if (
          filter === "tribes" &&
          selectedTribe
        ) {
          url +=
            `&tribe=${selectedTribe}`;
        }

        const data =
          await apiRequest(url);

        if (
          typeof navigator !==
            "undefined" &&
          !navigator.onLine
        ) {
          return;
        }

        if (
          requestId !==
          reelsRequestIdRef.current
        ) {
          return;
        }

        const results =
          data.results ?? data;

        const validReels =
          results.filter(
            (reel: any) =>
              reel?.media_files?.some(
                (media: any) =>
                  media?.file_url
              )
          );

        const shuffled =
          [...validReels].sort(
            () =>
              Math.random() -
              0.5
          );

        reelsCache.current =
          shuffled;

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
    },
    [
      filter,
      selectedTribe,
      isOnline,
    ]
  );

  const refreshFeed =
    useCallback(async () => {
      if (
        loadingRef.current ||
        loadingMoreRef.current
      ) {
        return;
      }

      // Invalidate previous requests.
      postsRequestIdRef.current++;
      reelsRequestIdRef.current++;
      protectedPostIdsRef.current.clear();

      hasCacheRef.current =
        false;

      await clearFeed(
        filter,
        selectedTribe
      );

      await clearReels(
        filter,
        selectedTribe
      );

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
      } catch (err) {
        console.error(
          "❌ Feed refresh failed",
          err
        );

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
        setInitialLoad(false);
      }
    }, [
      filter,
      selectedTribe,
      resetFeedState,
      fetchPosts,
      fetchReels,
    ]);

  const loadMore =
    useCallback(async () => {
      if (
        loadingRef.current ||
        loadingMoreRef.current ||
        !hasMoreRef.current ||
        reachedLimit
      ) {
        return;
      }

      if (
        page >= MAX_PAGES
      ) {
        setReachedLimit(true);
        return;
      }

      const nextPage =
        page + 1;

      const cached =
        await getFeed(
          filter,
          selectedTribe,
          nextPage
        );

      if (cached.length) {
        pagesCache.current[
          nextPage
        ] = cached;

        hasCacheRef.current =
          true;

        setPosts(prev => {
          const map =
            new Map<string, any>();

          prev.forEach(post => {
            map.set(
              post.reactKey,
              post
            );
          });

          cached.forEach((post: any) => {
            map.set(
              post.reactKey,
              post
            );
          });

          return [...map.values()];
        });

        setPage(nextPage);
      }

      await fetchPosts(
        nextPage,
        false,
        false,
        filter,
        selectedTribe
      );
    }, [
      page,
      filter,
      selectedTribe,
      reachedLimit,
      fetchPosts,
    ]);

  useEffect(() => {
    const target =
      loadMoreRef.current;

    if (!target) return;

    if (!hasMore) return;

    const observer =
      new IntersectionObserver(
        ([entry]) => {
          if (
            entry.isIntersecting &&
            !loading &&
            !loadingMore &&
            hasMore &&
            page < MAX_PAGES
          ) {
            loadMore();
          }
        },
        {
          rootMargin:
            "400px",
          threshold: 0,
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
    loadMore,
  ]);

  const incrementPostView =
    useCallback(
      async (postId: number) => {
        let newCount = 0;

        setPosts(prev =>
          prev.map(post => {
            if (
              Number(post.id) !==
              Number(postId)
            ) {
              return post;
            }

            newCount =
              (post.views_count || 0) +
              1;

            return {
              ...post,
              views_count:
                newCount,
            };
          })
        );

        await updateFeedPost(
          postId,
          {
            views_count:
              newCount,
          }
        );
      },
      []
    );

  useEffect(() => {
    const refresh =
      () => {
        refreshFeed();
      };

    window.addEventListener(
      REFRESH_HOME_EVENT,
      refresh
    );

    return () => {
      window.removeEventListener(
        REFRESH_HOME_EVENT,
        refresh
      );
    };
  }, [refreshFeed]);

  useEffect(() => {
    return () => {
      postsRequestIdRef.current++;
      reelsRequestIdRef.current++;
    };
  }, []);

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
    setStarredUsers,
    starredUsers,
    fetchPosts,
    fetchReels,
    refreshFeed,
    loadMore,
    incrementPostView,
    resetFeedState,
    updateFeedPost,
    insertFeedPost,
    addFeedPost,
    removePostEverywhere,
    removeFeedPost,
    updateReel,
  };
}