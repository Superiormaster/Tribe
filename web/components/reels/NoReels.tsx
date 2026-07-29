'use client';

import { Film } from "lucide-react";

export default function NoReels() {
  return (
    <div className="h-dvh w-full bg-black flex items-center justify-center px-6">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white/10">
          <Film className="h-10 w-10 text-white" />
        </div>

        <h2 className="text-2xl font-bold text-white">
          No Reels Yet
        </h2>

        <p className="mt-3 text-gray-400 leading-relaxed">
          There aren't any reels available right now.
          Check back later or be the first to share a reel.
        </p>
      </div>
    </div>
  );
}