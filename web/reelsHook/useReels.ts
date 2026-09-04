'use client';

import {
    useEffect,
    useRef,
    useState,
} from "react";
import { apiRequest } from '@/utils/api';
import { deletePostEverywhere } from "@/utils/deletePost";
import { useReelBuffer } from '@/reelsHook/useReelBuffer';
import { useNavigation } from "@/utils/useNavigation";
import toast from 'react-hot-toast';

type Reel = {
  id: number;
  pk?: number;
  post_id?: number;
  content_type?: string;

  is_liked?: boolean;
  likes_count?: number;

  bookmarked?: boolean;
  is_bookmarked?: boolean;

  comments_count?: number;
  shares_count?: number;
  views_count?: number;

  user?: {
    id: number;
    username: string;
    avatar?: string;
  };
  [key: string]: any;
};

export function useReels(reelId?: number) {
  const PAGE_SIZE = 5;

  const [reels, setReels] = useState<Reel[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(true);
  const { push } = useNavigation();
  
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [waitingForNetwork, setWaitingForNetwork] = useState(false);
  const initialFetchDoneRef = useRef(false);
  const initializedRef = useRef(false);
  const refreshDoneRef = useRef(false);
  const hasReelsRef = useRef(false);
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const {
    isOnline,
    serverReachable,
    reconnecting,
    networkStatus,
  } = useReelBuffer();
  
  const canLoadReels =
    isOnline &&
    serverReachable &&
    !reconnecting;
  
  const [starredUsers, setStarredUsers] =
      useState<Set<number>>(new Set());
  
  const [
      openCommentsPostId,
      setOpenCommentsPostId,
  ] = useState<number | null>(null);
  
  const loadingRef = useRef(false);
  
  const fetchCurrentUser = async () => {
    try {
        const res = await apiRequest(
            "api/users/me/"
        );

        setCurrentUser(res);
    } catch (err) {
        console.error(err);
    }
  };
  
  const fetchStarred = async () => {
    try {
        const res = await apiRequest(
            "api/users/starred/"
        );

        setStarredUsers(
            new Set(res.starred_users)
        );
    } catch (err) {
        console.error(err);
    }
  };
  
  const normalizeReel = (
    reel: Reel
  ): Reel => {

    const id =
      reel.id ??
      reel.pk ??
      reel.post_id;

    return {
      ...reel,

      id,

      likes_count:
        Number(reel.likes_count ?? 0),

      comments_count:
        Number(reel.comments_count ?? 0),

      shares_count:
        Number(reel.shares_count ?? 0),

      views_count:
        Number(reel.views_count ?? 0),

      is_liked:
        Boolean(
          reel.is_liked ??
          reel.liked_by_user ??
          false
        ),

      bookmarked:
        Boolean(
          reel.bookmarked ??
          reel.is_bookmarked ??
          false
        ),
    };
  };
  
  const fetchInitialReels = async () => {
    const storedId = Number(
      sessionStorage.getItem("clicked_reel_id")
    );
  
    const clickedReelId =
      reelId ?? (storedId || null);
  
    if (!canLoadReels) {
      setWaitingForNetwork(true);
      return;
    }
  
    setWaitingForNetwork(false);
    setLoading(true);
  
    try {
      const res = await apiRequest(
        `api/post/reels/?page=1&page_size=${PAGE_SIZE}`
      );
  
      const normalized: Reel[] =
        (res.results || [])
          .filter(
            (r: Reel) =>
              r.content_type === "short_video"
          )
          .map(normalizeReel);
  
      if (clickedReelId) {
        sessionStorage.removeItem(
          "clicked_reel_id"
        );
  
        const clicked =
          normalized.find(
            (r: Reel) =>
              Number(r.id) === clickedReelId
          );
  
        if (clicked) {
          const others =
            normalized.filter(
              (r: Reel) =>
                Number(r.id) !== clickedReelId
            );
  
          setReels([
            clicked,
            ...others,
          ]);
        } else {
          setReels(normalized);
        }
      } else {
        setReels(normalized);
      }
  
      hasReelsRef.current =
        normalized.length > 0;
  
      setPage(1);
      setHasNext(Boolean(res.next));
  
    } catch (err) {
      console.error(
        "[useReels] Failed to fetch reels:",
        err
      );
  
      if (
        !navigator.onLine ||
        !serverReachable
      ) {
        setWaitingForNetwork(true);
        return;
      }
  
      setWaitingForNetwork(false);
  
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (!canLoadReels) {
      setWaitingForNetwork(true);
      return;
    }
  
    if (initialFetchDoneRef.current) {
      return;
    }
  
    initialFetchDoneRef.current = true;
  
    fetchInitialReels();
  }, [canLoadReels]);
  
  useEffect(() => {
  
    const handleReconnect = () => {
  
      console.log(
        "[useReels] Network restored — retrying reels"
      );
  
      setWaitingForNetwork(false);
      if (reels.length === 0) {
        fetchInitialReels();
        return;
      }
  
      if (!hasNext) {
        fetchInitialReels();
      }
  
    };
  
    window.addEventListener(
      "network-reconnected",
      handleReconnect
    );
  
    return () => {
      window.removeEventListener(
        "network-reconnected",
        handleReconnect
      );
    };
  
  }, [reels.length, hasNext]);
  
  useEffect(() => {
    if (!canLoadReels) {
      setWaitingForNetwork(true);
      return;
    }
  
    if (initializedRef.current) {
      return;
    }
  
    const init = async () => {
      initializedRef.current = true;
  
      setWaitingForNetwork(false);
      setLoading(true);
  
      const navigation =
        performance.getEntriesByType(
          "navigation"
        )[0] as PerformanceNavigationTiming;
  
      try {
        if (
          navigation?.type === "reload" &&
          !refreshDoneRef.current
        ) {
          refreshDoneRef.current = true;
  
          try {
            await apiRequest(
              "api/post/refresh_reels/",
              {
                method: "POST",
              }
            );
          } catch (error) {
            console.warn(
              "[useReels] Failed to refresh reels:",
              error
            );
          }
        }
  
        await Promise.all([
          fetchInitialReels(),
          fetchCurrentUser(),
          fetchStarred(),
        ]);
  
      } catch (error) {
        console.error(
          "[useReels] Initialization failed:",
          error
        );
  
      } finally {
        setLoading(false);
      }
    };
  
    init();
  
  }, [canLoadReels]);
  
  const loadMore = async () => {
    if (
      !isOnline ||
      !serverReachable ||
      reconnecting
    ) {
      return;
    }
    if (loadingRef.current) return;
    if (!hasNext) return;

    loadingRef.current = true;
    setLoadingMore(true);

    try {
        const nextPage = page + 1;

        const res = await apiRequest(
            `api/post/reels/?page=${nextPage}&page_size=${PAGE_SIZE}`
        );

        const normalized: Reel[] = (res.results || []).map(normalizeReel);

        // No more results
        if (normalized.length === 0) {
            setHasNext(false);
            return;
        }

        setReels((prev: Reel[]) => {
            const ids = new Set(prev.map((r: Reel) => r.id));
            const fresh = normalized.filter((r: Reel) => !ids.has(r.id));
            return [...prev, ...fresh];
        });

        setPage(nextPage);
        setHasNext(Boolean(res.next));

    } catch (err: any) {
        console.error(
          "[useReels] loadMore failed:",
          err
        );

        // Stop requesting if page doesn't exist
        if (err?.status === 404 || err?.response?.status === 404) {
            setHasNext(false);
        }
    } finally {
        loadingRef.current = false;
        setLoadingMore(false);
    }
  };
  
  const handleLike = async (reel: Reel) => {
    if (!reel?.id) return;
  
    const reelId = Number(reel.id);
  
    // Save the current server state before optimistic update
    const previousLiked = Boolean(reel.is_liked);
    const previousCount = Number(reel.likes_count ?? 0);
  
    // Optimistic update
    setReels(prev =>
      prev.map(r =>
        Number(r.id) === reelId
          ? {
              ...r,
              is_liked: !previousLiked,
              likes_count: previousLiked
                ? Math.max(0, previousCount - 1)
                : previousCount + 1,
            }
          : r
      )
    );
  
    try {
      const res = await apiRequest(
        `api/likes/${reelId}/toggle/`,
        {
          method: "POST",
        }
      );
  
      // Server is authoritative
      setReels(prev =>
        prev.map(r =>
          Number(r.id) === reelId
            ? {
                ...r,
                is_liked: Boolean(res.liked),
                likes_count: Number(
                  res.likes_count ?? 0
                ),
              }
            : r
        )
      );
  
    } catch (err) {
      // Roll back optimistic update
      setReels(prev =>
        prev.map(r =>
          Number(r.id) === reelId
            ? {
                ...r,
                is_liked: previousLiked,
                likes_count: previousCount,
              }
            : r
        )
      );
  
      console.error(
        "[useReels] Failed to update like:",
        err
      );
  
      toast.error(
        "Couldn't update like. Check your connection."
      );
    }
  };
  
  const handleBookmark = async (
    reel: Reel
  ) => {

    if (!reel?.id) return;

    const reelId =
      Number(reel.id);

    const previousBookmarked =
      Boolean(
        reel.bookmarked ??
        reel.is_bookmarked ??
        false
      );

    setReels(
      prev =>
        prev.map(
          r =>
            Number(r.id) === reelId
              ? {
                  ...r,
                  bookmarked:
                    !previousBookmarked,
                  is_bookmarked:
                    !previousBookmarked,
                }
              : r
        )
    );

    try {

      const result = await apiRequest(
        `api/bookmarks/toggle/`,
        {
          method: "POST",
          data: {
            type: "reel",
            post_id: reelId,
          },
        }
      );

      const serverBookmarked =
        Boolean(
          result.bookmarked
        );

      setReels(
        prev =>
          prev.map(
            r =>
              Number(r.id) === reelId
                ? {
                    ...r,
                    bookmarked:
                      serverBookmarked,
                    is_bookmarked:
                      serverBookmarked,
                  }
                : r
          )
      );

    } catch (error) {

      setReels(
        prev =>
          prev.map(
            r =>
              Number(r.id) === reelId
                ? {
                    ...r,
                    bookmarked:
                      previousBookmarked,
                    is_bookmarked:
                      previousBookmarked,
                  }
                : r
          )
      );

      console.error(
        "Failed to toggle bookmark:",
        error
      );

      toast.error(
        "Failed to update bookmark"
      );
    }
  };
  
  const toggleStar = async (
    userId: number
  ) => {

    if (!userId) return;

    const previous =
      starredUsers.has(userId);
  
    // Optimistic update
    setStarredUsers(
      prev => {
        const copy =
          new Set(prev);
        if (previous) {
          copy.delete(userId);
        } else {
          copy.add(userId);
        }
        return copy;
      }
    );

    try {
      const res =
        await apiRequest(
          `api/users/star/${userId}/toggle/`,
          {
            method: "POST",
          }
        );

      // Server truth
      setStarredUsers(
        prev => {
          const copy =
            new Set(prev);
          if (res.starred) {
            copy.add(userId);
          } else {
            copy.delete(userId);
          }
          return copy;
        }
      );

    } catch (err) {

      // Rollback
      setStarredUsers(
        prev => {
          const copy =
            new Set(prev);
          if (previous) {
            copy.add(userId);
          } else {
            copy.delete(userId);
          }
          return copy;
        }
      );

      console.error(
        "Failed to toggle star:",
        err
      );

      toast.error(
        "Failed to update star"
      );
    }
  };
  
  const handleMute = async (
    userId: number
  ) => {

    if (!userId) return;

    try {

      await apiRequest(
        `api/users/mute/${userId}/`,
        {
          method: "POST",
        }
      );

      toast.success(
        "User muted"
      );

    } catch (err) {

      console.error(
        "Failed to mute user:",
        err
      );

      toast.error(
        "Failed to mute user"
      );

    }

  };


  // =====================================================
  // BLOCK
  // =====================================================

  const handleBlock = async (
    userId: number,
    username: string
  ) => {

    if (!userId) return;

    if (
      !confirm(
        `Block @${username}?`
      )
    ) {
      return;
    }

    try {

      await apiRequest(
        `api/users/block/${userId}/`,
        {
          method: "POST",
        }
      );

      setReels(
        prev =>
          prev.filter(
            item =>
              Number(
                item.user?.id
              ) !== Number(userId)
          )
      );

      toast.success(
        "User blocked"
      );

    } catch (err) {

      console.error(
        "Failed to block user:",
        err
      );

      toast.error(
        "Failed to block user"
      );
    }
  };
  
  const handleReport = async (
      reelId:number,
      reason:string,
      details:string
  )=>{
      const res = await apiRequest(
          `api/post/${reelId}/report/`,
          {
              method:"POST",
              data:{
                  reason,
                  details,
              },
          }
      );
  
      return res;
  };
  
  const handleDelete = async (postId: number) => {
    try {
      await deletePostEverywhere(postId, "post");
  
      setReels(prev =>
        prev.filter(r => Number(r.id) !== Number(postId))
      );
  
      toast.success("Reel deleted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete reel");
    }
  };
  
  const handleEdit = (postId: number) => {
    push(`/main/create-post?edit=true&postId=${postId}`);
  };
  
  return {
      reels,
      setReels,
      loading,
      loadingMore,
      currentUser,
      starredUsers,
      openCommentsPostId,
      setOpenCommentsPostId,
  
      handleLike,
      toggleStar,
      handleBookmark,
      handleReport,
      handleMute,
      handleBlock,
      handleDelete,
      handleEdit,
  
      loadMore,
  };
}