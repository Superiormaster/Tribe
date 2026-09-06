import {
useEffect,
useRef,
type RefObject,
} from 'react';

import type { VideoPlayer } from 'expo-video';

import { apiRequest } from '@/utils/api';

type ReelViewProps = {
postId: number;
videoRef: RefObject<VideoPlayer | null>;
onViewed?: (views: number) => void;

/**

* Whether the reel is currently at least 80% visible.
* 
* This should be controlled by the parent FlatList/FlashList
* using itemVisiblePercentThreshold: 80.
  */
  isVisible?: boolean;
  };

export function useReelView({
postId,
videoRef,
onViewed,
isVisible = false,
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
visibleRef.current = isVisible;

if (!isVisible) {
  lastTimeRef.current = 0;
}

}, [isVisible]);

useEffect(() => {

const player = videoRef.current;

if (!player) return;

//-----------------------------------
// Every 250ms measure watch time
//-----------------------------------

const interval = setInterval(async () => {

  if (!visibleRef.current) return;

  if (player.playing === false) return;

  const current = player.currentTime;

  if (current < lastTimeRef.current) {
    lastTimeRef.current = current;
    return;
  }

  const delta = Math.max(
    0,
    current - lastTimeRef.current
  );

  lastTimeRef.current = current;

  watchTimeRef.current += delta;

  if (viewedRef.current) return;

  const duration = player.duration;

  if (!duration || !Number.isFinite(duration)) {
    return;
  }

  const requiredWatch = Math.min(
    2,
    duration * 0.5
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

    const res = await apiRequest(
      `api/post/${postId}/view/`,
      {
        method: 'POST',
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

    lastTimeRef.current =
      player.currentTime;

  } catch (err) {

    console.error(err);

    viewedRef.current = false;

  } finally {

    sendingRef.current = false;

  }

}, 250);

//-----------------------------------
// Flush watch time on unmount
//-----------------------------------

const flush = async () => {

  if (viewedRef.current) return;

  if (watchTimeRef.current <= 0) {
    return;
  }

  try {

    await apiRequest(
      `api/post/${postId}/view/`,
      {
        method: 'POST',
        data: {
          watch_time:
            watchTimeRef.current,

          completed:
            player.currentTime >=
            player.duration,

          skipped:
            player.currentTime <
            player.duration,
        },
      }
    );

  } catch {
    // Ignore flush errors.
  }
};

return () => {

  clearInterval(interval);

  flush();

};

}, [postId, videoRef]);

}