'use client';

import { useEffect, useRef } from "react";
import { apiRequest } from "@/utils/api";
import type { RefObject } from "react";

type VideoViewProps = {
  postId: number;
  ref: RefObject<HTMLVideoElement>;
  onViewed?: (views: number) => void;
};

export const useVideoView = ({
  postId,
  ref,
  onViewed,
}: VideoViewProps) => {
  const hasTrackedRef = useRef(false);
  const watchStartRef = useRef<number | null>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    const el = ref.current;

    if (!el || hasTrackedRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isVisible = entry.isIntersecting;

        // START WATCH
        if (isVisible && !watchStartRef.current) {
          watchStartRef.current = Date.now();

          // Require at least 2.5s before counting as a view
          timerRef.current = setTimeout(async () => {
            try {
              await apiRequest(`api/post/${postId}/view/`, {
                method: "POST",
                data: {
                  watch_time: 2.5,
                  completed: false,
                  skipped: false,
                },
              });

              hasTrackedRef.current = true;
              onViewed?.(1);
            } catch (err) {
              console.error(err);
            }
          }, 2500);
        }

        // STOP WATCH (user scrolls away)
        if (!isVisible && watchStartRef.current) {
          const watchTime = (Date.now() - watchStartRef.current) / 1000;

          clearTimeout(timerRef.current);

          const completed = watchTime > 8; // normal video completion threshold
          const skipped = watchTime < 2.5;

          apiRequest(`api/post/${postId}/view/`, {
            method: "POST",
            data: {
              watch_time: watchTime,
              completed,
              skipped,
            },
          }).catch(console.error);

          hasTrackedRef.current = true;
          watchStartRef.current = null;
        }
      },
      {
        threshold: 0.6, // 60% visible = intentional watch
      }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      clearTimeout(timerRef.current);
    };
  }, [postId, onViewed]);
};