'use client';

import { useEffect, useMemo, useRef } from 'react';
import { normalizeMedia } from "@/utils/chat/MediaNormalizer";
import { Trash2 } from "lucide-react";

export default function PreviewViewer({
  files,
  index,
  setIndex,
  onClose,
  onAddFiles,
  onDelete,
}: any) {
  const startX = useRef(0);
  const deltaX = useRef(0);
  const dragging = useRef(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  
  const handleAddClick = () => {
    inputRef.current?.click();
  };
  
  const onStart = (e) => {
    dragging.current = true;
    startX.current =
      e.clientX || e.touches[0].clientX;
  };
  
  const onMove = (e) => {
    if (!dragging.current) return;
  
    deltaX.current =
      (e.clientX || e.touches[0].clientX) -
      startX.current;
  };
  
  const onEnd = () => {
    dragging.current = false;
  
    if (deltaX.current > 80) {
      setIndex((p) => Math.max(p - 1, 0));
    }
  
    if (deltaX.current < -80) {
      setIndex((p) => Math.min(p + 1, files.length));
    }
  
    deltaX.current = 0;
  };
  
  const handleFiles = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newFiles = Array.from(
      e.target.files || []
    );
  
    const filesWithPreview = newFiles.map(
      (file: any) => {
        file.preview = URL.createObjectURL(file);
        return file;
      }
    );
  
    if (filesWithPreview.length) {
      onAddFiles?.(filesWithPreview);
  
      // open the first newly added file
      setIndex(files.length);
    }
  
    e.target.value = "";
  };
  
  const raw = files?.[index];
  const media = useMemo(() => {
    if (!raw) return null;
    return normalizeMedia(raw);
  }, [raw]);
  
  const src = media?.src;
  if (index === null) return null;
  const isAddScreen = index === files.length;

  return (
    <div
      className="fixed inset-0 bg-black z-[999] flex items-center justify-center"
      onTouchStart={onStart}
      onTouchMove={onMove}
      onTouchEnd={onEnd}
      onMouseDown={onStart}
      onMouseMove={onMove}
      onMouseUp={onEnd}
    >
       <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFiles}
      />
  
      <div className="absolute top-4 left-4 right-4 flex justify-between z-50">

        <button
          onClick={onClose}
          className="text-white text-2xl"
        >
          ✕
        </button>
      
        <button
          onClick={() => onDelete(index)}
          className="text-white"
        >
          <Trash2 size={24} />
        </button>
      
      </div>
  
      {files.length > 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white">
          {isAddScreen ? `${files.length + 1} / ${files.length + 1}` : `${index + 1} / ${files.length}`}
        </div>
      )}

      {isAddScreen ? (
        <div className="flex flex-col items-center justify-center text-white">
          <button
            className="w-16 h-16 rounded-full bg-white text-black text-3xl flex items-center justify-center"
            onClick={handleAddClick}
          >
            +
          </button>
      
          <p className="mt-3 text-sm text-gray-300">
            Add more media
          </p>
        </div>
      ) : media?.type === "image" ? (
        <img
          src={src}
          className="max-h-full max-w-full object-contain"
        />
      ) : (
        <video
          key={src}
          src={src}
          controls
          preload="metadata"
          className="max-h-full max-w-full object-contain"
        />
      )}
    </div>
  );
}