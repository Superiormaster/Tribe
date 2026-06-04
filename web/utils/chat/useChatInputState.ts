'use client';

import { useState } from 'react';

export function useChatInputState() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showCaptionBar, setShowCaptionBar] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [mediaTab, setMediaTab] = useState<"photos" | "videos" | "files">("photos");

  return {
    selectedFiles,
    setSelectedFiles,

    showMediaPicker,
    setShowMediaPicker,

    showCaptionBar,
    setShowCaptionBar,

    previewIndex,
    setPreviewIndex,

    mediaTab,
    setMediaTab,
  };
}