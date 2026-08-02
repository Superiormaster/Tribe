'use client';

import { useEffect, useRef } from 'react';

interface MediaFile {
  thumbnail_url?: string;
  file_url?: string;
}

interface UseImagePreloaderProps {
  posts: any[];
  reels: any[];
}

export default function useImagePreloader({
  posts,
  reels,
}: UseImagePreloaderProps) {
  const preloaded = useRef<Set<string>>(new Set());

  // Preload reel thumbnails
  useEffect(() => {
    reels.slice(0, 3).forEach((reel) => {
      const url = reel.media_files?.[0]?.thumbnail_url;

      if (!url || preloaded.current.has(url)) return;

      preloaded.current.add(url);

      const img = new Image();
      img.loading = "eager";
      img.decoding = "async";
      img.src = url;
    });
  }, [reels]);

  // Preload avatars + post media
  useEffect(() => {
    posts.slice(0, 10).forEach((post) => {
      // Avatar
      const avatar = post.user?.avatar;

      if (avatar && !preloaded.current.has(avatar)) {
        preloaded.current.add(avatar);

        const img = new Image();
        img.loading = "eager";
        img.decoding = "async";
        img.src = avatar;
      }

      // Media
      post.media_files?.forEach((file: MediaFile) => {
        const url = file.thumbnail_url ?? file.file_url;

        if (!url || preloaded.current.has(url)) return;

        preloaded.current.add(url);

        const img = new Image();
        img.loading = "eager";
        img.decoding = "async";
        img.src = url;
      });
    });
  }, [posts]);

  return {
    preloaded,
  };
}