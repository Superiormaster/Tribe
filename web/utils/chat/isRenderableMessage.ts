import type { Message } from "@/utils/chat/messageContract";

export function isRenderableMessage(
  message: Message | null | undefined
): message is Message {

  if (!message) {
    return false;
  }

  if (message.is_deleted === true) {
    return true;
  }

  const text =
    typeof message.encrypted_text === "string"
      ? message.encrypted_text.trim()
      : "";

  const caption =
    typeof message.caption === "string"
      ? message.caption.trim()
      : "";

  const hasText =
    text.length > 0 ||
    caption.length > 0;

  const hasMedia =
    Array.isArray(message.media_url) &&
    message.media_url.some(
      value =>
        typeof value === "string" &&
        value.trim().length > 0
    );

  const hasFiles =
    Array.isArray(message.files) &&
    message.files.length > 0;

  const hasThumbnail =
    Array.isArray(message.thumbnail) &&
    message.thumbnail.some(
      value =>
        typeof value === "string" &&
        value.trim().length > 0
    );

  // ⭐ IMPORTANT
  const hasMediaAssets =
    Array.isArray((message as any).media_assets) &&
    (message as any).media_assets.length > 0;

  const hasVoice =
    message.media_type === "audio";

  const hasGif =
    message.media_type === "gif";

  const hasSticker =
    message.media_type === "sticker";

  return (
    hasText ||
    hasMedia ||
    hasFiles ||
    hasThumbnail ||
    hasMediaAssets ||
    hasVoice ||
    hasGif ||
    hasSticker
  );
}

export function hasSendableCommunityContent(
  message: Partial<Message> | null | undefined
): message is Message {
  if (!message) {
    return false;
  }

  if (message.is_deleted === true) {
    return false;
  }

  const text =
    typeof message.encrypted_text === "string"
      ? message.encrypted_text.trim()
      : "";

  const caption =
    typeof message.caption === "string"
      ? message.caption.trim()
      : "";

  if (text.length > 0 || caption.length > 0) {
    return true;
  }

  if (
    Array.isArray(message.media_url) &&
    message.media_url.some(
      value =>
        typeof value === "string" &&
        value.trim().length > 0
    )
  ) {
    return true;
  }

  if (
    Array.isArray(message.files) &&
    message.files.length > 0
  ) {
    return true;
  }

  if (
    Array.isArray(message.thumbnail) &&
    message.thumbnail.some(
      value =>
        typeof value === "string" &&
        value.trim().length > 0
    )
  ) {
    return true;
  }

  if (
    message.media_type === "audio"
  ) {
    return true;
  }

  if (
    message.media_type === "gif"
  ) {
    return true;
  }

  if (
    message.media_type === "sticker"
  ) {
    return true;
  }

  return false;
}