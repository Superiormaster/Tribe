'use client';

import { useEffect, useState } from "react";
import { Media } from "@capacitor-community/media";

type MediaItem = {
  path: string;
  webPath: string;
  format: string;
};

export default function MediaGrid({
  onSelect,
}: {
  type: "image" | "video";
  onSelect: (file: File) => void;
}) {
  const [media, setMedia] = useState<MediaItem[]>([]);

  useEffect(() => {
    loadMedia();
  }, []);

  const loadMedia = async () => {
    try {
      const result = await Media.getPhotos({
        limit: 100,
      });

      const mapped = result.photos.map((p: any) => ({
        path: p.path,
        webPath: p.webPath,
        format: "image",
      }));

      setMedia(mapped);
    } catch (err) {
      console.log("Media error:", err);
    }
  };

  const convertToFile = async (webPath: string) => {
    const res = await fetch(webPath);
    const blob = await res.blob();
    return new File([blob], "media.jpg", { type: blob.type });
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      {media.map((item, i) => (
        <div
          key={i}
          onClick={async () => {
            const file = await convertToFile(item.webPath);
            onSelect(file);
          }}
          className="aspect-square bg-gray-800 rounded-lg overflow-hidden"
        >
          <img src={item.webPath} className="w-full h-full object-cover" />
        </div>
      ))}
    </div>
  );
}