import { getStatus } from "./status";

export function getOfflinePreview(msg?: any) {
  if (!msg) return "";

  const prefix = "You: ";

  switch (msg.media_type) {
    case "image":
      return `${prefix}📸 Photo`;

    case "video":
      return `${prefix}🎥 Video`;

    case "gallery":
      return `${prefix}📁 Media`;

    case "audio":
      return `${prefix}🎤 Voice message`;

    case "gif":
      return `${prefix}📎 GIF`;

    case "sticker":
      return `${prefix}😀 Sticker`;

    default:
      return `${prefix}${msg.text || msg.encrypted_text || msg.caption || ""}`;
  }
}

export function getPreviewData(chat: any, currentUserId: number) {
  const isMine = chat.last_sender_id === currentUserId;

  const type =
    chat.media_type ??
    chat.last_media_type ??
    chat.last_message_type;

  let text =
    chat.text ||
    chat.encrypted_text ||
    "";

  switch (type) {
    case "image":
      text = "📸 Photo";
      break;

    case "video":
      text = "🎥 Video";
      break;

    case "gallery":
      text = "📁 Media";
      break;

    case "audio":
      text = "🎤 Voice message";
      break;

    case "gif":
      text = "📎 GIF";
      break;

    case "sticker":
      text = "😀 Sticker";
      break;
  }

  return {
    status: isMine ? getStatus(chat.status) : undefined,
    isSeen: chat.status === "seen",
    isMine,
    sender: isMine ? "You" : chat.username,
    avatar: chat.avatar ?? null,
    senderId: chat.last_sender_id,
    text,
    type,
  };
}