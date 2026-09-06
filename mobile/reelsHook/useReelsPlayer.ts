import {
  useEffect,
  useRef,
  useState,
} from "react";
import { DeviceEventEmitter } from "react-native";
import {
  useVideoPlayer,
  VideoPlayer,
} from "expo-video";
import { useNetwork } from '@/components/networkConnection/NetworkContext';

interface Props {
  reels: any[];
  loadMore: () => void;
  reelId?: number;
}

export function useReelPlayer({
  reels,
  loadMore,
  reelId,
}: Props) {
  const {
    isOnline,
    serverReachable,
  } = useNetwork();

  const containerRef =
    useRef<any>(null);

  const PAGE_SIZE = 5;

  const loadedVideos =
    useRef(new Set<number>());

  const videoRefs =
    useRef(
      new Map<number, VideoPlayer>()
    );

  const progressRefs =
    useRef(
      new Map<number, number>()
    );

  const [muted, setMuted] =
    useState(false);

  const [activeId, setActiveId] =
    useState<number | null>(null);

  /*
   * Register a video player.
   *
   * Your Reel component should call this
   * when a video player is created.
   */
  const registerVideo = (
    id: number,
    player: VideoPlayer
  ) => {
    videoRefs.current.set(
      id,
      player
    );

    player.muted = true;
  };

  /*
   * Remove a video player.
   */
  const unregisterVideo = (
    id: number
  ) => {
    videoRefs.current.delete(id);
    progressRefs.current.delete(id);
  };

  /*
   * Auto play / pause
   *
   * React Native does not have
   * IntersectionObserver.
   *
   * The Reel item should tell this hook
   * when it becomes visible.
   */
  const setVideoVisibility = (
    id: number,
    visible: boolean,
    visibilityRatio = 1
  ) => {
    const video =
      videoRefs.current.get(id);

    if (!video) {
      return;
    }

    if (
      visible &&
      visibilityRatio >= 0.8
    ) {
      video.play();

      setActiveId(id);

      video.muted = muted;
    } else {
      video.pause();

      if (isOnline) {
        try {
          video.currentTime = 0;
        } catch {}
      }

      video.muted = true;
    }
  };

  /*
   * Infinite loading + preload next reel
   */
  useEffect(() => {
    const index =
      reels.findIndex(
        (r) => r.id === activeId
      );

    if (
      index !== -1 &&
      index >= reels.length - 2 &&
      reels.length >= PAGE_SIZE
    ) {
      loadMore();
    }

    const nextId =
      reels[index + 1]?.id;

    const next =
      videoRefs.current.get(
        nextId
      );

    if (
      isOnline &&
      serverReachable &&
      next
    ) {
      try {
        next.pause();

        next.muted = true;

        /*
         * Reset the next video's position.
         * Expo Video handles buffering automatically,
         * so HTML's video.load() is not needed.
         */
        next.currentTime = 0;
      } catch {}
    }
  }, [
    activeId,
    reels,
    loadMore,
    isOnline,
    serverReachable,
  ]);

  /*
   * Resume playback after reconnect
   */
  useEffect(() => {
    const resume = () => {
      if (!activeId) {
        return;
      }

      const video =
        videoRefs.current.get(
          activeId
        );

      if (!video) {
        return;
      }

      try {
        video.play();
      } catch {}
    };

    const subscription =
      DeviceEventEmitter.addListener(
        "network-reconnected",
        resume
      );

    return () => {
      subscription.remove();
    };
  }, [activeId]);

  /*
   * Global mute sync
   */
  useEffect(() => {
    const subscription =
      DeviceEventEmitter.addListener(
        "toggle-reel-mute",
        (value: boolean) => {
          setMuted(value);

          videoRefs.current.forEach(
            (video) => {
              if (!video) {
                return;
              }

              try {
                video.muted = value;
              } catch {}
            }
          );
        }
      );

    return () => {
      subscription.remove();
    };
  }, []);

  /*
   * Toggle mute
   */
  const toggleMute = () => {
    const value = !muted;

    setMuted(value);

    videoRefs.current.forEach(
      (video) => {
        if (!video) {
          return;
        }

        try {
          video.muted = value;
        } catch {}
      }
    );

    DeviceEventEmitter.emit(
      "toggle-reel-mute",
      value
    );
  };

  /*
   * Set active reel manually.
   */
  const activateReel = (
    id: number
  ) => {
    const video =
      videoRefs.current.get(id);

    if (!video) {
      setActiveId(id);
      return;
    }

    videoRefs.current.forEach(
      (player, playerId) => {
        if (playerId === id) {
          try {
            player.muted = muted;
            player.play();
          } catch {}
        } else {
          try {
            player.pause();
            player.muted = true;

            if (isOnline) {
              player.currentTime = 0;
            }
          } catch {}
        }
      }
    );

    setActiveId(id);
  };

  return {
    containerRef,
    videoRefs,
    progressRefs,
    loadedVideos,

    muted,
    activeId,
    setActiveId,

    toggleMute,

    registerVideo,
    unregisterVideo,

    setVideoVisibility,
    activateReel,
  };
}