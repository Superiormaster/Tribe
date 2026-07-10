'use client';

import { useState } from 'react';

export function useChatInputState() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showCaptionBar, setShowCaptionBar] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [mediaTab, setMediaTab] = useState<"photos" | "videos" | "files">("photos");

  // 🆕 IMPORTANT: message draft state (MISSING BEFORE)
  const [text, setText] = useState("");

  const resetInput = () => {
    setText("");
    setSelectedFiles([]);
    setPreviewIndex(null);
    setShowMediaPicker(false);
    setShowCaptionBar(false);
    setMediaTab("photos");
  };

  return {
    // input state
    text,
    setText,

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

    resetInput,
  };
}