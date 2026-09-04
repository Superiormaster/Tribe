const { messaging } = require("./firebase");
 
function getNotificationImage(notification) {

  if (
    notification.type === "recommendation"
  ) {

    if (
      notification.recommendationType === "people"
    ) {
      return (
        notification.avatar || ""
      );
    }

    if (
      notification.recommendationType === "post"
    ) {
      return (
        notification.thumbnail || ""
      );
    }

    if (
      notification.recommendationType === "community"
    ) {
      return (
        notification.communityCover || ""
      );
    }

    return "";
  }

  if (
    notification.thumbnail
  ) {
    return notification.thumbnail;
  }

  return "";
}

async function sendNotificationPush(
  token,
  notification
) {

  try {

    const link =
      notification.link ||
      "/main/notifications";

    const avatar =
      notification.avatar || "";

    const image =
      getNotificationImage(
        notification
      );

    const message = {

      token,

      notification: {

        title:
          notification.title ||
          "Tribe",

        body:
          notification.body ||
          "",

        ...(image
          ? {
              image: image,
            }
          : {}),
      },

      data: {

        type:
          notification.type ||
          "",

        notificationId:
          String(
            notification.id ||
            ""
          ),

        recommendationType:
          notification.recommendationType ||
          "",

        postId:
          String(
            notification.postId ||
            ""
          ),

        userId:
          String(
            notification.userId ||
            ""
          ),

        username:
          notification.username ||
          "",

        /*
         * This is the LEFT-SIDE AVATAR.
         */
        avatar:
          avatar,

        thumbnail:
          notification.thumbnail ||
          "",

        communityId:
          String(
            notification.communityId ||
            ""
          ),

        communityName:
          notification.communityName ||
          "",

        communityCover:
          notification.communityCover ||
          "",

        link,
      },

      android: {

        notification: {

          channelId:
            "notifications",

          ...(image
            ? {
                imageUrl: image,
              }
            : {}),
        },
      },

      webpush: {

        notification: {

          icon:
            avatar ||
            "/icon-192.png",

          ...(image
            ? {
                image: image,
              }
            : {}),
        },

        fcmOptions: {

          link,
        },
      },
    };

    const id =
      await messaging.send(
        message
      );


    console.log(
      "✅ Firebase sent:",
      {
        id,
        type: notification.type,
        recommendationType:
          notification.recommendationType ||
          "",
        avatar,
        image,
        link,
      }
    );


    return id;


  } catch (err) {

    console.error(
      "❌ FIREBASE ERROR"
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
  sendNotificationPush;