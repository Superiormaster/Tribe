'use client';

import { useParams } from "next/navigation";

import CommentsModal from "@/components/CommentsModal";

import { useReels } from "@/reelsHook/useReels";
import { useReelPlayer } from  "@/reelsHook/useReelsPlayer";
import ReelItem from  "@/components/reels/ReelItem";
import NoReels from "@/components/reels/NoReels";
import ReelNetworkStatus from "@/components/reels/ReelNetworkStatus";
import ReelSkeleton from "@/components/reels/ReelSkeleton";

export default function ReelsPage() {
    const params = useParams();
    const reelId = Number(params.id);

    const reelsState = useReels(reelId);

    const player = useReelPlayer({
        reels: reelsState.reels,
        loadMore: reelsState.loadMore,
    });
    const openedPostId = reelsState.openCommentsPostId;
  
    if (
      reelsState.loading &&
      reelsState.reels.length === 0
    ) {
      return (
        <>
          <ReelNetworkStatus />
          <ReelSkeleton />
        </>
      );
    }

    const videoReels = reelsState.reels.filter(
      (reel: any) =>
        reel.media_files?.some(
          (m: any) => m.media_type === "video"
        )
    );
    
    if (videoReels.length === 0) {
      return <NoReels />;
    }

    return (
      <>
        <ReelNetworkStatus />
  
        <div
          ref={player.containerRef}
          className="h-dvh overflow-y-scroll snap-y snap-mandatory bg-black"
        >

            {reelsState.reels.map((reel, index) => (
                <ReelItem
                    key={reel.id}
                    reel={reel}
                    index={index}
                    reels={reelsState.reels}
                    player={player}
                    reelsState={reelsState}
                />
            ))}

            {openedPostId && (
              <CommentsModal
                  postId={openedPostId}
                  onCommentsCountChange={(count) => {
                      reelsState.setReels(prev =>
                          prev.map(reel =>
                              reel.id === openedPostId
                                  ? {
                                        ...reel,
                                        comments_count: count,
                                    }
                                  : reel
                          )
                      );
                  }}
                  onClose={() =>
                      reelsState.setOpenCommentsPostId(null)
                  }
              />
            )}
        </div>
      </>
    );
}