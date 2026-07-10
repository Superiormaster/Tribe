// routes/push.js

const express = require("express");
const router = express.Router();

const sendNotificationPush =
  require("../servers/pushNotification");

const {
  isUserOnline,
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

      const online =
        isUserOnline(
          recipientId
        );

      if (!online && token) {
        await sendNotificationPush(
          token,
          notification
        );
      }

      res.json({
        success: true,
      });

    } catch (err) {
      console.error(err);

      res.status(500).json({
        success: false,
      });
    }
  }
);

module.exports = router;