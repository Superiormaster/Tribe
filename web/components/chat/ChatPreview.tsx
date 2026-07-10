'use client';

import { getLowQuality } from "@/utils/media";
import { normalizeMedia } from "@/utils/chat/MediaNormalizer";
import { Reply } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { useNetwork } from '@/components/networkConnection/NetworkContext';

type MediaItem = {
  src: string;
  type: "image" | "video";
  file?: File;
  thumbnail?: string;
  isLocal?: boolean;
};

export default function PreviewViewer({
  files,
  index,
  setIndex,
  onClose,
  msg,
  onReply,
  isMine,
}: any) {
  const {
    isOnline,
    reconnecting,
    finishReconnect,
  } = useNetwork();

  const startX = useRef(0);
  const deltaX = useRef(0);
  const dragging = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastTime = useRef(0);
  
  const media = files
    .map(normalizeMedia)
    .filter(Boolean);
  
  const file = media[index];
  
  if (!file) return null;
  
  const canSwipe = media.length > 1;
  const isGallery = media.length > 1;
  const isSingle = media.length === 1;
  
  const changeIndex = (fn: any) => {
    requestAnimationFrame(() => {
      setIndex(fn);
    });
  };
  
  useEffect(() => {
    const preload = (item?: MediaItem | null) => {
        if (!item) return;

        if (item.type === "image") {
            const img = new Image();
            img.src = item.src;
        }

        if (item.type === "video") {
            const video = document.createElement("video");
            video.preload = "metadata";
            video.src = item.src;
        }
    };

    preload(media[index + 1]);
    preload(media[index - 1]);

  }, [index, media]);
  
  useEffect(() => {

    const video = videoRef.current;

    if (!video) return;

    const waiting = () => {
        lastTime.current = video.currentTime;
    };

    video.addEventListener("waiting", waiting);

    return () => {
        video.removeEventListener("waiting", waiting);
    };

  }, []);
  
  useEffect(() => {

    const resume = () => {

        const video = videoRef.current;

        if (!video) return;

        video.currentTime = lastTime.current;

        video.play().catch(() => {});

        finishReconnect();

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

  }, [finishReconnect]);

  const originalSrc = file.src;

  const isImage = file.type === "image";
  const isVideo = file.type === "video";

  const src =
    !isOnline && isVideo
      ? getLowQuality(originalSrc)
      : originalSrc;

  // ✅ SWIPE LOGIC
  const onStart = (e: any) => {
    dragging.current = true;
    startX.current = e.clientX || e.touches?.[0]?.clientX;
  };

  const onMove = (e: any) => {
    if (!dragging.current || !canSwipe) return;
    deltaX.current =
      (e.clientX || e.touches?.[0]?.clientX) - startX.current;
  };

  const onEnd = () => {
    dragging.current = false;

    const threshold = 80;

    if (deltaX.current > threshold) {
      changeIndex((p: number) => Math.max(p - 1, 0)); // swipe right → previous
    }

    if (deltaX.current < -threshold) {
      changeIndex((p: number) =>
        Math.min(p + 1, files.length - 1)
      ); // swipe left → next
    }

    deltaX.current = 0;
  };

  return (
    <div
      className="fixed inset-0 bg-black z-[999] flex flex-col"
      onTouchStart={onStart}
      onTouchMove={onMove}
      onTouchEnd={onEnd}
      onMouseDown={onStart}
      onMouseMove={onMove}
      onMouseUp={onEnd}
    >
      {/* HEADER */}
      <div className="fixed top-0 left-0 right-0 z-[1000] border-b bg-black/80 text-white px-3 py-3 flex items-center justify-between">
  
        {/* LEFT → COUNTER */}
        <div className="text-sm text-gray-300">
          {files?.length > 1 && (
            <span>
              {index + 1} / {files.length}
            </span>
          )}
        </div>
      
        {/* CENTER → USER */}
        <p className="text-sm font-semibold absolute left-1/2 -translate-x-1/2">
          {isMine ? "You" : msg.username}
        </p>
      
        {/* RIGHT → CLOSE */}
        <button onClick={onClose} className="text-white text-lg">
          ✕
        </button>
      
      </div>

      {/* MEDIA */}
      <div className="flex-1 flex items-center justify-center">
        {isImage && (
          <img
            src={src}
            className="max-h-[80vh] w-full object-contain"
          />
        )}

        {isVideo && (
          <div className="relative">

            <video
                ref={videoRef}
                src={src}
                controls
                className={`
                  w-full max-h-[80vh] object-contain
                  ${!isOnline ? "opacity-60" : ""}
                `}
            />
        
            {reconnecting && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full border-4 border-white border-t-transparent animate-spin" />
                </div>
            )}
        
          </div>
        )}
      </div>

      {/* CAPTION */}
      {msg.caption && (
        <div className="p-3 text-white text-sm bg-black/60">
          {msg.caption}
        </div>
      )}

      {/* REPLY */}
      <button
        onClick={() => {
          onReply?.(msg);
          onClose();
        }}
        className="
          absolute bottom-20 right-4
          bg-white text-black
          px-4 py-2 rounded-full
          flex items-center gap-2
          shadow-lg
        "
      >
        <Reply size={16} />
        Reply
      </button>
    </div>
  );
}