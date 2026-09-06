import {
useEffect,
useRef,
} from 'react';

import type { RefObject } from 'react';
import type { VideoPlayer } from 'expo-video';

import { apiRequest } from '@/utils/api';

type VideoViewProps = {
postId: number;
ref: RefObject<VideoPlayer | null>;
onViewed?: (views: number) => void;

  isVisible?: boolean;

  enabled?: boolean;
  };

export const useVideoView = ({
postId,
ref,
onViewed,
isVisible = false,
enabled = true,
}: VideoViewProps) => {

const hasTrackedRef =
useRef(false);

const watchStartRef =
useRef<number | null>(null);

const timerRef =
useRef<ReturnType<typeof setTimeout> | null>(
null
);

const visibleRef =
useRef(false);

useEffect(() => {
visibleRef.current =
enabled && isVisible;
}, [enabled, isVisible]);

useEffect(() => {

if (!enabled) {
  return;
}

const player = ref.current;

if (!player || hasTrackedRef.current) {
  return;
}

if (isVisible) {

  if (!watchStartRef.current) {

    watchStartRef.current =
      Date.now();

    timerRef.current =
      setTimeout(async () => {

        if (!visibleRef.current) {
          return;
        }

        try {

          await apiRequest(
            `api/post/${postId}/view/`,
            {
              method: 'POST',
              data: {
                watch_time: 2.5,
                completed: false,
                skipped: false,
              },
            }
          );

          hasTrackedRef.current =
            true;

          onViewed?.(1);

          watchStartRef.current =
            null;

        } catch (err) {

          console.error(err);

          hasTrackedRef.current =
            false;
        }

      }, 2500);
  }

} else if (
  watchStartRef.current
) {

  const watchTime =
    (
      Date.now() -
      watchStartRef.current
    ) / 1000;

  if (timerRef.current) {
    clearTimeout(
      timerRef.current
    );

    timerRef.current = null;
  }

  const completed =
    watchTime > 8;

  const skipped =
    watchTime < 2.5;

  apiRequest(
    `api/post/${postId}/view/`,
    {
      method: 'POST',
      data: {
        watch_time: watchTime,
        completed,
        skipped,
      },
    }
  ).catch(console.error);

  hasTrackedRef.current =
    true;

  watchStartRef.current =
    null;
}

return () => {

  if (timerRef.current) {
    clearTimeout(
      timerRef.current
    );

    timerRef.current = null;
  }

};

}, [
postId,
ref,
isVisible,
enabled,
onViewed,
]);

  useEffect(() => {

return () => {

  if (
    !enabled ||
    hasTrackedRef.current ||
    !watchStartRef.current
  ) {
    return;
  }

  const watchTime =
    (
      Date.now() -
      watchStartRef.current
    ) / 1000;

  const completed =
    watchTime > 8;

  const skipped =
    watchTime < 2.5;

  apiRequest(
    `api/post/${postId}/view/`,
    {
      method: 'POST',
      data: {
        watch_time: watchTime,
        completed,
        skipped,
      },
    }
  ).catch(console.error);

  hasTrackedRef.current =
    true;

  watchStartRef.current =
    null;
};

}, [postId, enabled]);

};