import { useEffect, useRef } from "react";
import { connectCommentsSocket } from "@/lib/comment-socket";

type Props = {
  postId: number;
  onStats?: (data: any) => void;
  onNewComment?: (data: any) => void;
  onCommentDeleted?: (data: any) => void;
  onCommentUpdated?: (data: any) => void;
};

export function usePostSocket({
  postId,
  onStats,
  onNewComment,
  onCommentDeleted,
  onCommentUpdated,
}: Props) {

  // ==========================================
  // CALLBACK REFS
  // ==========================================

  const onStatsRef = useRef(onStats);
  const onNewCommentRef = useRef(onNewComment);
  const onCommentDeletedRef = useRef(onCommentDeleted);
  const onCommentUpdatedRef = useRef(onCommentUpdated);


  // ==========================================
  // KEEP REFS UPDATED
  // ==========================================

  useEffect(() => {
    onStatsRef.current = onStats;
  }, [onStats]);

  useEffect(() => {
    onNewCommentRef.current = onNewComment;
  }, [onNewComment]);

  useEffect(() => {
    onCommentDeletedRef.current = onCommentDeleted;
  }, [onCommentDeleted]);

  useEffect(() => {
    onCommentUpdatedRef.current = onCommentUpdated;
  }, [onCommentUpdated]);


  // ==========================================
  // WEBSOCKET
  // ==========================================

  useEffect(() => {
    let ws: WebSocket | null = null;
    let cancelled = false;

    console.log(
      "[COMMENT WS] MOUNT:",
      postId
    );

    (async () => {
      try {
        const socket =
          await connectCommentsSocket(postId);

        if (!socket) {
          return;
        }

        if (cancelled) {
          socket.close();
          return;
        }

        ws = socket;

        ws.onmessage = (event) => {
          try {
            const data =
              JSON.parse(event.data);

            switch (data.type) {

              case "post_stats":
                onStatsRef.current?.(data);
                break;

              case "new_comment":
                onNewCommentRef.current?.(data);
                break;

              case "comment_deleted":
                onCommentDeletedRef.current?.(data);
                break;

              case "comment_updated":
                onCommentUpdatedRef.current?.(data);
                break;

            }

          } catch (error) {
            console.error(
              "[COMMENT WS] Failed to parse message:",
              error
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
    })();

    return () => {

      cancelled = true;

      console.log(
        "[COMMENT WS] CLEANUP:",
        postId
      );

      if (ws) {
        ws.close();
        ws = null;
      }

    };

  }, [postId]);
}