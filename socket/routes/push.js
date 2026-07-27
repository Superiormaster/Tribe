// routes/push.js

const express = require("express");
const router = express.Router();

const sendNotificationPush =
  require("../servers/pushNotification");

const {
  getUserState,
} = require(
  "../servers/presence"
);

router.post(
  "/notification",
  async (req, res) => {
    try {
      console.log("========== NODE PUSH ==========");
      const {
        token,
        notification,
        recipientId,
      } = req.body;
      console.log("Recipient:", recipientId);
      console.log("Token exists:", !!token);
      console.log("Notification:", notification);

      const state =
        getUserState(recipientId);
      console.log("Presence state:", state);

      if (
        token &&
        (
          state === "background" ||
          state === "offline"
        )
      ) {
        console.log("Sending to Firebase...");
        await sendNotificationPush(
          token,
          notification
        );
        console.log("Firebase send finished.");
      } else {
        console.log("Push skipped.");
        console.log("Reason:");
        console.log("- token:", !!token);
        console.log("- state:", state);
      }
  
      console.log("==============================");

      res.json({
        success: true,
        state,
      });

    } catch (err) {
      console.error("NODE PUSH ERROR");
      console.error(err);

      res.status(500).json({
        success: false,
      });
    }
  }
);

module.exports = router;