'use client';

import { useState } from "react";
import { Message } from "@/utils/chat/messageContract";

export function usePreview() {
  const [previewIndex, setPreviewIndex] =
    useState<number | null>(null);

  const [previewState, setPreviewState] = useState<{
    files: any[];
    index: number;
    msg: any;
    isMine: boolean;
    onReply?: (msg: Message) => void;
  } | null>(null);

  const isPreviewOpen = previewState !== null;

  return {
    previewIndex,
    setPreviewIndex,

    previewState,
    setPreviewState,

    isPreviewOpen,
  };
}