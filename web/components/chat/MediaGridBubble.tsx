'use client';

import ProgressiveImage from '@/components/chat/ProgressiveImage';
import {
  Play,
  Video,
} from 'lucide-react';

type MediaItem = {
  url: string;
  thumb?: string | null;
  mediaType?: "image" | "video" | "audio";
  duration?: number | null;
};

export default function MediaGrid({
  items,
  onOpen,
}: {
  items: MediaItem[];
  onOpen: (index: number) => void;
}) {
  const visible = items.slice(0, 4);

  const remaining = Math.max(
    items.length - 4,
    0
  );

  const formatDuration = (
    seconds?: number | null
  ) => {
    if (!seconds || seconds <= 0) {
      return null;
    }

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    return `${mins}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const getGridClass = () => {
    return "grid-cols-2";
  };

  return (
    <div
      className={`
        grid
        ${getGridClass()}
        gap-1
        rounded-2xl
        w-full
        overflow-hidden
        mb-2
        aspect-[4/5]
      `}
    >
      {visible.map((item, index) => {
        const isVideo =
          item.mediaType === "video";

        const isPlusTile =
          index === 3 &&
          items.length > 4;

        const threeItemLayout =
          visible.length === 3;

        const itemClass =
          threeItemLayout && index === 0
            ? "row-span-2"
            : "";

        const handleOpen = () => {
          if (isPlusTile) {
            onOpen(3);
            return;
          }

          onOpen(index);
        };

        return (
          <div
            key={`${item.url}-${index}`}
            className={`
              relative
              cursor-pointer
              overflow-hidden
              min-h-0
              ${itemClass}
            `}
            onClick={handleOpen}
          >
            {/* IMAGE */}
            {!isVideo && (
              <ProgressiveImage
                src={item.url}
                thumb={
                  item.thumb ||
                  item.url
                }
                className="
                  w-full
                  h-full
                  object-cover
                "
              />
            )}

            {/* VIDEO */}
            {isVideo && (
              <>
                <video
                  src={item.url}
                  poster={
                    item.thumb ||
                    undefined
                  }
                  muted
                  playsInline
                  preload="metadata"
                  className="
                    w-full
                    h-full
                    object-cover
                  "
                />

                <div
                  className="
                    absolute
                    inset-0
                    flex
                    items-center
                    justify-center
                  "
                >
                  <div
                    className="
                      w-10
                      h-10
                      rounded-full
                      bg-black/50
                      flex
                      items-center
                      justify-center
                    "
                  >
                    <Play
                      size={20}
                      fill="white"
                      className="
                        text-white
                        ml-1
                      "
                    />
                  </div>
                </div>

                {formatDuration(
                  item.duration
                ) && (
                  <div
                    className="
                      absolute
                      bottom-2
                      left-2
                      flex
                      items-center
                      gap-1
                      bg-black/60
                      px-2
                      py-1
                      rounded-full
                      text-white
                    "
                  >
                    <Video size={12} />

                    <span className="text-[10px]">
                      {formatDuration(
                        item.duration
                      )}
                    </span>
                  </div>
                )}
              </>
            )}

            {/* +N */}
            {isPlusTile && (
              <div
                className="
                  absolute
                  inset-0
                  bg-black/60
                  flex
                  items-center
                  justify-center
                  text-white
                  text-xl
                  font-bold
                "
              >
                +{remaining}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}