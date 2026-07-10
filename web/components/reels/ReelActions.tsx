'use client';

import {
    Heart,
    MessageCircle,
    Eye,
    Volume2,
    VolumeX,
} from "lucide-react";

import ShareButton from "@/components/ShareButton";

interface ReelActionsProps {
    reel: any;
    muted: boolean;
    videoRefs: React.MutableRefObject<
        Map<number, HTMLVideoElement>
    >;
    handleLike: (reel: any) => void;
    setOpenCommentsPostId: (
        id: number
    ) => void;
}

export default function ReelActions({
    reel,
    muted,
    videoRefs,
    handleLike,
    setOpenCommentsPostId,
}: ReelActionsProps) {

    const toggleMute = (
        e: React.MouseEvent
    ) => {
        e.stopPropagation();
        const newMuted = !muted;
        videoRefs.current.forEach(video => {
            if (video) {
                video.muted = newMuted;
            }
        });

        window.dispatchEvent(
            new CustomEvent(
                "toggle-reel-mute",
                {
                    detail: newMuted,
                }
            )
        );
    };

    return (
        <div className="absolute right-3 bottom-24 flex flex-col items-center gap-4 text-white z-20">

            {/* Like */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    handleLike(reel);
                }}

                className={`flex flex-col items-center gap-1 font-medium ${
                    reel.is_liked
                        ? "text-red-600"
                        : ""
                }`}
            >

                <Heart
                    className={`w-7 h-7 ${
                        reel.is_liked
                            ? "fill-red-600"
                            : ""
                    }`}
                />

                {reel.likes_count > 0 && (
                    <span className="text-xs">
                        {reel.likes_count}
                    </span>
                )}
            </button>

            {/* Comments */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setOpenCommentsPostId(
                        reel.id
                    );
                }}
                className="flex flex-col items-center"
            >
                <MessageCircle className="w-7 h-7"/>
                {reel.comments_count > 0 && (
                    <span className="text-xs">
                        {reel.comments_count}
                    </span>
                )}
            </button>

            {/* Views */}
            <div className="flex flex-col items-center">
                <Eye className="w-7 h-7"/>
                {reel.views_count > 0 && (
                    <span className="text-xs">
                        {reel.views_count}
                    </span>
                )}
            </div>

            {/* Share */}
            <ShareButton
                post={reel}
                vertical
                dark
            />

            {/* Mute */}
            <button
                onClick={toggleMute}
            >
                {muted
                    ? <VolumeX/>
                    : <Volume2/>
                }
            </button>
        </div>
    );
}