'use client';

import {
  Camera,
  Image,
} from 'lucide-react';

type Props = {
  onCamera: () => void;
  onMedia: () => void;
};

export default function AttachmentSection({
  onCamera,
  onMedia,
}: Props) {
  return (
    <div className="flex items-center justify-center gap-6 py-4">
      <button
        onClick={onCamera}
        className="flex flex-col items-center gap-2"
      >
        <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center">
          <Camera
            size={24}
            className="text-blue-400"
          />
        </div>

        <span className="text-xs text-gray-300">
          Camera
        </span>
      </button>

      <button
        onClick={onMedia}
        className="flex flex-col items-center gap-2"
      >
        <div className="w-14 h-14 rounded-2xl bg-pink-500/20 flex items-center justify-center">
          <Image
            size={24}
            className="text-pink-400"
          />
        </div>

        <span className="text-xs text-gray-300">
          Gallery
        </span>
      </button>
    </div>
  );
}