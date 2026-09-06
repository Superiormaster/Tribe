import type { RefObject } from 'react';
import type { View } from 'react-native';
import type { VideoPlayer } from 'expo-video';

import { usePostView } from '@/lib/UsePostView';
import { useVideoView } from '@/lib/useVideoView';
import { useReelView } from '@/lib/UseReelView';

type SmartViewProps = {
post: any;

  ref: RefObject<View | VideoPlayer | null>;

onViewed?: (views: number) => void;

  isVisible?: boolean;
  };

export const useSmartPostView = ({
post,
ref,
onViewed,
isVisible = false,
}: SmartViewProps) => {

const postView = usePostView({
postId: post?.id ?? 0,
ref: ref as RefObject<View | null>,
onViewed,
isVisible,
enabled:
!!post &&
post.content_type !== 'short_video' &&
post.content_type !== 'video' &&
post.content_type !== 'long_video',
});

const videoView = useVideoView({
postId: post?.id ?? 0,
ref: ref as RefObject<VideoPlayer | null>,
onViewed,
isVisible,
enabled:
!!post &&
(
post.content_type === 'video' ||
post.content_type === 'long_video'
),
});

const reelView = useReelView({
postId: post?.id ?? 0,
videoRef:
ref as RefObject<VideoPlayer | null>,
onViewed,
isVisible,
enabled:
!!post &&
post.content_type === 'short_video',
});

if (!post) {
return undefined;
}

const type = post.content_type;

if (type === 'short_video') {
return reelView;
}

if (
type === 'video' ||
type === 'long_video'
) {
return videoView;
}

return postView;
};