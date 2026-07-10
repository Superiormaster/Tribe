'use client';

import ProgressiveImage from '@/components/chat/ProgressiveImage';

type MediaItem = {
  url: string;
  thumb?: string;
};

export default function MediaGrid({
  items,
  onOpen,
}: {
  items: MediaItem[];
  onOpen: (index: number) => void;
}) {
  const visible = items.slice(0, 4);
  const remaining = items.length - 4;

  const isVideo = (
    item: MediaItem
  ) =>
    item.url?.includes(".mp4") ||
    item.url?.includes("video");

  return (
    <div className="grid grid-cols-2 gap-1 rounded-2xl w-full h-full overflow-hidden mb-2">
      {visible.map((item, index) => {
        const isLast = index === 3 && items.length > 4;

        return (
          <div
            key={index}
            className="relative cursor-pointer"
            onClick={() => onOpen(index)}
          >
            {isVideo(item) ? (
              <img
                src={item.thumb || item.url}
                className="
                  w-full h-full
                  aspect-square
                  object-cover
                "
              />
            ) : (
              <ProgressiveImage
                src={item.url}
                thumb={item.thumb}
                className="
                  w-full h-full
                  aspect-square
                "
              />
            )}

            {isLast && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xl font-bold">
                +{remaining}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}