'use client';

import { useParams } from "next/navigation";

import CommentsModal from "@/components/CommentsModal";

import { useReels } from "@/reelsHook/useReels";
import { useReelPlayer } from  "@/reelsHook/useReelsPlayer";
import ReelItem from  "@/components/reels/ReelItem";

export default function ReelsPage() {
    const params = useParams();
    const reelId = Number(params.id);

    const reelsState = useReels(reelId);

    const player = useReelPlayer({
        reels: reelsState.reels,
        loadMore: reelsState.loadMore,
    });

    return (
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

            {reelsState.openCommentsPostId && (
                <CommentsModal
                    postId={
                        reelsState.openCommentsPostId
                    }
                    onClose={() =>
                        reelsState.setOpenCommentsPostId(
                            null
                        )
                    }
                />
            )}
        </div>
    );
}