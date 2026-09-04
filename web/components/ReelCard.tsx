'use client';

import { useNavigation } from "@/utils/useNavigation"
import React from "react";
import { useInView } from '@/components/UseInView'
import { Play } from 'lucide-react';
import toast from "react-hot-toast";

function ReelCard({
  post,
  context = "feed",
  showEntertainment = false,
  isPending = false,
}: any) {
  const { push } = useNavigation();
  const { ref, isVisible } = useInView();
  const isSearch = context === "search";

  const goToReel = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isPending) {
      toast("⏳ This reel is pending approval.");
      return;
    }
    push(`/main/reels/${post.id}`);
  };

  const poster =
    post.media_files?.find(
      (m: any) => m.thumbnail_url
    )?.thumbnail_url ||
    post.media_files?.[0]?.thumbnail_url ||
    '';

  return (
    <div className="space-y-2 mt-5">
      
      {/* FEED LABEL ONLY */}
      {showEntertainment && (
        <h2 className="font-bold text-lg text-gray-700 dark:text-gray-300 px-1">
          🎬 Entertainment
        </h2>
      )}

      <div ref={ref} className="relative w-full h-[500px] overflow-hidden rounded-xl bg-black">
        
         <img
          src={poster}
          alt=""
          className="w-full h-full object-cover"
          loading="lazy"
        />

        {/* PLAY BUTTON */}
        <button
          onClick={goToReel}
          aria-label="Play reel"
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/50 backdrop-blur-md shadow-xl ring-1 ring-white/30 transition-transform duration-200 hover:scale-105 active:scale-95">
            <Play
              className="ml-0.5 h-6 w-6 fill-white text-white"
              strokeWidth={2.5} 
            />
          </div>
        </button>

        {/* CAPTION */}
        {post.caption && (
          <div className="absolute bottom-3 left-3 right-3 text-white text-sm font-medium line-clamp-2">
            {post.caption}
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(ReelCard);