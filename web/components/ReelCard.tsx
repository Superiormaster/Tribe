'use client';

import { useNavigation } from "@/utils/useNavigation"
import React from "react";
import { useInView } from '@/components/UseInView'

function ReelCard({
  post,
  context = "feed",
  showEntertainment = false,
}: any) {
  const { push } = useNavigation();
  const { ref, isVisible } = useInView();
  const isSearch = context === "search";

  const goToReel = (e?: React.MouseEvent) => {
    e?.stopPropagation();
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
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="bg-black/60 p-4 rounded-full text-white text-xl">
            ▶
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