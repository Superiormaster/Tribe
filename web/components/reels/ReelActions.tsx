'use client';

import {
    Heart,
    MessageCircle,
    Eye,
    Volume2,
    MoreVertical,
    VolumeX,
} from "lucide-react";

import ShareButton from "@/components/share/ShareButton";
import { useShareSheet } from "@/components/share/ShareContext";
import { formatCount } from '@/utils/formatCount';

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
    onMenuClick: () => void;
}

export default function ReelActions({
    reel,
    muted,
    videoRefs,
    handleLike,
    setOpenCommentsPostId,
    onMenuClick,
}: ReelActionsProps) {

    const { showShare } = useShareSheet();

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
        <>
          {/* Right-side gradient */}
          <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-black/40 via-black/10 to-transparent pointer-events-none z-40" />
        
          {/* Action buttons */}
          <div className="absolute right-3 bottom-6 z-50 flex flex-col items-center gap-4 text-white">

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

              <div className="rounded-full bg-black/25 backdrop-blur-sm p-2"
              style={{
                filter: "drop-shadow(0 2px 6px rgba(0,0,0,.8))",
              }}>
                <Heart
                    className={`w-7 h-7 ${
                        reel.is_liked
                            ? "fill-red-600"
                            : ""
                    }`}
                />
              </div>

              {reel.likes_count > 0 && (
                <span className="text-xs">
                  {formatCount(reel.likes_count)}
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
              <div className="rounded-full bg-black/25 backdrop-blur-sm p-2"
              style={{
                filter: "drop-shadow(0 2px 6px rgba(0,0,0,.8))",
              }}>
                <MessageCircle className="w-7 h-7"/>
              </div>
              {reel.comments_count > 0 && (
                <span className="text-xs">
                  {formatCount(reel.comments_count)}
                </span>
              )}
            </button>

            {/* Views */}
            <div className="flex flex-col items-center">
              <div className="rounded-full bg-black/25 backdrop-blur-sm p-2"
              style={{
                filter: "drop-shadow(0 2px 6px rgba(0,0,0,.8))",
              }}>
                <Eye className="w-7 h-7"/>
              </div>
              {reel.views_count > 0 && (
                <span className="text-xs">
                  {formatCount(reel.views_count)}
                </span>
              )}
            </div>

            {/* Share */}
            <ShareButton
                post={reel}
                vertical
                dark
                onOpen={showShare}
                sharesCount={reel.shares_count}
            />

            {/* Mute */}
            <button
                onClick={toggleMute}
            >
              <div className="rounded-full bg-black/25 backdrop-blur-sm p-2"
              style={{
                filter: "drop-shadow(0 2px 6px rgba(0,0,0,.8))",
              }}>
                {muted
                    ? <VolumeX/>
                    : <Volume2/>
                }
              </div>
            </button>
            
             <button
                onClick={(e) => {
                    e.stopPropagation();
                    onMenuClick();
                }}
                className="rounded-full bg-black/25 backdrop-blur-sm p-2"
                style={{
                filter: "drop-shadow(0 2px 6px rgba(0,0,0,.8))",
              }}
            >
                <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </>
    );
}