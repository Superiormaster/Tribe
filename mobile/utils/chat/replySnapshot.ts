// utils/chat/replySnapshot.ts

import type {
  Message,
  ReplyMessage,
} from "@/utils/chat/messageContract";

export function createReplySnapshot(
  message?: Message | null
): ReplyMessage | null {
  if (!message) {
    return null;
  }

  return {
    id: message.id,
    client_id: message.client_id,

    sender: message.sender,
    sender_info: message.sender_info,
    sender_username: message.sender_username,
    sender_avatar: message.sender_avatar,

    encrypted_text: message.encrypted_text,
    caption: message.caption,

    media_type: message.media_type,

    media_url: message.media_url,
    thumbnail: message.thumbnail,
    duration: message.duration,

    media_asset_ids: message.media_asset_ids,

    media_assets: (message as any).media_assets,

    external_media_urls:
      message.external_media_urls,

    files: message.files,

    is_deleted: message.is_deleted,
  };
}

export function getReplyId(
  message: Message | ReplyMessage | null | undefined
): number | null {
  if (!message?.id) {
    return null;
  }

  return Number(message.id);
}