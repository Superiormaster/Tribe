'use client';

import PostCard from "@/components/PostCard";
import ReelCard from "@/components/ReelCard";

type Props = {
  pendingPosts: any[];
  selectMode: boolean;
  selectedPosts: number[];
  toggleSelect: (id: number) => void;
  setActionType: (type: "approve" | "reject") => void;
  setSelectMode: (v: boolean) => void;
  canModerate: boolean;
  handleModeration: (action: "approve" | "reject", ids: number[]) => void;
};

export default function CommunityPending({
  pendingPosts,
  selectMode,
  selectedPosts,
  toggleSelect,
  setActionType,
  setSelectMode,
  canModerate,
  handleModeration,
}: Props) {
  return (
    <div className="space-y-4 max-w-3xl mx-auto">

      {pendingPosts.map((post) => (
        <div
          key={post.id}
          className="relative w-full max-w-full overflow-hidden"
        >
      
          {post.content_type === "short_video" ? (
      
            <ReelCard
              post={post}
      
              hideCommunityName
      
              showManageButtons={canModerate}
              isPending={true}
      
              canBulkSelect={selectMode}
              isSelected={selectedPosts.includes(post.id)}
      
              onSelect={toggleSelect}
              onLongPress={() => {
                setSelectMode(true);
                toggleSelect(post.id);
              }}
              setSelectMode={setSelectMode}
            />
      
          ) : (

            <PostCard
              post={post}
      
              hideCommunityName
              hideStarButton
              isPending={true}
      
              showManageButtons={canModerate}
              canBulkSelect={selectMode}
              isSelected={selectedPosts.includes(post.id)}
      
              onSelect={toggleSelect}
              onLongPress={() => {
                setSelectMode(true);
                toggleSelect(post.id);
              }}
              setSelectMode={setSelectMode}
              canDelete={canModerate}
              canEdit={canModerate}
              canRepost={false}
    
              onApprove={(id) =>
                handleModeration("approve", [id])
              }
    
              onReject={(id) =>
                handleModeration("reject", [id])
              }
            />
      
          )}

          {selectMode && canModerate && (
            <div className="absolute top-2 right-2 flex gap-2">

              <button
                onClick={() => toggleSelect(post.id)}
                className={`w-8 h-8 rounded-full ${
                  selectedPosts.includes(post.id)
                    ? "bg-green-500"
                    : "bg-gray-500"
                }`}
              >
                ✓
              </button>

              <button
                onClick={() => toggleSelect(post.id)}
                className={`w-8 h-8 rounded-full ${
                  selectedPosts.includes(post.id)
                    ? "bg-red-500"
                    : "bg-gray-500"
                }`}
              >
                ✕
              </button>

            </div>
          )}

        </div>
      ))}

    </div>
  );
}