'use client';
import { useState, useRef, useMemo, useEffect } from 'react';
import { useNavigation } from "@/utils/useNavigation"
import PostCard from '@/components/PostCard';
import ReelCard from '@/components/ReelCard';
import Skeleton from '@/components/Skeleton';
import { useContext } from "react";
import { UserContext } from "@/components/UserContext";
import { apiRequest } from '@/utils/api';
import AppLink from '@/components/AppLink';

export default function HomePage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [reels, setReels] = useState([]);
  const [reachedLimit, setReachedLimit] = useState(false);
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);
  const [filter, setFilter] = useState<'all' | 'tribes'>('all');
  const [tribes, setTribes] = useState<any[]>([]);
  const [selectedTribe, setSelectedTribe] = useState<number | null>(null);
  const [showAllTribes, setShowAllTribes] = useState(false);
  const visibleTribes = showAllTribes ? tribes : tribes.slice(0, 3);
  const { push, replace } = useNavigation();
  const { user } = useContext(UserContext) || {};
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const MAX_PAGES = 5;
  const [loadingMore, setLoadingMore] = useState(false);
  const currentTribe = tribes.find(t => t.id === selectedTribe);

  const isEntertainment =
  currentTribe?.name?.toLowerCase() === "entertainment";
  const filteredPosts = posts.filter(
    (post) => post.content_type !== "short_video"
  );
  
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

  const fetchReels = async () => {
    try {
      let url = 'api/post/?content_type=short_video';
  
      // If inside tribes and it's entertainment → filter by tribe
      if (filter === "tribes" && isEntertainment && selectedTribe) {
        url += `&tribe=${selectedTribe}`;
      }
  
      const data = await apiRequest(url);
      const results = data.results ?? data;
  
      // 🔥 remove empty/broken reels
      const validReels = results.filter((reel: any) =>
        reel?.media_files?.some((m: any) => m?.file_url)
      );
      
      setReels(validReels.slice(0, 1));
    } catch (err) {
      console.error('Failed to fetch reels', err);
    }
  };
  
  const starredUserIds = useMemo(() => {
    return new Set(
      posts
        .filter(p => p.user.is_starred_by_user)
        .map(p => p.user.id)
    );
  }, [posts]);
  
  useEffect(() => {

    let ticking = false
  
    const handleScroll = () => {
  
      if (ticking) return
  
      ticking = true
  
      requestAnimationFrame(() => {
  
        const scrollPosition =
          window.innerHeight + window.scrollY
  
        const threshold =
          document.body.offsetHeight - 1000
  
        if (scrollPosition >= threshold) {
          loadMore()
        }
  
        ticking = false
  
      })
    }
  
    window.addEventListener(
      "scroll",
      handleScroll
    )
  
    return () =>
      window.removeEventListener(
        "scroll",
        handleScroll
      )
  
  }, [
    page,
    loading,
    loadingMore,
    hasMore,
    reachedLimit
  ])
  
  // --- Fetch posts ---
  const fetchPosts = async (pageNumber = 1, replace = false) => {
    if (loadingMore || !hasMore || loadingMoreRef.current) return;

    try {
      if (pageNumber === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      loadingMoreRef.current = true;

      let url = `api/feed/?page=${pageNumber}`;
      if (filter === "tribes" && !selectedTribe) {
        return;
      }

      if (filter === "tribes" && selectedTribe) {
        url += `&tribe=${selectedTribe}`;
      } else if (filter === "tribes") {
        // no tribe selected
        setPosts([]);
        setLoading(false);
        return;
      }

      const data = await apiRequest(url);

      if (!data || data.detail === "Not found.") {
        setHasMore(false);
        return;
      }

      const newPosts = data.results || [];

      if (newPosts.length === 0) {
        setHasMore(false);
        return;
      }
  
      setPosts(prev => {
        if (replace || pageNumber === 1) {
          return newPosts;
        }

        const map = new Map();

        [...prev, ...newPosts].forEach(post => {
          map.set(post.id, post);
        });

        return Array.from(map.values());
      });
  
      setPage(pageNumber)
    } catch (err) {
      console.error('Failed to fetch posts', err);
    } finally {
      loadingMoreRef.current = false;

      setLoading(false);
      setLoadingMore(false);
    }
  };
  
  const incrementPostView = (postId: number) => {

    setPosts(prev =>
      prev.map(post =>
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
  
    setLoading(true);

    setPage(1);

    setHasMore(true);
    setReachedLimit(false);
  
    try {
      await apiRequest("api/feed/refresh/", {
        method: "POST"
      });

      await fetchPosts(1, true);
    } finally {
      setLoading(false);
    }
  };
  
  const loadMore = async () => {

    if (loading || loadingMore || !hasMore || reachedLimit || loadingMoreRef.current || loadingRef.current || !hasMoreRef.current) return;
  
    // LIMIT
    if (page >= MAX_PAGES) {
      setReachedLimit(true);
      return;
    }
  
    const nextPage = page + 1;
  
    await fetchPosts(nextPage);
  
    setPage(nextPage);
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
    if (filter === 'tribes') fetchUserTribes();
  }, [filter]);
  
  useEffect(() => {

    setPosts([])
  
    setPage(1)
  
    setHasMore(true)
    setReachedLimit(false)
  
    fetchPosts(1, true)
  
  }, [filter, selectedTribe])
  
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
    <div className="mt-3 w-full space-y-4">

      {/* Create Post / Profile */}
      {user && (
        <div className="flex items-center gap-3 px-3 pt-2">
          <AppLink href={`/main/profile/${user.username}`}
          prefetch={false}
          className="flex items-center gap-2">
            {user.avatar ? (
              <img src={user.avatar} className="w-10 h-10 rounded-full border-2 border-gray-400 dark:border-white object-cover" />
            ) : (
              <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs">
                {user.email?.slice(0, 2).toUpperCase() || '??'}
              </div>
            )}
          </AppLink>
          <AppLink
            href={"/main/create-post?mode=post"
            }
            prefetch={false}
            className="flex-1 p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-pointer"
          >
            What's happening in your tribe?
          </AppLink>
        </div>
      )}

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
      
            {visibleTribes.map((tribe) => (
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
                className="px-3 py-1 rounded-full bg-black text-white text-sm"
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

      {/* Skeleton */}
      {loading && <><Skeleton /><Skeleton /><Skeleton /></>}

      {/* Posts Feed */}
      {posts.length === 0 && !loading ? (
        <div className="text-center text-gray-500 dark:text-gray-400 mt-10">
          No posts yet.
        </div>
      ) : (
        <>
        {filteredPosts.map((post, index) => {
          if (post.content_type === "short_video") return null;
          return (
            <div key={post.id}>
              {/* REPOST */}
              {post.is_repost ? (
              
                <RepostCard
                  repost={post}
                  handlePostAction={handlePostAction}
                  starredUserIds={starredUserIds}
                />
              
              ) : (
              
                <PostCard
                  post={post}
              
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
               (index + 1) % 5 === 0 && (
                <ReelCard
                  post={reels[0]}
                  showEntertainment
                />
              )}
            </div>
          )
        })}
        </>
      )}
      {hasMore && !reachedLimit ? (
        <div className="flex justify-center py-6">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="px-6 py-3 rounded-xl bg-indigo-600 text-white"
          >
            {loadingMore ? "Loading..." : "Load More"}
          </button>
        </div>
      ) : (
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
    </div>
  );
}