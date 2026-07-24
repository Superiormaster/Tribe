'use client';

import {
    useEffect,
    useRef,
    useState,
} from "react";
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
    } = useNetwork();

    const containerRef =
        useRef<HTMLDivElement>(null);

    const PAGE_SIZE = 5;
    const loadedVideos = useRef(new Set<number>());
    const videoRefs =
        useRef(
            new Map<number, HTMLVideoElement>()
        );

    const progressRefs =
        useRef(
            new Map<number, number>()
        );

    const [muted, setMuted] =
        useState(false);

    const [activeId, setActiveId] =
        useState<number | null>(null);

    // Auto play / pause
    useEffect(() => {
        const observer =
            new IntersectionObserver(
                entries => {
                    entries.forEach(entry => {

                        const video =
                            entry.target as HTMLVideoElement;

                        const id =
                            Number(
                                video.dataset.id
                            );

                        if (
                            entry.isIntersecting
                        ) {
                            video.play()
                                .catch(() => {});
                            setActiveId(id);
                        } else {
                            video.pause();
                        }
                    });
                },
                {
                    threshold: 0.8,
                }
            );

        videoRefs.current.forEach(video=> {
            if (video) {
                observer.observe(video);
            }
        });
        return () =>
            observer.disconnect();
    }, [reels]);

    // Infinite loading + preload next reel
    useEffect(() => {
        const index =
            reels.findIndex(
                r =>
                    r.id === activeId
            );

        if (
          index !== -1 &&
          index >= reels.length - 2 &&
          reels.length >= PAGE_SIZE
        ) {
          loadMore();
        }

        const next =
            videoRefs.current.get(
                reels[index + 1]?.id
            );
        if (isOnline && next) {
          next.load();
        }
    }, [activeId, reels, loadMore]);

    // Resume playback after reconnect
    useEffect(() => {
      const resume = () => {
          if (!activeId) return;
          const video =
              videoRefs.current.get(activeId);
          video?.play().catch(() => {});
      };
  
      window.addEventListener(
          "network-reconnected",
          resume
      );
  
      return () => {
          window.removeEventListener(
              "network-reconnected",
              resume
          );
      };
    }, [activeId]);

    // Global mute sync
    useEffect(() => {
        const handler = (
            e: any
        ) => {
            setMuted(e.detail);
        };

        window.addEventListener(
            "toggle-reel-mute",
            handler
        );

        return () => {
            window.removeEventListener(
                "toggle-reel-mute",
                handler
            );
        };
    }, []);

    const toggleMute = () => {
        const value =
            !muted;
        setMuted(value);
        videoRefs.current.forEach(
            video => {
                if (video) {
                    video.muted =
                        value;
                }
            }
        );

        window.dispatchEvent(
            new CustomEvent(
                "toggle-reel-mute",
                {
                    detail: value,
                }
            )
        );
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
    };
}