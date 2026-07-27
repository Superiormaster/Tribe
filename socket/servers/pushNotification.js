const admin = require("./firebase");

async function sendNotificationPush(
  token,
  notification
) {
  try {
    console.log("========== FIREBASE ==========");
    console.log("Token:", token);
    console.log("Notification:", notification);
  
    const id = await admin.messaging().send({
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

    console.log("✅ Firebase sent:", id);
    console.log("==============================");
  } catch (err) {
    console.error("❌ FIREBASE ERROR");
    console.error(err.code);
    console.error(err.message);
    throw err;
  }
}

module.exports =
  sendNotificationPush;