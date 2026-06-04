'use client';

import { useMemo } from "react";
import PostCard from "@/components/PostCard";
import ReelCard from '@/components/ReelCard';
import RepostCard from '@/components/repost/RepostCard';

type Props = {
  posts: any[];
  loading: boolean;
  onToggleCommunityPin?: (postId: number) => void;
  canManage?: boolean;
  handlePostAction?: (action: string, postId: number) => void;
};

export default function CommunityPosts({
  posts,
  loading,
  onToggleCommunityPin,
  canManage = false,
  handlePostAction,
}: Props) {
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
  
  const starredUserIds = useMemo(() => {
  
    return new Set(
  
      posts
        .filter(item =>
          item?.user?.is_starred_by_user
        )
        .map(item => item.user.id)
  
    );
  
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
            />
        
          ) : item.content_type === "short_video" ? (
            <ReelCard
              post={item}
            />
          ) : (
            <PostCard
              post={item}
              hideCommunityName
              hideStarButton
              canPin
              onToggleCommunityPin={onToggleCommunityPin}
              showManageButtons={true}
              canDelete={canManage}
              canEdit={true}
              canRepost={!item.community_pinned}
              handlePostAction={handlePostAction}
            />
          )}

          {index % 4 === 3 && (
            <div className="p-3 bg-gray-700 mt-5 rounded-xl">
              🔥 Suggested Communities
            </div>
          )}

        </div>
      ))}

      {loading && (
        <div className="text-center py-5 text-gray-500">
          Loading...
        </div>
      )}

    </div>
  );
}