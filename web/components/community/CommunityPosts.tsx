'use client';

import { useMemo } from "react";
import PostCard from "@/components/PostCard";
import ReelCard from '@/components/ReelCard';
import Skeleton from '@/components/Skeleton';
import RepostCard from '@/components/repost/RepostCard';
import AppLink from "@/components/AppLink";
import { Users } from "lucide-react";

type Props = {
  posts: any[];
  loading: boolean;
  onToggleCommunityPin?: (postId: number) => void;
  handleJoinCommunity?: (id: number) => void;
  canManage?: boolean;
  currentUser?: any;
  handlePostAction?: (action: string, postId: number) => void;
  
  showRefresh?: boolean;

  loadMore?: () => void;
  hasMore?: boolean;

  refreshFeed?: () => void;
  suggestedCommunities?: any[];
  showSuggestions?: boolean;
  starredUserIds?: Set<number>;
  setStarredUsers?: React.Dispatch<
    React.SetStateAction<Set<number>>
  >;
};

export default function CommunityPosts({
  posts,
  loading,
  currentUser,
  onToggleCommunityPin,
  handleJoinCommunity,
  canManage = false,
  handlePostAction,
  starredUserIds,
  setStarredUsers,
  
  showRefresh = false,
  loadMore,
  hasMore,
  refreshFeed,
  showSuggestions,
  suggestedCommunities,
}: Props) {
  const suggestionsPerBlock = 3;
  
  const orderedPosts = useMemo(() => {
    return [...posts].sort((a, b) => {
  
      // -----------------------------
      // PINNED FIRST
      // -----------------------------
      const aPinned =
        a.community_pinned || false;
  
      const bPinned =
        b.community_pinned || false;
  
      if (aPinned && !bPinned)
        return -1;
  
      if (!aPinned && bPinned)
        return 1;
  
      // -----------------------------
      // PIN ORDER
      // -----------------------------
      if (aPinned && bPinned) {
  
        const aOrder =
          a.community_pin_order || 0;
  
        const bOrder =
          b.community_pin_order || 0;
  
        return aOrder - bOrder;
      }
  
      // -----------------------------
      // TIMESTAMP
      // -----------------------------
      const aTime = a.created_at
        ? new Date(a.created_at).getTime()
        : 0;
  
      const bTime = b.created_at
        ? new Date(b.created_at).getTime()
        : 0;
  
      return bTime - aTime;
  
    });
  }, [posts]);
  
  return (
    <div>
      {orderedPosts.map((item: any, index: number) => (
        <div key={item.id}>

          {item.type === "repost" ? (

            <RepostCard
              repost={item}
              handlePostAction={handlePostAction}
              starredUserIds={starredUserIds}
              canModerateReposts={canManage}
              currentUser={currentUser}
            />
        
          ) : item.content_type === "short_video" ? (
            <ReelCard
              post={item}
            />
          ) : (
            <PostCard
              post={item}
              hideCommunityName
              canPin={canManage}
              onToggleCommunityPin={onToggleCommunityPin}
              showManageButtons={true}
              canDelete={canManage}
              canEdit={canManage || item.user?.id === currentUser?.id}
              starredUserIds={starredUserIds}
              setStarredUsers={setStarredUsers}
              canRepost={!item.community_pinned}
              handlePostAction={handlePostAction}
            />
          )}

          {index % 4 === 3 && showSuggestions && (() => {

            const blockIndex = Math.floor(index / 4);
          
            const communitiesToShow =
              suggestedCommunities?.slice(
                blockIndex * suggestionsPerBlock,
                (blockIndex + 1) * suggestionsPerBlock
              );
          
            if (!communitiesToShow?.length) return null;
          
            return (
              <div className="w-full max-w-full border border-indigo-600 dark:border-white overflow-hidden p-3 bg-gray-200 text-gray-700 dark:text-gray-200 dark:bg-gray-700 mt-5 rounded-xl">
              
                🔥 Suggested Communities
            
                {/* Horizontal Scroll Wrapper */}
                <div className="mt-3 overflow-x-auto min-w-0 overflow-y-hidden">
                  
                  <div className="flex flex-col gap-3 pb-2">
            
                    {communitiesToShow.map((community) => (
                      <div className="flex items-center gap-3 p-3">

                        {/* COMMUNITY AVATAR */}
                        <img
                          src={community.cover_image || "/default-cover.jpg"}
                          alt={community.name}
                          className="
                            w-16
                            h-16
                            rounded-full
                            object-cover
                            border
                            border-indigo-700
                            dark:border-gray-100
                            flex-shrink-0
                          "
                        />
                      
                        {/* RIGHT SIDE */}
                        <div className="flex flex-col flex-1 min-w-0">
                      
                          <AppLink
                            href={`/main/community/${community.id}`}
                            prefetch={false}
                            className="
                              font-semibold
                              text-gray-700
                              dark:text-white
                              truncate
                            "
                          >
                            {community.name}
                          </AppLink>
                      
                          <span className="
                            text-xs
                            opacity-70
                            flex
                            items-center
                            gap-1
                            mt-1
                          ">
                            <Users size={12} />
                            {community.members_count ?? 0} members
                          </span>
                      
                          <button
                            onClick={() =>
                              handleJoinCommunity?.(community.id)
                            }
                            disabled={
                              community.joined ||
                              community.requested ||
                              community.invited
                            }
                            className={`mt-2 w-fit px-3 py-1 rounded-full text-xs font-medium ${
                              community.joined
                                ? "bg-green-300 dark:bg-green-700 text-black dark:text-white"
                                : community.requested
                                ? "bg-yellow-300 dark:bg-yellow-700 text-black dark:text-white"
                                : community.invited
                                ? "bg-purple-300 dark:bg-purple-700 text-black dark:text-white"
                                : "bg-blue-100 dark:bg-blue-700 text-black dark:text-white"
                            }`}
                          >
                            {community.joined
                              ? "Joined"
                              : community.requested
                              ? "Requested"
                              : community.invited
                              ? "Already Invited"
                              : community.join_approval_required
                              ? "Request to Join"
                              : "Join"}
                          </button>
                      
                        </div>
                      
                      </div>
                    ))}
            
                  </div>
                </div>
            
              </div>
            );
          
          })()}

        </div>
      ))}

      {loading && (
        <Skeleton />
      )}
      
      {!showRefresh && hasMore ? (

        <button
          onClick={loadMore}
          className="w-full mt-5 p-3 rounded-xl bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-white"
        >
          Load More
        </button>
  
      ) : (
  
        <button
          onClick={refreshFeed}
          className="w-full flex flex-col mt-5 p-3 rounded-xl bg-indigo-400 dark:bg-indigo-600 text-gray-100 dark:text-white"
        >
          Refresh Feed
          <span>See more Community Posts.</span>
        </button>

      )}

      {!hasMore && !showRefresh && (
        <div className="text-center py-4 text-gray-500">
          No more posts
        </div>
      )}

    </div>
  );
}