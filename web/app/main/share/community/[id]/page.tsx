'use client';

import {
  useEffect,
  useState,
  useRef,
  useCallback,
} from 'react';
import { useParams } from 'next/navigation';
import { apiRequest } from '@/utils/api';
import PostCard from '@/components/PostCard';
import Skeleton from '@/components/Skeleton';
import toast from "react-hot-toast";
import { useNavigation } from "@/utils/useNavigation";

interface Community {
  id: string;
  name: string;
  cover_image: string;
}

export default function CommunitySharePage() {
  const { id: postId } =
  useParams<{ id: string }>();

  const [post, setPost] = useState<any>(null);
  const { back } = useNavigation();
  const [text, setText] = useState('');
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loadingCommunities, setLoadingCommunities] = useState(true);
  const MAX_COMMUNITIES = 10;
  const [postLoading, setPostLoading] = useState(true);
  const [selectedCommunities, setSelectedCommunities] =
  useState<Set<string>>(new Set());
  const loadingRef = useRef(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const res = await apiRequest(
          `api/post/${postId}/`
        );
  
        setPost(res);
      } catch (error) {
        console.error(
          'Failed to fetch post:',
          error
        );
      } finally {
        setPostLoading(false);
      }
    };
  
    if (postId) {
      fetchPost();
    }
  }, [postId]);
  
  const handleShare = async () => {
    if (selectedCommunities.size === 0) {
      return;
    }
  
    try {
      setSharing(true);
  
      const res = await apiRequest(
        `api/post/${postId}/community-share/`,
        {
          method: "POST",
          data: {
            community_ids: Array.from(
              selectedCommunities
            ),
            share_text: text.trim(),
          },
        }
      );
  
      console.log(
        "COMMUNITY SHARE RESPONSE:",
        res
      );
  
      if (res.status === "approved") {
  
        toast.success(
          "Shared successfully"
        );
  
      } else if (res.status === "pending") {
  
        toast.success(
          "Waiting for community approval"
        );
  
      } else if (res.status === "mixed") {
  
        toast.success(
          `Shared to ${res.approved_count} ${
            res.approved_count === 1
              ? "community"
              : "communities"
          }. ${
            res.pending_count
          } waiting for approval.`
        );
  
      } else if (
        res.status === "already_shared"
      ) {
  
        toast.error(
          "Already shared to the selected communities."
        );
      }
  
      back();
  
    } catch (error) {
  
      console.error(
        "Failed to share post:",
        error
      );
  
      toast.error(
        "Failed to share post."
      );
  
    } finally {
  
      setSharing(false);
  
    }
  };
  
  const loadCommunities = useCallback(
    async (pageNumber: number) => {
      if (loadingRef.current) {
        return;
      }
  
      if (pageNumber > 1 && !hasMore) {
        return;
      }
  
      loadingRef.current = true;
  
      if (pageNumber === 1) {
        setLoadingCommunities(true);
      } else {
        setLoadingMore(true);
      }
  
      try {
        const res = await apiRequest(
          `api/communities/joined-communities/?page=${pageNumber}`
        );
  
        console.log("COMMUNITY RESPONSE:", res);
  
        const newCommunities: Community[] =
          Array.isArray(res?.results)
            ? res.results
            : [];
  
        // First page replaces the list.
        // Later pages append to it.
        setCommunities((prev) => {
          if (pageNumber === 1) {
            return newCommunities;
          }
  
          const existingIds = new Set(
            prev.map((community) => community.id)
          );
  
          const uniqueCommunities =
            newCommunities.filter(
              (community) =>
                !existingIds.has(community.id)
            );
  
          return [
            ...prev,
            ...uniqueCommunities,
          ];
        });
  
        const nextExists = Boolean(res?.next);
  
        setHasMore(nextExists);
  
        if (nextExists) {
          setPage(pageNumber + 1);
        }
  
      } catch (error) {
        console.error(
          "Failed to fetch communities:",
          error
        );
      } finally {
        loadingRef.current = false;
        setLoadingCommunities(false);
        setLoadingMore(false);
      }
    },
    [hasMore]
  );
  
  useEffect(() => {
    loadCommunities(1);
  }, [loadCommunities]);
  
  useEffect(() => {
    const element = loadMoreRef.current;

    if (!element) return;
  
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (
          entry.isIntersecting &&
          hasMore &&
          !loadingRef.current
        ) {
          loadCommunities(page);
        }
      },
      {
        rootMargin: "300px",
      }
    );
  
    observer.observe(element);
  
    return () => {
      observer.disconnect();
    };
  }, [
    hasMore,
    page,
    loadCommunities,
  ]);
  
  const toggleCommunity = (communityId: string) => {
    setSelectedCommunities((prev) => {
      const next = new Set(prev);
  
      // Deselect
      if (next.has(communityId)) {
        next.delete(communityId);
        return next;
      }
  
      // Prevent selecting more than 10
      if (next.size >= MAX_COMMUNITIES) {
        toast.error(
          `You can only share to ${MAX_COMMUNITIES} communities at once.`
        );
        return prev;
      }
  
      // Select
      next.add(communityId);
  
      return next;
    });
  };
  
  return (
    <div className="min-h-screen">

      {/* FIXED TOP */}
      <div className="sticky top-16 z-20 bg-white dark:bg-gray-900 border-b dark:border-zinc-800">

        <div className="px-4 py-4">

          <h1 className="text-lg font-semibold text-center text-gray-800 dark:text-white">
            Share to Community
          </h1>

          <textarea
            value={text}
            onChange={(e) =>
              setText(e.target.value)
            }
            placeholder="Write something... (optional)"
            rows={3}
            className="mt-4 w-full resize-none rounded-xl border border-gray-300 dark:border-zinc-700 bg-gray-100 dark:bg-gray-900 p-3 text-sm text-gray-800 dark:text-gray-200 outline-none"
          />

        </div>

      </div>

      {/* ORIGINAL POST */}
      <div className="px-4 py-4">

        <h2 className="mb-3 text-sm font-semibold text-gray-600 dark:text-gray-400">
          Original Post
        </h2>
      
        {postLoading ? (
          <Skeleton />
        ) : post ? (
          <PostCard
            post={post}
            hideStarButton={true}
            showJoinButton={false}
            canRepost={false}
          />
        ) : (
          <p className="py-8 text-center text-sm text-red-500">
            Failed to load the original post.
          </p>
        )}
      
      </div>

      {/* COMMUNITIES */}

      <div className="px-4 pb-24">

        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400">
            Choose communities
          </h2>
        
          <span
            className={`text-xs font-medium ${
              selectedCommunities.size >= MAX_COMMUNITIES
                ? "text-indigo-600"
                : "text-gray-500"
            }`}
          >
            {selectedCommunities.size}/{MAX_COMMUNITIES}
          </span>
        </div>
      
        {loadingCommunities ? (
          <Skeleton />
        ) : communities.length === 0 ? (
      
          <p className="py-8 text-center text-sm text-gray-500">
            You haven't joined any communities yet.
          </p>
      
        ) : (
      
          <div className="space-y-4 pb-20">
      
            {communities.map((community) => (
      
              <button
                key={community.id}
                type="button"
                onClick={() =>
                  toggleCommunity(community.id)
                }
                className={`w-full overflow-hidden rounded-xl border text-left transition ${
                  selectedCommunities.has(community.id)
                    ? "border-indigo-600 ring-2 ring-indigo-500/20"
                    : "border-gray-200 dark:border-zinc-800"
                }`}
              >
      
                {/* COVER */}
      
                <img
                  src={
                    community.cover_image ||
                    "/default-cover.jpg"
                  }
                  alt={community.name}
                  className="h-32 w-full object-cover"
                />
      
                {/* INFO */}
      
                <div className="flex items-center justify-between p-4">
      
                  <div>
                    <h3 className="font-semibold text-gray-800 dark:text-white">
                      {community.name}
                    </h3>
                  </div>
      
                  {selectedCommunities.has(community.id) && (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white">
                      ✓
                    </div>
                  )}
      
                </div>
      
              </button>
      
            ))}
      
          </div>
      
        )}
      
      </div>
  
      {/* SHARE BUTTON */}

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 backdrop-blur">
        <div className="mx-auto max-w-4xl px-4 pt-7 pb-20">
      
          <button
            type="button"
            disabled={
              selectedCommunities.size === 0 ||
              sharing
            }
            onClick={handleShare}
            className={`w-full rounded-xl py-3 text-sm font-semibold transition ${
              selectedCommunities.size > 0 && !sharing
                ? "bg-indigo-600 text-white active:scale-[0.98]"
                : "bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
            }`}
          >
            {sharing
              ? "Sharing..."
              : selectedCommunities.size > 0
                ? `Share to ${selectedCommunities.size} ${
                    selectedCommunities.size === 1
                      ? "community"
                      : "communities"
                  }`
                : "Select a community"}
          </button>
      
        </div>
      </div>
      
      {loadingMore && (
        <div className="py-4">
          <Skeleton />
        </div>
      )}
      
      {hasMore && (
        <div
          ref={loadMoreRef}
          className="h-10"
        />
      )}

    </div>
  );
}