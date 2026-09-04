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


async function sendChatPush(
  token,
  message
) {

  if (!token) {
    throw new Error(
      "Missing FCM token."
    );
  }


  const {
    mediaType,
    body,
    thumbnail,
  } = getMediaPreview(
    message
  );


  const {
    chatType,
    groupType,
    groupId,
    groupKey,
    groupTitle,
  } = getChatGrouping(
    message
  );


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


  const payload = {

    token,


    // =================================
    // FCM DISPLAY NOTIFICATION
    // =================================

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


    // =================================
    // SHARED DATA CONTRACT
    //
    // This is what PWA and future
    // React Native can consume.
    // =================================

    data: {

      type:
        "chat",

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


      // ===============================
      // GROUPING
      // ===============================

      groupKey,

      groupType,

      groupId,

      groupTitle,


      // ===============================
      // COMMUNITY
      // ===============================

      communityId,

      communityName:
        message.communityName || "",

      communityCover:
        message.communityCover || "",
    },


    // =================================
    // ANDROID
    // =================================

    android: {

      notification: {

        channelId:
          "chat_messages",

        ...(thumbnail
          ? {
              imageUrl: thumbnail,
            }
          : {}),

        // DO NOT put groupKey here
        // as collapseKey.
        //
        // groupKey identifies the
        // logical conversation.
      },
    },


    // =================================
    // PWA / WEB
    // =================================

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

        link:
          webLink,
      },
    },
  };


  try {

    const id =
      await messaging.send(
        payload
      );


    console.log(
      "✅ CHAT PUSH SENT:",
      {
        id,
        chatType,
        groupType,
        groupId,
        groupKey,
        messageId,
      }
    );


    return id;

  } catch (err) {

    console.error(
      "❌ CHAT PUSH ERROR"
    );

    console.error(
      err.code
    );

    console.error(
      err.message
    );

    throw err;
  }
}


module.exports =
  sendChatPush;