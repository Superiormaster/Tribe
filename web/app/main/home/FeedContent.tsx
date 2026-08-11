'use client';
import { useState, useRef, useEffect, useContext } from 'react';
import { useNavigation } from "@/utils/useNavigation"
import PostCard from '@/components/PostCard';
import ExploreCommunities from '@/components/ExploreCommunities';
import { Plus } from 'lucide-react'
import ReelCard from '@/components/ReelCard';
import RepostCard from '@/components/repost/RepostCard';
import LoadingScreen from '@/components/LoadingScreen';
import Skeleton from '@/components/Skeleton';
import {
  POST_DELETED_EVENT,
  REPOST_DELETED_EVENT,
  emitRepostDeleted,
} from "@/lib/postEvents";
import {
  removePostFromState,
} from "@/lib/removePostFromState";
import useImagePreloader from "@/hooks/homePage/useImagePreloader";
import { useSuggestedCommunities } from "@/hooks/homePage/useSuggestedCommunities";
import { useTribes } from "@/hooks/homePage/useTribes";
import { useHomeFeed } from "@/hooks/homePage/useHomeFeed";
import { useReconnect } from "@/hooks/homePage/useReconnect";
import { useHomeInitialization } from "@/hooks/homePage/useHomeInitialization";
import { UserContext } from "@/components/UserContext";
import { useNetwork } from "@/components/networkConnection/NetworkContext";
import { apiRequest } from '@/utils/api';
import { deletePostEverywhere } from '@/utils/deletePost';
import { useIsInstalled } from "@/hooks/useIsInstalled";
import toast from 'react-hot-toast';
import AppLink from '@/components/AppLink';
import { REFRESH_HOME_EVENT } from "@/lib/authEvents";
import { saveReels, saveFeed, getFeed, getReels, clearFeed, clearReels } from "@/lib/feedDb";

interface MediaFile {
  thumbnail_url?: string;
  file_url?: string;
  thumbnail?: string;
}

export default function HomePage() {
  const {
    user,
    loadingUser,
    mutedUserIds,
    blockedUserIds,
  } = useContext(UserContext)!;
  const { replace, push } = useNavigation();
  const installed = useIsInstalled();
  const [filter, setFilter] = useState<'all' | 'tribes'>('all');
  const {
    isOnline,
    reconnecting,
    finishReconnect,
  } = useNetwork();
  const [refreshingFeed, setRefreshingFeed] =
    useState(false);
  
  const {
    suggestedCommunities,
    loadingSuggested,
    fetchSuggested,
  } = useSuggestedCommunities(filter);
  
  const {
    tribes,
    selectedTribe,
    setSelectedTribe,
    showAllTribes,
    setShowAllTribes,
    visibleTribes,
    currentTribe,
    loadingTribes,
  } = useTribes(filter);
  
  const {
    posts,
    setPosts,
    reels,
    loading,
    loadingMore,
    initialLoad,
    hasMore,
    page,
    setReels,
    setLoading,
    setInitialLoad,
    hasCacheRef,
    fetchPosts,
    fetchReels,
    resetFeedState,
    reachedLimit,
    feedResponse,
    loadMoreRef,
    
    setStarredUsers,
    starredUsers,

    refreshFeed,
    loadMore,
    removePostEverywhere,
    incrementPostView,
    updateFeedPost,
    insertFeedPost,
    addFeedPost,
    removeFeedPost,
    updateReel,
  } = useHomeFeed({
    filter,
    selectedTribe,
  });
  
  const visiblePosts = posts.filter((post: any) => {
    if (post.content_type === "short_video") {
      return false;
    }
  
    const userId = Number(
      post.user?.id ??
      post.post?.user?.id
    );
  
    // Remove muted and blocked users
    if (mutedUserIds.has(userId)) {
      return false;
    }
  
    if (blockedUserIds.has(userId)) {
      return false;
    }
  
    return true;
  });
  
  useHomeInitialization({
    filter,
    selectedTribe,
    setPosts,
    setReels,
    setLoading,
    setInitialLoad,
    hasCacheRef,
    fetchPosts,
    fetchReels,
  });
  
  useImagePreloader({
    posts,
    reels,
  });
  
  useReconnect({
    isOnline,
    reconnecting,
    finishReconnect,
    filter,
    selectedTribe,
    fetchPosts,
    fetchReels,
    setRefreshingFeed,
  });
  
  useEffect(() => {
    if (loadingUser) return;
    if (!user) return;
  
    const check = async () => {
      try {
        const status = await apiRequest(
          "api/users/onboarding-status/"
        );
  
        if (!status.completed) {
          replace("/auth/profile-setup");
        }
      } catch (err) {
        console.error(err);
      }
    };
  
    check();
  }, [loadingUser, user]);
  
  useEffect(() => {
    if (filter !== "tribes" || !selectedTribe) return;
  
    resetFeedState();
  
    fetchPosts(
      1,
      true,
      true,
      filter,
      selectedTribe
    );
  
    fetchReels();
  }, [selectedTribe]);
  
  useEffect(() => {

    const handlePostDeleted = (event: Event) => {

      const customEvent =
        event as CustomEvent<{
          postId: number;
        }>;
  
      const deletedPostId =
        Number(customEvent.detail?.postId);
  
      if (!deletedPostId) return;
  
      setPosts(prev =>
        removePostFromState(
          prev,
          deletedPostId
        )
      );
  
      // Remove from reels currently displayed
      setReels(prev =>
        prev.filter(
          (reel: any) =>
            Number(reel?.id) !== deletedPostId
        )
      );
    };
  
  
    const handleRepostDeleted = (
      event: Event
    ) => {
  
      const customEvent =
        event as CustomEvent<{
          repostId: number;
        }>;
  
      const repostId =
        Number(
          customEvent.detail?.repostId
        );
  
      if (!repostId) return;
  
      setPosts(prev =>
        prev.filter(
          (post: any) =>
            Number(post.id) !== repostId
        )
      );
    };
  
  
    window.addEventListener(
      POST_DELETED_EVENT,
      handlePostDeleted
    );
  
    window.addEventListener(
      REPOST_DELETED_EVENT,
      handleRepostDeleted
    );
  
  
    return () => {
  
      window.removeEventListener(
        POST_DELETED_EVENT,
        handlePostDeleted
      );
  
      window.removeEventListener(
        REPOST_DELETED_EVENT,
        handleRepostDeleted
      );
  
    };
  
  }, [setPosts, setReels]);

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
      case "delete":

        try {
      
          await deletePostEverywhere(
            postId,
            "post"
          );
    
          await removePostEverywhere(postId);
      
          setPosts(prev =>
            prev.filter((post: any) => {
      
              if (
                Number(post.id) === Number(postId)
              ) {
                return false;
              }
      
              if (
                post.type === "repost" ||
                post.feed_type === "repost"
              ) {
                const originalId =
                  Number(
                    post.post?.id ??
                    post.data?.post?.id ??
                    post.post_id
                  );
      
                if (
                  originalId === Number(postId)
                ) {
                  return false;
                }
              }
      
              return true;
            })
          );
      
          toast.success("Post deleted");
      
        } catch (err) {
      
          console.error(err);
          toast.error("Failed to delete post");
      
        }
      
        break;
  
      case "delete_repost":
        try {
          await deletePostEverywhere(
            postId,
            "repost"
          );
      
          setPosts(prev =>
            prev.filter(
              (post: any) =>
                Number(post.id) !== Number(postId)
            )
          );
      
          toast.success("Repost deleted");
      
        } catch (err) {
          console.error(err);
          toast.error("Failed to delete repost");
        }
      
        break;
  
      // NORMAL REPOST
      case 'repost_normal':
  
        try {
  
          const repost = await apiRequest(
            `api/post/${postId}/repost/`,
            {
              method: 'POST',
              data: {
                type: 'normal',
              },
            }
          );
          toast.success("reposted");
          await updateFeedPost?.(postId, {
            has_reposted: true,
          });

          await addFeedPost(repost);
  
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
  
  const showLoading =
    initialLoad &&
    loading &&
    isOnline;

  console.log(
    "POST IDS",
    posts.map((p) => p.id)
  );
  
  const duplicates = posts.filter(
    (p, i, arr) =>
      arr.findIndex(
        x => x.reactKey === p.reactKey
      ) !== i
  );
  
  console.log("DUPLICATES", duplicates);

  return (
    <div className="mt-24 mb-14 overflow-x-hidden w-full space-y-4">

      {/* Toggle */}
      <div className="flex gap-4 justify-center mb-4">
        <button
          onClick={() => {
            if (filter === "all") {
                refreshFeed();
            } else {
                setFilter("all");
            }
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
        {visiblePosts.map((post: any, index: number) => {
          if (post.content_type === "short_video") return null;
          return (
            <div key={post.reactKey}>
              {/* REPOST */}
              {post.feed_type === "repost" ? (
              
                <RepostCard
                  repost={post}
                  currentUser={user}
                  handlePostAction={handlePostAction}
                  starredUserIds={starredUsers}
                />
              
              ) : (
              
                <PostCard
                  post={post}
                  setPosts={setPosts}
                  updateFeedPost={updateFeedPost}
                  removeFeedPost={removeFeedPost}
                  starredUserIds={starredUsers}
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
                     updateReel={updateReel}
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
        className={`fixed flex items-center justify-center right-6 w-10 h-10 bg-indigo-600 text-white rounded-full shadow-lg text-2xl ${
        installed
          ? "bottom-[calc(env(safe-area-inset-bottom)+7rem)]"
          : "bottom-32"}`}
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