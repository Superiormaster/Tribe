// useReelView.ts
'use client';

import {
  useEffect,
  RefObject,
  useRef,
} from "react";

import { apiRequest } from "@/utils/api";

type ReelViewProps = {
  postId: number;
  videoRef: RefObject<HTMLVideoElement>;
  onViewed?: (views: number) => void;
};

export function useReelView({
  postId,
  videoRef,
  onViewed,
}: ReelViewProps) {

  // already counted?
  const viewedRef = useRef(false);

  // avoid duplicate requests
  const sendingRef = useRef(false);

  // seconds watched
  const watchTimeRef = useRef(0);

  // last currentTime sampled
  const lastTimeRef = useRef(0);

  // currently visible?
  const visibleRef = useRef(false);

  useEffect(() => {

    const video = videoRef.current;

    if (!video) return;

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
    // Every 250ms measure watch time
    //-----------------------------------

    const interval =
      setInterval(async () => {

        if (!visibleRef.current) return;

        if (video.paused) return;

        if (video.readyState < 2) return;

        const current =
          video.currentTime;
  
        if (current < lastTimeRef.current) {
          lastTimeRef.current = current;
          return;
        }

        const delta =
          Math.max(
            0,
            current - lastTimeRef.current
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

        viewedRef.current = true;

        if (sendingRef.current) return;

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
            res.views_count
          );
  
          watchTimeRef.current = 0;
          lastTimeRef.current = video.currentTime;

        } catch (err) {

          console.error(err);

          viewedRef.current = false;

        } finally {

          sendingRef.current = false;

        }

      }, 250);

    //-----------------------------------
    // Flush watch time on exit
    //-----------------------------------

    const flush = async () => {

      if (viewedRef.current) return;
      if (watchTimeRef.current <= 0)
        return;

      try {

        await apiRequest(
          `api/post/${postId}/view/`,
          {
            method: "POST",
            data: {
              watch_time:
                watchTimeRef.current,
              completed:
                video.ended,
              skipped:
                !video.ended,
            },
          }
        );

      } catch {}

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

  }, [postId]);

}