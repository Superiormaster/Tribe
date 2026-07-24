import { getStatusIcon } from "./status";

export function getOfflinePreview(msg?: any) {
  if (!msg) return "";

  const prefix = "You: ";
  const statusIcon = getStatusIcon(msg.status);

  switch (msg.media_type) {
    case "image":
      return `${statusIcon} ${prefix}📸 Photo`;

    case "video":
      return `${statusIcon} ${prefix}🎥 Video`;

    case "gallery":
      return `${statusIcon} ${prefix}📁 Media`;

    case "audio":
      return `${statusIcon} ${prefix}🎤 Voice message`;

    case "gif":
      return `${statusIcon} ${prefix}📎 GIF`;

    case "sticker":
      return `${statusIcon} ${prefix}😀 Sticker`;

    default:
      return `${statusIcon} ${prefix}${msg.text || msg.encrypted_text || msg.caption || ""}`;
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
    icon: isMine ? getStatusIcon(chat.status) : "",
    isSeen: chat.status === "seen",
    isMine,
    sender: isMine ? "You" : chat.username,
    avatar: chat.avatar ?? null,
    senderId: chat.last_sender_id,
    text,
    type,
  };
}