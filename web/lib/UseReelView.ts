'use client';

import {
  useEffect,
  RefObject,
  useRef,
} from "react";

import { apiRequest } from "@/utils/api";

type ReelViewProps = {
  postId: number | null;
  videoRef: RefObject<HTMLVideoElement>;
  onViewed?: (views: number) => void;
  enabled?: boolean;
};

export function useReelView({
  postId,
  videoRef,
  onViewed,
  enabled = true,
}: ReelViewProps) {

  const viewedRef = useRef(false);
  const sendingRef = useRef(false);

  const watchTimeRef = useRef(0);
  const lastTimeRef = useRef(0);

  const visibleRef = useRef(false);

  useEffect(() => {
    if (!enabled || !postId) return;

    const video = videoRef.current;

    if (!video) return;

    //-----------------------------------
    // Reset tracking for this post
    //-----------------------------------

    viewedRef.current = false;
    sendingRef.current = false;

    watchTimeRef.current = 0;
    lastTimeRef.current = video.currentTime;

    visibleRef.current = false;

    //-----------------------------------
    // Observe reel visibility
    //-----------------------------------

    const observer =
      new IntersectionObserver(
        ([entry]) => {
          visibleRef.current =
            entry.intersectionRatio >= 0.8;
        },
        {
          threshold: 0.8,
        }
      );

    observer.observe(video);

    //-----------------------------------
    // Measure watch time
    //-----------------------------------

    const interval =
      setInterval(async () => {

        if (!visibleRef.current) return;

        if (video.paused) return;

        if (video.readyState < 2) return;

        const current =
          video.currentTime;

        // Video looped/restarted
        if (
          current <
          lastTimeRef.current
        ) {
          lastTimeRef.current = current;
          return;
        }

        const delta =
          Math.max(
            0,
            current -
              lastTimeRef.current
          );

        lastTimeRef.current =
          current;

        watchTimeRef.current += delta;

        if (viewedRef.current) return;

        if (!video.duration) return;

        const requiredWatch =
          Math.min(
            2,
            video.duration * 0.5
          );

        if (
          watchTimeRef.current <
          requiredWatch
        ) {
          return;
        }

        if (sendingRef.current) return;

        viewedRef.current = true;
        sendingRef.current = true;

        try {

          const res =
            await apiRequest(
              `api/post/${postId}/view/`,
              {
                method: "POST",
                data: {
                  watch_time:
                    watchTimeRef.current,
                  completed: false,
                  skipped: false,
                },
              }
            );

          onViewed?.(
            res?.views_count ?? 1
          );

          watchTimeRef.current = 0;

          lastTimeRef.current =
            video.currentTime;

        } catch (err) {

          console.error(err);

          viewedRef.current = false;

        } finally {

          sendingRef.current = false;

        }

      }, 250);

    //-----------------------------------
    // Flush watch time
    //-----------------------------------

    const flush = async () => {

      if (viewedRef.current) return;

      if (
        watchTimeRef.current <= 0
      ) {
        return;
      }

      const watchTime =
        watchTimeRef.current;

      watchTimeRef.current = 0;

      try {

        await apiRequest(
          `api/post/${postId}/view/`,
          {
            method: "POST",
            data: {
              watch_time: watchTime,
              completed: video.ended,
              skipped: !video.ended,
            },
          }
        );

      } catch (err) {

        console.error(
          "Failed to flush reel view:",
          err
        );

      }

    };

    document.addEventListener(
      "visibilitychange",
      flush
    );

    return () => {

      clearInterval(interval);

      observer.disconnect();

      document.removeEventListener(
        "visibilitychange",
        flush
      );

      flush();

    };

  }, [
    enabled,
    postId,
    videoRef,
    onViewed,
  ]);
}