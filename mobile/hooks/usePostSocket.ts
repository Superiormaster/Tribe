import {
  useEffect,
  useRef,
} from "react";

import {
  connectCommentsSocket,
} from "@/lib/comment-socket";

type Props = {
  postId: number;

  onStats?: (
    data: any
  ) => void;

  onNewComment?: (
    data: any
  ) => void;

  onCommentDeleted?: (
    data: any
  ) => void;

  onCommentUpdated?: (
    data: any
  ) => void;
};

export function usePostSocket({
  postId,
  onStats,
  onNewComment,
  onCommentDeleted,
  onCommentUpdated,
}: Props) {

  const onStatsRef =
    useRef(onStats);

  const onNewCommentRef =
    useRef(onNewComment);

  const onCommentDeletedRef =
    useRef(onCommentDeleted);

  const onCommentUpdatedRef =
    useRef(onCommentUpdated);

  useEffect(() => {
    onStatsRef.current =
      onStats;
  }, [onStats]);

  useEffect(() => {
    onNewCommentRef.current =
      onNewComment;
  }, [onNewComment]);

  useEffect(() => {
    onCommentDeletedRef.current =
      onCommentDeleted;
  }, [onCommentDeleted]);

  useEffect(() => {
    onCommentUpdatedRef.current =
      onCommentUpdated;
  }, [onCommentUpdated]);

  useEffect(() => {
    let ws: WebSocket | null =
      null;

    let cancelled = false;

    console.log(
      "[COMMENT WS] MOUNT:",
      postId
    );

    const connect =
      async () => {
        try {
          const socket =
            await connectCommentsSocket(
              postId
            );

          if (!socket) {
            return;
          }

          if (cancelled) {
            socket.close();
            return;
          }

          ws = socket;

          ws.onmessage = (
            event
          ) => {
            try {
              const data =
                JSON.parse(
                  event.data
                );

              switch (
                data.type
              ) {

                case "post_stats":
                  onStatsRef
                    .current?.(data);
                  break;

                case "new_comment":
                  onNewCommentRef
                    .current?.(data);
                  break;

                case "comment_deleted":
                  onCommentDeletedRef
                    .current?.(data);
                  break;

                case "comment_updated":
                  onCommentUpdatedRef
                    .current?.(data);
                  break;

                default:
                  break;
              }

            } catch (error) {
              console.error(
                "[COMMENT WS] Failed to parse message:",
                error
              );
            }
          };

          ws.onerror = (
            error
          ) => {
            if (!cancelled) {
              console.error(
                "[COMMENT WS] Socket error:",
                postId,
                error
              );
            }
          };

          ws.onclose = () => {
            if (!cancelled) {
              console.log(
                "[COMMENT WS] Socket closed:",
                postId
              );
            }
          };

        } catch (error) {

          if (!cancelled) {
            console.error(
              "[COMMENT WS] Connection failed:",
              postId,
              error
            );
          }
        }
      };

    connect();

    return () => {
      cancelled = true;

      console.log(
        "[COMMENT WS] CLEANUP:",
        postId
      );

      if (ws) {
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;

        ws.close();

        ws = null;
      }
    };

  }, [postId]);
}