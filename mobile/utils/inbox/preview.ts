import { getStatus } from "./status";

export type PreviewIconType =
  | "image"
  | "video"
  | "gallery"
  | "audio"
  | "gif"
  | "sticker"
  | null;


export function getOfflinePreview(msg?: any) {
  if (!msg) {
    return {
      text: "",
      icon: null as PreviewIconType,
    };
  }

  const prefix = "You: ";

  switch (msg.media_type) {
    case "image":
      return {
        text: `${prefix}Photo`,
        icon: "image" as PreviewIconType,
      };

    case "video":
      return {
        text: `${prefix}Video`,
        icon: "video" as PreviewIconType,
      };

    case "gallery":
      return {
        text: `${prefix}Media`,
        icon: "gallery" as PreviewIconType,
      };

    case "audio":
      return {
        text: `${prefix}Voice message`,
        icon: "audio" as PreviewIconType,
      };

    case "gif":
      return {
        text: `${prefix}GIF`,
        icon: "gif" as PreviewIconType,
      };

    case "sticker":
      return {
        text: `${prefix}Sticker`,
        icon: "sticker" as PreviewIconType,
      };

    default:
      return {
        text: `${prefix}${
          msg.text ||
          msg.encrypted_text ||
          msg.caption ||
          ""
        }`,
        icon: null as PreviewIconType,
      };
  }
}


function getReplyPreviewText(reply: any): string {
  if (!reply) return "";

  const type =
    reply.media_type ??
    reply.type ??
    "text";

  switch (type) {
    case "image":
      return "Photo";

    case "video":
      return "Video";

    case "gallery":
      return "Media";

    case "audio":
      return "Voice message";

    case "gif":
      return "GIF";

    case "sticker":
      return "Sticker";

    default:
      return (
        reply.text ??
        reply.encrypted_text ??
        reply.caption ??
        ""
      );
  }
}


export function getPreviewData(
  chat: any,
  currentUserId: number
) {
  const isCommunity =
    chat.chat_type === "community" ||
    !!chat.community_id ||
    !!chat.communityId;

  const isMine =
    Number(chat.last_sender_id) ===
    Number(currentUserId);

  const type =
    chat.media_type ??
    chat.last_media_type ??
    chat.last_message_type;

  let text =
    chat.text ||
    chat.encrypted_text ||
    "";

  let previewIcon:
    PreviewIconType = null;

  switch (type) {
    case "image":
      text = "Photo";
      previewIcon = "image";
      break;

    case "video":
      text = "Video";
      previewIcon = "video";
      break;

    case "gallery":
      text = "Media";
      previewIcon = "gallery";
      break;

    case "audio":
      text = "Voice message";
      previewIcon = "audio";
      break;

    case "gif":
      text = "GIF";
      previewIcon = "gif";
      break;

    case "sticker":
      text = "Sticker";
      previewIcon = "sticker";
      break;
  }

  const replyTo =
    chat.reply_to ??
    chat.last_reply_to ??
    chat.reply_snapshot ??
    null;

  return {
    status: isMine
      ? getStatus(chat.status)
      : undefined,

    isSeen:
      chat.status === "seen",

    isMine,

    sender: isMine
      ? "You"
      : chat.username,

    avatar:
      chat.avatar ?? null,

    senderId:
      chat.last_sender_id,

    text,

    type,

    previewIcon,

    replyTo,

    replyPreview:
      getReplyPreviewText(replyTo),

    mentioned:
      isCommunity &&
      chat.mentioned === true,
  };
}