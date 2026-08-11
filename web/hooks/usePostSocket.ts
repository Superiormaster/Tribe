import { useEffect } from "react";
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
  useEffect(() => {
    let ws: WebSocket | null = null;
    let cancelled = false;

    (async () => {
      try {
        const socket =
          await connectCommentsSocket(postId);

        if (!socket || cancelled) {
          return;
        }

        ws = socket;

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            switch (data.type) {
              case "post_stats":
                onStats?.(data);
                break;

              case "new_comment":
                onNewComment?.(data);
                break;

              case "comment_deleted":
                onCommentDeleted?.(data);
                break;

              case "comment_updated":
                onCommentUpdated?.(data);
                break;
            }
          } catch (error) {
            console.error(
              "Failed to parse comment socket message:",
              error
            );
          }
        };

        ws.onerror = (error) => {
          console.error(
            "Post comment socket error:",
            error
          );
        };
      } catch (error) {
        if (!cancelled) {
          console.error(
            "Failed to connect post comment socket:",
            error
          );
        }
      }
    })();

    return () => {
      cancelled = true;

      if (ws) {
        ws.close();
        ws = null;
      }
    };
  }, [
    postId,
    onStats,
    onNewComment,
    onCommentDeleted,
    onCommentUpdated,
  ]);
}