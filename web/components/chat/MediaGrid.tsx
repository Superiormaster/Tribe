'use client';

import { useEffect, useState } from "react";
import { Media } from "@capacitor-community/media";
import { Capacitor } from "@capacitor/core";

type MediaItem = {
  path?: string;
  file?: File;
  webPath: string;
  format: string;
};

export default function MediaGrid({
  onSelect,
  type,
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
      if (!Capacitor.isNativePlatform()) {
        return;
      }
  
      const result = await Media.getPhotos({
        limit: 100,
      });

      const mapped = result.photos
      .map((p: any) => ({
        path: p.path,
        webPath: p.webPath,
        format: p.mimeType?.startsWith("video/")
          ? "video"
          : "image",
      }))
      .filter(item =>
        type === "video"
          ? item.format === "video"
          : item.format === "image"
      );

      setMedia(mapped);
    } catch (err) {
      console.log("Media error:", err);
    }
  };

  const convertToFile = async (webPath: string) => {
    const res = await fetch(webPath);
    const blob = await res.blob();
    const extension =
      blob.type.split("/")[1] || "bin";
    
    return new File(
      [blob],
      `media.${extension}`,
      {
        type: blob.type,
      }
    );
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      {media.map((item, i) => (
        <div
          key={i}
          onClick={async () => {
            if (item.file) {
              onSelect(item.file);
              return;
            }
          
            const file = await convertToFile(item.webPath);
            onSelect(file);
          }}
          className="aspect-square bg-gray-800 rounded-lg overflow-hidden"
        >
          {item.format === "video" ? (
            <div className="relative w-full h-full">
              <video
                src={item.webPath}
                className="w-full h-full object-cover"
                muted
                playsInline
              />
            
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                ▶
              </div>
            </div>
          ) : (
            <img
              src={item.webPath}
              className="w-full h-full object-cover"
            />
          )}
        </div>
      ))}
    </div>
  );
}