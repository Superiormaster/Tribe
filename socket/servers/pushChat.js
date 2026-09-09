// servers/pushChat.js

const { messaging } = require("./firebase");

function getMediaPreview(message) {
  const mediaType =
    message.mediaType ||
    message.media_type ||
    "text";

  let body =
    message.body ||
    message.text ||
    message.caption ||
    "New message";

  let thumbnail = "";

  switch (mediaType) {
    case "image":
      body = "📷 Photo";

      thumbnail =
        Array.isArray(message.thumbnail)
          ? message.thumbnail[0] || ""
          : message.thumbnail || "";

      break;

    case "video":
      body = "🎥 Video";

      thumbnail =
        Array.isArray(message.thumbnail)
          ? message.thumbnail[0] || ""
          : message.thumbnail || "";

      break;

    case "audio":
      body = "🎤 Voice message";
      break;

    case "gif":
      body = "🎞 GIF";

      thumbnail =
        Array.isArray(message.thumbnail)
          ? message.thumbnail[0] || ""
          : message.thumbnail || "";

      break;

    case "sticker":
      body = "😊 Sticker";

      thumbnail =
        Array.isArray(message.thumbnail)
          ? message.thumbnail[0] || ""
          : message.thumbnail || "";

      break;

    case "gallery":
      body = "🖼 Multiple photos";

      thumbnail =
        Array.isArray(message.thumbnail)
          ? message.thumbnail[0] || ""
          : message.thumbnail || "";

      break;

    default:
      break;
  }

  return {
    mediaType,
    body,
    thumbnail,
  };
}

function getChatGrouping(message) {
  const chatType =
    message.chatType ||
    (
      message.communityId
        ? "community"
        : "private"
    );

  let groupType;
  let groupId;
  let groupKey;
  let groupTitle;

  if (chatType === "community") {
    groupType = "community";

    groupId =
      String(
        message.groupId ||
        message.communityId ||
        message.chatId ||
        ""
      );

    groupKey =
      message.groupKey ||
      `community:${groupId}`;

    groupTitle =
      message.groupTitle ||
      message.communityName ||
      "Community";
  } else {
    groupType = "private";

    groupId =
      String(
        message.groupId ||
        message.chatId ||
        ""
      );

    groupKey =
      message.groupKey ||
      `private:${groupId}`;

    groupTitle =
      message.groupTitle ||
      message.senderName ||
      "Chat";
  }

  return {
    chatType,
    groupType,
    groupId,
    groupKey,
    groupTitle,
  };
}

async function sendChatPush(token, message) {
  console.log("");
  console.log("========================================");
  console.log("📱 [FCM] CHAT PUSH START");
  console.log("========================================");

  console.log("📱 [FCM] Token exists:", Boolean(token));

  if (!token) {
    console.error(
      "❌ [FCM] Missing FCM token"
    );

    throw new Error(
      "Missing FCM token."
    );
  }

  console.log("📱 [FCM] Message input:", {
    chatId:
      message?.chatId,

    messageId:
      message?.messageId,

    senderId:
      message?.senderId,

    senderName:
      message?.senderName,

    communityId:
      message?.communityId,

    chatType:
      message?.chatType,

    mediaType:
      message?.mediaType ||
      message?.media_type,
  });

  const {
    mediaType,
    body,
    thumbnail,
  } = getMediaPreview(message);

  const {
    chatType,
    groupType,
    groupId,
    groupKey,
    groupTitle,
  } = getChatGrouping(message);

  const chatId =
    String(
      message.chatId || ""
    );

  const messageId =
    String(
      message.messageId || ""
    );

  const senderId =
    String(
      message.senderId || ""
    );

  const communityId =
    String(
      message.communityId || ""
    );

  const webLink =
    groupType === "community"
      ? `/communities/${groupId}/chat`
      : `/chat/${groupId}`;

  console.log("📱 [FCM] Notification prepared:", {
    chatType,
    groupType,
    groupId,
    groupKey,
    groupTitle,
    chatId,
    messageId,
    senderId,
    communityId,
    mediaType,
    body,
    hasThumbnail: Boolean(thumbnail),
    webLink,
  });

  const payload = {
    token,

    notification: {
      title:
        groupTitle ||
        message.senderName ||
        "New message",

      body,

      ...(thumbnail
        ? {
            image: thumbnail,
          }
        : {}),
    },

    data: {
      type: "chat",

      chatType,

      chatId,

      messageId,

      senderId,

      senderName:
        message.senderName || "",

      senderAvatar:
        message.senderAvatar || "",

      mediaType,

      thumbnail:
        thumbnail || "",

      groupKey,

      groupType,

      groupId,

      groupTitle,

      communityId,

      communityName:
        message.communityName || "",

      communityCover:
        message.communityCover || "",
    },

    android: {
      notification: {
        channelId:
          "chat_messages",

        ...(thumbnail
          ? {
              imageUrl: thumbnail,
            }
          : {}),
      },
    },

    webpush: {
      notification: {
        icon:
          message.senderAvatar ||
          "/icon-192.png",

        ...(thumbnail
          ? {
              image: thumbnail,
            }
          : {}),
      },

      fcmOptions: {
        link: webLink,
      },
    },
  };

  console.log(
    "📱 [FCM] Calling Firebase messaging.send()..."
  );

  try {
    const id =
      await messaging.send(payload);

    console.log("");
    console.log(
      "✅✅✅ [FCM] CHAT PUSH SENT SUCCESSFULLY"
    );

    console.log("📱 [FCM] FCM ID:", id);

    console.log("📱 [FCM] Details:", {
      chatType,
      groupType,
      groupId,
      groupKey,
      messageId,
      senderId,
    });

    console.log(
      "========================================"
    );

    return id;

  } catch (err) {
    console.error("");
    console.error(
      "❌❌❌ [FCM] CHAT PUSH FAILED"
    );

    console.error("📱 [FCM] Error code:", err?.code);

    console.error(
      "📱 [FCM] Error message:",
      err?.message
    );

    console.error(
      "📱 [FCM] Error details:",
      err
    );

    console.error(
      "📱 [FCM] Push context:",
      {
        chatType,
        groupType,
        groupId,
        groupKey,
        messageId,
        senderId,
      }
    );

    console.error(
      "========================================"
    );

    throw err;
  }
}

module.exports = sendChatPush;