// useReelView.ts
import { useEffect, useRef } from "react";
import { apiRequest } from "@/utils/api";

type ReelViewProps = {
  postId: number;
  videoRef?: React.RefObject<HTMLVideoElement>;
  onViewed?: () => void;
};

export const useReelView = ({
  postId,
  videoRef,
  onViewed,
}: ReelViewProps) => {
  const hasViewedRef = useRef(false);

  useEffect(() => {
    const video = videoRef?.current;
    if (!video) return;

    let watchStart = 0;
    let accumulatedWatch = 0;

    const handlePlay = () => {
      watchStart = Date.now();
    };

    const handlePause = () => {
      if (watchStart) {
        accumulatedWatch +=
          (Date.now() - watchStart) / 1000;
    
        watchStart = 0;
      }
    };

    const handleEnded = async () => {
      accumulatedWatch +=
        (Date.now() - watchStart) / 1000;

      await sendView(true);
    };

    const sendView = async (completed = false) => {
      if (hasViewedRef.current) return;

      // minimum 3 seconds watched
      if (accumulatedWatch < 3) return;

      hasViewedRef.current = true;

      try {
        await apiRequest(
          `api/post/${postId}/view/`,
          {
            method: "POST",
            data: {
              watch_time: accumulatedWatch,
              completed,
              skipped: !completed,
            },
          }
        );

        onViewed?.();
      } catch (err) {
        console.error(err);
      }
    };

    const handleVisibility = async () => {
      if (document.hidden) {
        handlePause();
        await sendView(false);
      }
    };

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);

    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );

    return () => {
      handlePause();

      sendView(false);

      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);

      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );
    };
  }, [postId, videoRef, onViewed]);
};