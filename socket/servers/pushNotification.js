const admin = require("./firebase");

async function sendNotificationPush(
  token,
  notification
) {
  await admin.messaging().send({
    token,

    notification: {
      title: notification.title,
      body: notification.body,
    },

    data: {
      type:
        notification.type,

      notificationId:
        String(notification.id),

      postId:
        notification.postId
          ? String(
              notification.postId
            )
          : "",

      userId:
        notification.userId
          ? String(
              notification.userId
            )
          : "",

      thumbnail: notification.thumbnail || "",

      communityCover: notification.communityCover || ""
    },
  });
}

module.exports =
  sendNotificationPush;