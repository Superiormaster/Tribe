// lib/useSmartPostView.ts

import { RefObject } from "react";
import { usePostView } from "@/lib/UsePostView";
import { useVideoView } from "@/lib/useVideoView";
import { useReelView } from "@/lib/UseReelView";

type SmartViewProps = {
  post: any;
  ref?: RefObject<any>;
  onViewed?: () => void;
};

export const useSmartPostView = ({
  post,
  ref,
  onViewed,
}: SmartViewProps) => {
  if (!post) return;

  const type = post.content_type;

  // SHORT REELS
  if (type === "short_video") {
    return useReelView({
      postId: post.id,
      ref,
      onViewed,
    });
  }

  // LONG VIDEOS
  if (
    type === "video" ||
    type === "long_video"
  ) {
    return useVideoView({
      postId: post.id,
      ref,
      onViewed,
    });
  }

  // TEXT + IMAGE POSTS
  return usePostView({
    postId: post.id,
    ref,
    onViewed,
  });
};