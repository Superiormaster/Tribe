'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PostCard from '@/components/PostCard';
import Skeleton from '@/components/Skeleton';
import { useContext } from "react";
import { UserContext } from "@/components/UserContext";
import { apiRequest } from '@/utils/api';
import Link from 'next/link';

export default function HomePage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [filter, setFilter] = useState<'all' | 'tribes'>('all');
  const [tribes, setTribes] = useState<any[]>([]);
  const [selectedTribe, setSelectedTribe] = useState<number | null>(null);
  const [showAllTribes, setShowAllTribes] = useState(false);
  const visibleTribes = showAllTribes ? tribes : tribes.slice(0, 3);
  const router = useRouter();
  const { user } = useContext(UserContext) || {};
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const currentTribe = tribes.find(t => t.id === selectedTribe);

  const isEntertainment =
  currentTribe?.name?.toLowerCase() === "entertainment";
  const filteredPosts = posts.filter(
    (post) => post.content_type !== "short_video"
  );

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
  
  // --- Fetch posts ---
  const fetchPosts = async (tribeId: number | null = null, pageNumber = 1) => {
    setLoading(true);
    if (loadingMore || !hasMore) return;

    try {
      let url = `api/feed/?page=${pageNumber}`;
      if (filter === "tribes" && selectedTribe) {
        url += `&tribe=${selectedTribe}`;
      } else if (filter === "tribes") {
        // no tribe selected
        setPosts([]);
        setLoading(false);
        return;
      }
      setLoadingMore(true);

      const data = await apiRequest(url);
      const newPosts = data.results ?? data;

      if (newPosts.length === 0) {
        setHasMore(false);
        return;
      }
  
      setPosts(prev => pageNumber === 1 ? newPosts : [...prev, ...newPosts]);
    } catch (err) {
      console.error('Failed to fetch posts', err);
    } finally {
      setLoading(false);
      setInitialLoad(false);
      setLoadingMore(false);
    }
  };
  
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >=
        document.body.offsetHeight - 300
      ) {
        setLoadingMore(true);
        if (!loadingMore && hasMore) {
          setPage(prev => prev + 1);
        }
      }
    };
  
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
    fetchPosts(page);
  }, [page]);
  
  useEffect(() => {
    setPosts([]);
    setPage(1);
    setHasMore(true);
  }, [filter, selectedTribe]);

  return (
    <div className="mt-3 w-full space-y-4">

      {/* Create Post / Profile */}
      {user && (
        <div className="flex items-center gap-3 px-3 pt-2">
          <Link href={`/main/profile/${user.username}`} className="flex items-center gap-2">
            {user.avatar ? (
              <img src={user.avatar} className="w-10 h-10 rounded-full border-2 border-gray-400 dark:border-white object-cover" />
            ) : (
              <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs">
                {user.email?.slice(0, 2).toUpperCase() || '??'}
              </div>
            )}
          </Link>
          <div
            onClick={() => router.push("/main/create-post?mode=post"
            )}
            className="flex-1 p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-pointer"
          >
            What's happening in your tribe?
          </div>
        </div>
      )}

      {/* Toggle */}
      <div className="flex gap-4 justify-center mb-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-full font-medium ${
            filter === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'
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
                router.push(`/main/tribe/${selectedTribe}`);
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
        {filteredPosts.map((post, index) => (
          <div key={post.id}>
            <PostCard post={post} 
            onViewed={() => {
              setPosts(prev =>
                prev.map(p =>
                  p.id === post.id
                    ? { ...p, views_count: (p.views_count || 0) + 1 }
                    : p
                )
              );
            }} />
        
            {/* 🔥 Inject reels after 3rd post */}
            {filter === 'all' && index === 2 && reels.length > 0 && (
              <div className="mt-6">
                <h2 className="font-bold text-lg text-gray-700 dark:text-gray-300 mb-2 px-2">
                  🎬 Entertainment
                </h2>
            
                <div className="flex gap-3 px-2">
                  {(() => {
                    const reel = reels[0];
                    const media = reel?.media_files?.[0];
                    const videoUrl = media?.file_url;
                    const poster = media?.thumbnail_url;
              
                    if (!videoUrl) return null;
                    return (
                      <div
                        key={reel.id}
                        onClick={() => router.push(`/main/reels/${reel.id}`)}
                        className="min-w-[330px] cursor-pointer relative"
                      >
                        <video
                          src={videoUrl}
                          className="w-full h-96 object-cover rounded-xl"
                          muted
                          poster={poster}
                          preload="metadata"
                          playsInline
                        />
              
                        {/* Play overlay */}
                        <div className="absolute inset-0 flex items-center justify-center text-white text-2xl">
                          ▶
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        ))}
        </>
      )}
    </div>
  );
}