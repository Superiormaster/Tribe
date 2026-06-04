'use client';

import { X } from 'lucide-react';

type Props = {
  file: File | null;
  previewUrl: string | null;
  onClear: () => void;
};

export default function CommunityMediaPreview({
  file,
  previewUrl,
  onClear,
}: Props) {
  if (!file || !previewUrl) return null;

  return (
    <div className="relative p-2">
      {file.type.startsWith('image') && (
        <img src={previewUrl} className="w-40 rounded-lg" />
      )}

      {file.type.startsWith('video') && (
        <video src={previewUrl} controls className="w-60 rounded-lg" />
      )}

      {file.type.startsWith('audio') && (
        <audio src={previewUrl} controls />
      )}

      <button
        onClick={onClear}
        className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1"
      >
        <X size={14} />
      </button>
    </div>
  );
}