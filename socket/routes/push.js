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
      const {
        token,
        notification,
        recipientId,
      } = req.body;

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
        await sendNotificationPush(
          token,
          notification
        );
      } else {
        console.log("- state:", state);
      }
  
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