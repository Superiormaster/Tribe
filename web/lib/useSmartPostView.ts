'use client';

import { usePostView } from "@/lib/UsePostView";
import { useVideoView } from "@/lib/useVideoView";
import { useReelView } from "@/lib/UseReelView";

type SmartViewProps = {
  post: any;
  ref: React.RefObject<
    HTMLVideoElement | HTMLDivElement | null
  >;
  onViewed?: (views: number) => void;
};

export const useSmartPostView = ({
  post,
  ref,
  onViewed,
}: SmartViewProps) => {
  const type = post?.content_type;
  const postId = post?.id ?? null;

  const isShortVideo =
    type === "short_video";

  const isVideo =
    type === "video" ||
    type === "long_video";

  const isPost =
    !isShortVideo &&
    !isVideo;

  // IMPORTANT:
  // These hooks must ALWAYS be called in the same order.
  useReelView({
    postId,
    videoRef:
      ref as React.RefObject<HTMLVideoElement>,
    onViewed,
    enabled: isShortVideo,
  });

  useVideoView({
    postId,
    ref:
      ref as React.RefObject<HTMLVideoElement>,
    onViewed,
    enabled: isVideo,
  });

  usePostView({
    postId,
    ref:
      ref as React.RefObject<HTMLElement | null>,
    onViewed,
    enabled: isPost,
  });
};