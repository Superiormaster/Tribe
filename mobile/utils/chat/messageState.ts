import type {
  Message,
  MessageStatus,
  MediaStatus,
} from "./messageContract";

export type MessageEvent =
  | "CREATE"
  | "QUEUE"
  | "SEND"
  | "SEND_SUCCESS"
  | "SEND_FAILED"
  | "MEDIA_START"
  | "MEDIA_SUCCESS"
  | "MEDIA_FAILED"
  | "MEDIA_PAUSED"
  | "DELIVERED"
  | "SEEN";

export function transitionMessage(
  message: Message,
  event: MessageEvent
): Message {
  const next = { ...message };

  switch (event) {

    case "CREATE":
      next.status = "pending";

      if (next.files?.length) {
        next.media_status = "pending";
      } else {
        next.media_status = "none";
      }

      return next;

    case "QUEUE":
      next.status = "pending";
      return next;

    case "SEND":
      next.status = "sending";
      return next;

    case "MEDIA_START":
      next.status = "sending";
      next.media_status = "uploading";
      return next;

    case "MEDIA_SUCCESS":
      next.media_status = "uploaded";
      next.upload_progress = 100;
      return next;

    case "MEDIA_FAILED":
      next.media_status = "failed";
      return next;

    case "MEDIA_PAUSED":
      next.media_status = "paused";
      return next;

    case "SEND_SUCCESS":
      next.status = "sent";
      next.media_status =
        next.files?.length
          ? "uploaded"
          : "none";

      next.upload_progress =
        next.files?.length
          ? 100
          : next.upload_progress;

      return next;

    case "SEND_FAILED":
      next.status = "failed";
      return next;

    case "DELIVERED":
      if (
        next.status === "sent" ||
        next.status === "delivered"
      ) {
        next.status = "delivered";
      }

      return next;

    case "SEEN":
      next.status = "seen";
      return next;

    default:
      return next;
  }
}