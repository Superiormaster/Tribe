'use client';

import { useRef, useState } from 'react';

interface Props {
  handleLike: (reel: any) => void;
}

export function useDoubleTapLike({
  handleLike,
}: Props) {
  const lastTapRef = useRef<Record<number, number>>({});

  const [showHeart, setShowHeart] =
    useState<Record<number, boolean>>({});

  const handleDoubleTap = (reel: any) => {
    const now = Date.now();

    const lastTap =
      lastTapRef.current[reel.id] ?? 0;

    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTap < DOUBLE_TAP_DELAY) {
      // ❤️ Show heart animation
      setShowHeart(prev => ({
        ...prev,
        [reel.id]: true,
      }));

      setTimeout(() => {
        setShowHeart(prev => ({
          ...prev,
          [reel.id]: false,
        }));
      }, 700);

      // Auto-like only if not already liked
      if (!reel.is_liked) {
        handleLike(reel);
      }
    }

    lastTapRef.current[reel.id] = now;
  };

  return {
    showHeart,
    handleDoubleTap,
  };
}