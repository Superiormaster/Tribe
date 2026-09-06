import { useEffect, useRef } from 'react';
import { waitForAccessToken } from '@/utils/api';

const WS_BASE = process.env.EXPO_PUBLIC_WS_URL;

type FeedType =
| 'global'
| 'community'
| 'profile';

interface UseFeedSocketOptions {
type: FeedType;

communityId?: number;
userId?: number;

onStats?: (data: any) => void;
onNewComment?: (data: any) => void;
onCommentDeleted?: (data: any) => void;
onCommentUpdated?: (data: any) => void;
}

export function useFeedSocket({
type,
communityId,
userId,
onStats,
onNewComment,
onCommentDeleted,
onCommentUpdated,
}: UseFeedSocketOptions) {

const socketRef = useRef<WebSocket | null>(null);

const callbacksRef = useRef({
onStats,
onNewComment,
onCommentDeleted,
onCommentUpdated,
});

useEffect(() => {
callbacksRef.current = {
onStats,
onNewComment,
onCommentDeleted,
onCommentUpdated,
};
}, [
onStats,
onNewComment,
onCommentDeleted,
onCommentUpdated,
]);

useEffect(() => {

let cancelled = false;
let socket: WebSocket | null = null;

const connect = async () => {

  const token = await waitForAccessToken();

  if (cancelled) return;

  if (!token) {
    console.error('[FEED WS] No access token');
    return;
  }

  if (!WS_BASE) {
    console.error(
      '[FEED WS] EXPO_PUBLIC_WS_URL is not configured'
    );
    return;
  }

  let path = '';

  if (type === 'global') {

    path = '/ws/feed/global/';

  } else if (type === 'community') {

    if (!communityId) {
      console.error(
        '[FEED WS] communityId is required'
      );
      return;
    }

    path =
      `/ws/feed/community/${communityId}/`;

  } else if (type === 'profile') {

    if (!userId) {
      console.log(
        '[FEED WS] Waiting for profile userId...'
      );
      return;
    }

    path =
      `/ws/feed/profile/${userId}/`;
  }

  const url =
    `${WS_BASE}${path}?token=${encodeURIComponent(token)}`;

  console.log(
    '[FEED WS] Connecting:',
    url.replace(
      /token=[^&]+/,
      'token=[REDACTED]'
    )
  );

  socket = new WebSocket(url);

  socketRef.current = socket;

  socket.onopen = () => {

    console.log('[FEED WS] OPEN:', {
      type,
      communityId,
      userId,
    });

  };

  socket.onmessage = (event) => {

    try {

      const data = JSON.parse(event.data);

      console.log(
        '[FEED WS] MESSAGE:',
        data
      );

      switch (data.type) {

        case 'post_stats':

          callbacksRef.current.onStats?.(
            data
          );

          break;

        case 'new_comment':

          callbacksRef.current.onNewComment?.(
            data
          );

          break;

        case 'comment_deleted':

          callbacksRef.current.onCommentDeleted?.(
            data
          );

          break;

        case 'comment_updated':

          callbacksRef.current.onCommentUpdated?.(
            data
          );

          break;

        default:

          console.log(
            '[FEED WS] Unknown event:',
            data.type
          );
      }

    } catch (error) {

      console.error(
        '[FEED WS] Invalid message:',
        error
      );

    }

  };

  socket.onerror = (event) => {

    console.error(
      '[FEED WS] ERROR:',
      event
    );

  };

  socket.onclose = (event) => {

    console.log(
      '[FEED WS] CLOSED:',
      {
        type,
        code: event.code,
        reason: event.reason,
        clean: event.wasClean,
      }
    );

    if (
      socketRef.current === socket
    ) {
      socketRef.current = null;
    }

  };
};

connect();

return () => {

  cancelled = true;

  if (socket) {
    socket.close();
  }

  if (
    socketRef.current === socket
  ) {
    socketRef.current = null;
  }

};

}, [
type,
communityId,
userId,
]);

return socketRef;
}