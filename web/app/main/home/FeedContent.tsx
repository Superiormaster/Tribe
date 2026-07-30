'use client';
import { useState, useRef, useMemo, useEffect, useContext } from 'react';
import { useNavigation } from "@/utils/useNavigation"
import PostCard from '@/components/PostCard';
import ExploreCommunities from '@/components/ExploreCommunities';
import { Plus } from 'lucide-react'
import ReelCard from '@/components/ReelCard';
import RepostCard from '@/components/repost/RepostCard';
import LoadingScreen from '@/components/LoadingScreen';
import Skeleton from '@/components/Skeleton';
import { UserContext } from "@/components/UserContext";
import { useNetwork } from "@/components/networkConnection/NetworkContext";
import { apiRequest } from '@/utils/api';
import AppLink from '@/components/AppLink';
import { REFRESH_HOME_EVENT } from "@/lib/authEvents";
import { saveReels, saveFeed, getFeed, getReels, clearFeed, clearReels } from "@/lib/feedDb";

interface MediaFile {
  thumbnail_url?: string;
  file_url?: string;
  thumbnail?: string;
}

export default function HomePage() {
  const { user, loadingUser } = useContext(UserContext)!;
  const { replace, push } = useNavigation();
  
  useEffect(() => {
    if (loadingUser) return;
  
    if (!user) {
      replace("/");
    }
  }, [loadingUser, user, replace]);
  
  if (loadingUser) {
    return <LoadingScreen onComplete={() => {}} />;
  }
  
  if (!user) {
    return null;
  }
  const [posts, setPosts] = useState<any[]>([]);
  const pagesCache = useRef<Record<number, any[]>>({});
  const reelsCache = useRef<any[]>([]);
  const lastPageRef = useRef(1);
  const [feedResponse, setFeedResponse] = useState<any>(null);
  const [reels, setReels] = useState<any[]>([]);
  const [reachedLimit, setReachedLimit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [suggestedCommunities, setSuggestedCommunities] = useState<any[]>([]);
  const [initialLoad, setInitialLoad] = useState(true);
  const preloaded = useRef(new Set());
  const [starredUsers, setStarredUsers] = useState<Set<number>>(new Set());
  const loadingRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);
  const hasCacheRef = useRef(false);
  const [filter, setFilter] = useState<'all' | 'tribes'>('all');
  const [tribes, setTribes] = useState<any[]>([]);
  const [selectedTribe, setSelectedTribe] = useState<number | null>(null);
  const [showAllTribes, setShowAllTribes] = useState(false);
  const visibleTribes = showAllTribes ? tribes : tribes.slice(0, 3);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const MAX_PAGES = 5;
  const {
    isOnline,
    reconnecting,
    finishReconnect,
  } = useNetwork();
  const [loadingMore, setLoadingMore] = useState(false);
  const postsRequestIdRef =
    useRef(0);
  const reelsRequestIdRef =
    useRef(0);
  const currentTribe = tribes.find((t: any) => t.id === selectedTribe);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [refreshingFeed, setRefreshingFeed] =
    useState(false);
  const showLoading =
    initialLoad &&
    loading &&
    isOnline;

  const isEntertainment =
  currentTribe?.name?.toLowerCase() === "entertainment";
  const filteredPosts = posts.filter(
    (post: any) => post.content_type !== "short_video"
  );
  
  useEffect(() => {
    (async () => {
      const res = await apiRequest("api/users/starred/");
      setStarredUsers(new Set(res.starred_users));
    })();
  }, []);
  
  const fetchSuggested = async () => {
    try {
        const data = await apiRequest(
            "api/communities/explore/"
        );

        setSuggestedCommunities(data);
    } catch (err) {
        console.error(err);
    }
  };
  
  useEffect(() => {
    if (filter !== "all") return;

    fetchSuggested();
  }, [filter]);
  
  const resetFeedState = () => {
    pagesCache.current = {};
    lastPageRef.current = 1;
  
    setPosts([]);
    setPage(1);
    setHasMore(true);
    setReachedLimit(false);
  
    loadingMoreRef.current = false;
    hasMoreRef.current = true;
  };
  
  useEffect(() => {
    const refresh = async () => {
        setRefreshingFeed(true);
        await refreshFeed();

        if (filter === "all") {
            await fetchReels();
        }
        setRefreshingFeed(false);
    };

    window.addEventListener(
        REFRESH_HOME_EVENT,
        refresh
    );

    return () =>
        window.removeEventListener(
            REFRESH_HOME_EVENT,
            refresh
        );
  }, [filter, selectedTribe]);
  
  useEffect(() => {
    if (
      !isOnline ||
      !reconnecting
    ) {
      return;
    }
  
    let cancelled = false;
  
    const reconnectFeed = async () => {
      try {
        setRefreshingFeed(true);
        resetFeedState();
    
        await fetchPosts(1, true, true);
    
        if (
          cancelled ||
          !navigator.onLine
        ) {
          return;
        }
    
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
  ]);

  useEffect(() => {
    const check = async () => {
      const status = await apiRequest("api/users/onboarding-status/");
  
      if (!status.completed) {
        replace("/auth/profile-setup");
      }
    };
  
    check();
  }, []);
  
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
    reels.slice(0, 3).forEach((reel) => {
  
      const url = reel.media_files?.[0]?.thumbnail;
  
      if (!url) return;
  
      if (preloaded.current.has(url)) return;
  
      preloaded.current.add(url);
  
      const img = new Image();
      img.loading = "eager";
      img.decoding = "async";
      img.src = url;
  
    });
  }, [reels]);
  
  useEffect(() => {
    posts.slice(0, 10).forEach((post) => {
  
      if (post.user?.avatar &&
          !preloaded.current.has(post.user.avatar)) {
  
        preloaded.current.add(post.user.avatar);
  
        const img = new Image();
        img.loading = "eager";
        img.decoding = "async";
        img.src = post.user.avatar;
      }
  
      post.media_files?.forEach((file: MediaFile) => {
  
        const url = file.thumbnail_url ?? file.file_url;
  
        if (!url) return;
  
        if (preloaded.current.has(url)) return;
  
        preloaded.current.add(url);
  
        const img = new Image();
        img.loading = "eager";
        img.decoding = "async";
        img.src = url;
      });
  
    });
  }, [posts]);

  const fetchReels = async () => {
    if (!isOnline) return;
  
    const requestId =
      ++reelsRequestIdRef.current;
  
    try {
      let url =
        "api/post/reels/?";
  
      if (
        filter === "tribes" &&
        isEntertainment &&
        selectedTribe
      ) {
        url += `&tribe=${selectedTribe}`;
      }
  
      const data =
        await apiRequest(url);
  
      if (
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
              (m: any) => m?.file_url
            )
        );
  
      const shuffled =
        [...validReels].sort(
          () => Math.random() - 0.5
        );
  
      reelsCache.current = shuffled;
      setReels(shuffled);
      saveReels(filter, selectedTribe, shuffled);
    } catch (err) {
      console.error(
        "Failed to fetch reels",
        err
      );
    }
  };
  
  const starredUserIds = useMemo<Set<number>>(() => {
    return new Set<number>(
      (feedResponse?.starred_user_ids ?? []) as number[]
    );
  }, [feedResponse]);
  
  useEffect(() => {
    const target = loadMoreRef.current;
  
    if (!target) return;
  
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadMore();
        }
      },
      {
        rootMargin: "500px",
      }
    );
  
    observer.observe(target);
  
    return () => observer.disconnect();
  }, [page, hasMore, loading, loadingMore]);
  
  // --- Fetch posts ---
  const fetchPosts = async (
    pageNumber = 1,
    replace = false,
    showSkeleton = true
  ) => {
    if (
      loadingMore ||
      !hasMore ||
      loadingMoreRef.current
    ) {
      return;
    }
  
    const requestId =
      ++postsRequestIdRef.current;
  
    try {
      if (showSkeleton && !hasCacheRef.current && pageNumber === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
  
      loadingMoreRef.current = true;
  
      let url = `api/feed/?page=${pageNumber}`;
  
      if (
        filter === "tribes" &&
        selectedTribe
      ) {
        url += `&tribe=${selectedTribe}`;
      }
  
      const data =
        await apiRequest(url);
  
      /*
        User went offline while request
        was running.
      */
      if (
        !navigator.onLine 
      ) {
        return;
      }
  
      /*
        Another request started after
        this one.
      */
      if (
        requestId !==
        postsRequestIdRef.current
      ) {
        return;
      }
  
      const results = data.results ?? [];

      if (!data.next) {
        hasMoreRef.current = false;
      }

      setHasMore(!!data.next);
  
      setFeedResponse(data);
  
      const newItems = results.map((item: any) => ({
        id: item.type === "repost"
          ? `repost-${item.data.id}`
          : item.data.id,
        ...item.data,
        feed_type: item.type,
        is_starred_by_user: starredUserIds.has(item.data.user?.id),
      }));

      await saveFeed(
        filter,
        selectedTribe,
        pageNumber,
        newItems
      );

      pagesCache.current[pageNumber] = newItems;
      
      const merged = Object.keys(pagesCache.current)
        .map(Number)
        .sort((a, b) => a - b)
        .flatMap(page => pagesCache.current[page]);
  
      if (replace || pageNumber === 1) {
        const saved = sessionStorage.getItem("new_post");
      
        if (saved) {
          const localPost = JSON.parse(saved);
      
          if (!merged.some(p => p.id === localPost.id)) {
            merged.unshift(localPost);
          }
      
          sessionStorage.removeItem("new_post");
        }
      }
      
      setPosts(merged);
  
      lastPageRef.current = pageNumber;
      setPage(pageNumber);
    } catch (err) {
      console.error(
        "Failed to fetch posts",
        err
      );
      window.dispatchEvent(
        new CustomEvent("network-error", {
            detail: "Failed to fetch posts",
        })
      );
    } finally {
      loadingMoreRef.current = false;
  
      setLoading(false);
      setLoadingMore(false);
      if (initialLoad) {
        setInitialLoad(false);
      }
    }
  };
  
  const incrementPostView = (postId: number) => {

    setPosts((prev: any[]) =>
      prev.map((post: any) =>
        post.id === postId
          ? {
              ...post,
              views_count:
                (post.views_count || 0) + 1
            }
          : post
      )
    );
  };
  
  const refreshFeed = async () => {
    if (loadingMore || loadingMoreRef.current) return;
  
    await clearFeed(
      filter,
      selectedTribe
    );
    await clearReels(filter, selectedTribe);
    hasCacheRef.current = false;
  
    resetFeedState();
    setInitialLoad(true); 
    setLoading(true);
  
    try {
      await apiRequest("api/feed/refresh/", {
        method: "POST"
      });

      await fetchPosts(1, true, true);
    } catch(err) {
      window.dispatchEvent(
        new CustomEvent("network-error", {
            detail: "Couldn't refresh feed",
        })
      );
    } finally {
      setLoading(false);
    }
  };
  
  const loadMore = async () => {
    if (
      loading ||
      loadingMore ||
      !hasMore ||
      reachedLimit ||
      loadingMoreRef.current ||
      loadingRef.current ||
      !hasMoreRef.current
    ) {
      return;
    }
  
    if (page >= MAX_PAGES) {
      setReachedLimit(true);
      return;
    }
  
    const nextPage = page + 1;
  
    // Show cached page instantly if available
    const cached = await getFeed(
      filter,
      selectedTribe,
      nextPage
    );
  
    if (cached.length) {
      pagesCache.current[nextPage] = cached;
  
      const merged = Object.keys(pagesCache.current)
        .map(Number)
        .sort((a, b) => a - b)
        .flatMap(page => pagesCache.current[page]);
  
      setPosts(merged);
    }
  
    // Refresh the page from the server
    await fetchPosts(nextPage);
  };

  // --- Fetch tribes user belongs to ---
  const fetchUserTribes = async () => {
    try {
      const data = await apiRequest('api/tribes/');
      setTribes(data);
  
      if (data.length > 0) {
        setSelectedTribe(data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch tribes', err);
    }
  };

  useEffect(() => {
    if (filter === 'all') {
      fetchReels();
    } else {
      setReels([]);
    }
  }, [filter]);

  useEffect(() => {
    if (filter === "tribes") {
        fetchUserTribes();
    } else {
        setTribes([]);
        setSelectedTribe(null);
        setShowAllTribes(false);
    }
  }, [filter]);
  
  useEffect(() => {
    hasCacheRef.current = false;

    resetFeedState();

    fetchPosts(1, true, true);

    if (filter === "all") {
        fetchReels();
    }
  }, [filter]);
  
  useEffect(() => {
    if (filter !== "tribes") return;
    if (!selectedTribe) return;

    hasCacheRef.current = false;

    resetFeedState();

    fetchPosts(1, true, true);

    if (isEntertainment) {
        fetchReels();
    }
  }, [selectedTribe]);
  
  useEffect(() => {
    (async () => {
      const cachedPosts = await getFeed(
        filter,
        selectedTribe,
        1
      );
      const cachedReels = await getReels(filter, selectedTribe);
  
      hasCacheRef.current = cachedPosts.length > 0;

      if (cachedPosts.length) {
        setPosts(cachedPosts);
        setInitialLoad(false);
        setLoading(false);
      }
  
      if (cachedReels.length) {
        setReels(cachedReels);
      }
  
      // Refresh in background
      if (!cachedPosts.length) {
        await fetchPosts(1, true, true);
      } else {
        fetchPosts(1, true, false);
      }
  
      if (filter === "all") {
        fetchReels();
      }
    })();
  }, [filter, selectedTribe]);
  
  useEffect(() => {
    return () => {
      postsRequestIdRef.current++;
      reelsRequestIdRef.current++;
    };
  }, []);

  const handlePostAction = async (
    action: string,
    postId: number
  ) => {
  
    switch (action) {
  
      // EDIT POST
      case 'edit':
        replace(
          `/main/create-post?edit=true&postId=${postId}`
        );
        break;
  
      // DELETE POST
      case 'delete':
        console.log('Delete post', postId);
        break;
  
      // NORMAL REPOST
      case 'repost_normal':
  
        try {
  
          await apiRequest(
            `api/post/${postId}/repost/`,
            {
              method: 'POST',
              data: {
                type: 'normal',
              },
            }
          );
  
          alert("Reposted!");
  
        } catch (err) {
  
          console.error(err);
        }
  
        break;
  
      // QUOTE REPOST
      case 'repost_quote':
  
        replace(`/main/repost/${postId}`);
  
        break;
  
      default:
        break;
    }
  };

  return (
    <div className="mt-24 mb-14 w-full space-y-4">

      {/* Toggle */}
      <div className="flex gap-4 justify-center mb-4">
        <button
          onClick={() => {
            setFilter('all');
            refreshFeed();
          }}
          className={`px-4 py-2 rounded-full font-medium ${
            filter === 'all'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          All Posts
        </button>
        <button
          onClick={() => setFilter('tribes')}
          className={`px-4 py-2 rounded-full font-medium ${
            filter === 'tribes' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Tribes
        </button>
      </div>

      {/* Tribes Selector */}
      {filter === 'tribes' && tribes.length > 0 && (
        <div className="px-4 mb-4 space-y-3">
      
          {/* CHIPS */}
          <div className="flex gap-2 flex-wrap">
      
            {visibleTribes.map((tribe: any) => (
              <button
                key={tribe.id}
                onClick={() => setSelectedTribe(tribe.id)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                  selectedTribe === tribe.id
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-white"
                }`}
              >
                {tribe.name}
              </button>
            ))}
      
            {/* MORE / LESS BUTTON */}
            {tribes.length > 3 && (
              <button
                onClick={() => setShowAllTribes(prev => !prev)}
                className="px-3 py-1 rounded-full bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-white text-sm"
              >
                {showAllTribes ? "Less" : `+${tribes.length - 3} More`}
              </button>
            )}
      
          </div>
      
          {/* DISCOVER BUTTON (ALWAYS BELOW) */}
          <button
            onClick={() => {
              if (selectedTribe)
                push(`/main/tribe/${selectedTribe}`);
            }}
            className="w-full px-3 py-2 rounded-xl font-medium bg-green-500 text-white"
          >
            Discover Communities
          </button>
      
        </div>
      )}
  
      {filter === "all" && suggestedCommunities.length > 0 && (
          <ExploreCommunities
              communities={suggestedCommunities}
          />
      )}

      {/* Posts Feed */}
      {showLoading ? (
        <>
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </>
      ) : !isOnline ? (
        <NoInternetCard />
      ) : posts.length === 0 && !loading ? (
        <div className="text-center text-gray-500 dark:text-gray-400 mt-10">
          No posts yet.
        </div>
      ) : (
        <>
        {filteredPosts.map((post: any, index: number) => {
          if (post.content_type === "short_video") return null;
          return (
            <div key={post.id}>
              {/* REPOST */}
              {post.feed_type === "repost" ? (
              
                <RepostCard
                  repost={post}
                  currentUser={user}
                  handlePostAction={handlePostAction}
                  starredUserIds={starredUserIds}
                />
              
              ) : (
              
                <PostCard
                  post={post}
                  starredUserIds={starredUserIds}
                  setStarredUsers={setStarredUsers}
              
                  showJoinButton={
                    !!post.community_id &&
                    !post.community_joined
                  }
              
                  hideStarButton={
                    (
                      post.community_id &&
                      !post.community_joined
                    ) ||
                    post.user.id === user?.id
                  }
              
                  handlePostAction={handlePostAction}
              
                  canRepost={true}
                  canReport={true}
              
                  showManageButtons={true}
                  showPinnedLabel={false}
              
                  onViewed={() =>
                    incrementPostView(post.id)
                  }
                />
              
              )}

              {/* 🔥 Inject reels after 3rd post */}
              {filter === 'all' &&
               reels.length > 0 &&
               (index + 1) % 5 === 0 && (() => {
              
                 const reelIndex =
                   Math.floor((index + 1) / 5) - 1;
              
                 const reel =
                   reels[reelIndex % reels.length];
              
                 if (!reel) return null;
              
                 return (
                   <ReelCard
                     post={reel}
                     showEntertainment
                   />
                 );
              
               })()}
            </div>
          )
        })}
        </>
      )}

      <div ref={loadMoreRef} className="h-1" />

      {isOnline &&
       !reconnecting &&
       !refreshingFeed &&
       hasMore &&
       !reachedLimit && 
       posts.length > 0 && (
        <div className="flex justify-center py-6">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="px-6 py-3 rounded-xl bg-indigo-600 text-white"
          >
            {loadingMore ? "Loading..." : "Load More"}
          </button>
        </div>
      )}
  
      {(!hasMore || reachedLimit) && (
        <div className="flex flex-col items-center gap-3 py-8">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {reachedLimit
              ? "Refresh to discover more posts"
              : "You've reached the end of the feed"}
          </p>
      
          <button
            onClick={refreshFeed}
            className="px-6 py-3 rounded-xl bg-green-600 text-white"
          >
            Refresh Feed
          </button>
        </div>
      )}

      <AppLink
        href={"/main/create-post?mode=post"
        }
        prefetch={false}
        className="fixed flex items-center justify-center bottom-28 right-6 w-10 h-10 bg-indigo-600 text-white rounded-full shadow-lg text-2xl"
      >
        <Plus />
      </AppLink>
    </div>
  );
}

function NoInternetCard() {
  return (
    <div className="mx-3 mt-4 rounded-2xl border border-red-300 bg-red-50 dark:bg-red-950 dark:border-red-800 p-6 text-center">
      <div className="text-4xl mb-3">
        📡
      </div>

      <h3 className="font-semibold text-gray-700 dark:text-gray-200 text-lg">
        No Internet Connection
      </h3>

      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
        Please check your internet and
        try again.
      </p>
    </div>
  );
}