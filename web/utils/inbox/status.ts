import type { MessageStatus } from "@/utils/chat/messageContract";

export const STATUS_PRIORITY: Record<MessageStatus, number> = {
  pending: 0,
  sending: 0,
  failed: 0,
  uploading: 1,
  sent: 1,
  delivered: 2,
  seen: 3,
};

export function updateStatus(
  oldStatus: MessageStatus | undefined,
  newStatus: MessageStatus
): MessageStatus {
  const current = oldStatus ?? "pending";

  return STATUS_PRIORITY[newStatus] >
    STATUS_PRIORITY[current]
      ? newStatus
      : current;
}

export function getStatusIcon(status?: MessageStatus) {
  switch (status) {
    case "uploading":
    case "sending":
    case "pending":
      return "⏳";

    case "sent":
      return "✓";

    case "delivered":
      return "✓✓";

    case "seen":
      return "✓✓";

    case "failed":
      return "⚠️";

    default:
      return "";
  }
}