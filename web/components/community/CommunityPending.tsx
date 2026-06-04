'use client';

import PostCard from "@/components/PostCard";

type Props = {
  pendingPosts: any[];
  selectMode: boolean;
  selectedPosts: number[];
  toggleSelect: (id: number) => void;
  setActionType: (type: "approve" | "reject") => void;
  setSelectMode: (v: boolean) => void;
};

export default function CommunityPending({
  pendingPosts,
  selectMode,
  selectedPosts,
  toggleSelect,
  setActionType,
  setSelectMode,
}: Props) {
  return (
    <div className="space-y-4">

      {pendingPosts.map((post) => (
        <div
          key={post.id}
          className="relative"
        >
      
          {post.content_type === "short_video" ? (
      
            <ReelCard
              post={post}
      
              hideCommunityName
      
              showManageButtons={canModerate}
      
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
      
              showManageButtons={canModerate}
              canBulkSelect={selectMode}
              isSelected={selectedPosts.includes(post.id)}
      
              onSelect={toggleSelect}
              onLongPress={() => {
                setSelectMode(true);
                toggleSelect(post.id);
              }}
              setSelectMode={setSelectMode}
            />
      
          )}

          {selectMode && (
            <div className="absolute top-2 right-2 flex gap-2">

              <button
                onClick={() => {
                  setActionType("approve");
                  toggleSelect(post.id);
                }}
                className={`w-8 h-8 rounded-full ${
                  selectedPosts.includes(post.id)
                    ? "bg-green-500"
                    : "bg-gray-500"
                }`}
              >
                ✓
              </button>

              <button
                onClick={() => {
                  setActionType("reject");
                  toggleSelect(post.id);
                }}
                className="w-8 h-8 rounded-full bg-red-500"
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