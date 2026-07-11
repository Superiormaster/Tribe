const admin =
  require("./firebase");

async function sendChatPush(
  token,
  message
) {
  let body =
    message.text || "";

  let thumbnail = "";

  switch (
    message.media_type
  ) {
    case "image":
      body = "📷 Photo";
      thumbnail =
        message.media_url;
      break;

    case "video":
      body = "🎥 Video";
      thumbnail =
        message.thumbnail;
      break;

    case "audio":
      body =
        "🎤 Voice message";
      break;

    case "gif":
      body = "🎞 GIF";
      thumbnail =
        message.media_url;
      break;

    case "sticker":
      body =
        "😊 Sticker";
      thumbnail =
        message.media_url;
      break;

    case "gallery":
      body =
        "🖼 Multiple photos";

      thumbnail =
        message.thumbnail ||
        message.media_url;

      break;

    default:
      body =
        message.text || "";
  }

  await admin.messaging().send({
    token,

    notification: {
      title:
        message.senderName,
      body,
      image: thumbnail,
    },

    data: {
      type: "chat",

      chatId:
        String(
          message.chatId
        ),

      senderName:
        message.senderName,

      mediaType:
        message.media_type ||
        "text",

      text:
        message.text || "",

      thumbnail:
        thumbnail || "",
    },

    android: {
      notification: {
        imageUrl:
          thumbnail,
      },
    },

    webpush: {
      notification: {
        icon:
          "/icon-192.png",

        image:
          thumbnail,
      },
    },
  });
}

module.exports =
  sendChatPush;