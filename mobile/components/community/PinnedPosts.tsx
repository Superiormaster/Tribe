'use client';

import PostCard from "@/components/PostCard";

type Props = {
  pinnedPosts: any[];
  canManage?: boolean;
  canPin: boolean;
  onToggleCommunityPin: (id: number) => void;
  handlePostAction?: (action: string, postId: number) => void;
};

export default function PinnedPosts({
  pinnedPosts,
  canManage = false,
  canPin,
  onToggleCommunityPin,
  handlePostAction,
}: Props) {
  if (pinnedPosts.length === 0) return null;

  return (
    <div className="mb-4">

      {pinnedPosts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          hideCommunityName
          hideStarButton
          canPin={canPin}
          showManageButtons={true}
          onToggleCommunityPin={onToggleCommunityPin}
          showPinnedLabel={true}
          canDelete={canManage}
          canEdit={true}
          handlePostAction={handlePostAction}
        />
      ))}

    </div>
  );
}