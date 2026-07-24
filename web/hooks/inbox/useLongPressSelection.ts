'use client';

import { useRef } from 'react';

interface Options<T> {
  onLongPress: (item: T) => void;
  onClick: (item: T) => void;
  delay?: number;
}

export function useLongPressSelection<T>({
  onLongPress,
  onClick,
  delay = 500,
}: Options<T>) {
  const timer = useRef<NodeJS.Timeout | null>(null);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const moved = useRef(false);
  const didLongPress = useRef(false);

  const bind = (item: T) => ({
    onPointerDown: (e: React.PointerEvent) => {
      didLongPress.current = false;
      moved.current = false;

      touchStartX.current = e.clientX;
      touchStartY.current = e.clientY;

      timer.current = setTimeout(() => {
        if (!moved.current) {
          didLongPress.current = true;
          onLongPress(item);
        }
      }, delay);
    },

    onPointerMove: (e: React.PointerEvent) => {
      const dx = Math.abs(
        e.clientX - touchStartX.current
      );

      const dy = Math.abs(
        e.clientY - touchStartY.current
      );

      if (dx > 5 || dy > 5) {
        moved.current = true;

        if (timer.current) {
          clearTimeout(timer.current);
          timer.current = null;
        }
      }
    },

    onPointerUp: () => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }

      if (didLongPress.current) {
        setTimeout(() => {
          didLongPress.current = false;
        }, 100);

        return;
      }

      onClick(item);
    },

    onPointerCancel: () => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    },
  });

  return { bind };
}