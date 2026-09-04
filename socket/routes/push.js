// routes/push.js

const express = require("express");

const router =
  express.Router();

const sendNotificationPush =
  require("../servers/pushNotification");

const sendChatPush =
  require("../servers/pushChat");

const {
  getUserState,
} = require("../servers/presence");


// ======================================
// NORMAL NOTIFICATION
// ======================================

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
        getUserState(
          recipientId
        );


      console.log(
        "Presence state:",
        state
      );


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

        console.log(
          "Skipping notification push:",
          state
        );
      }


      return res.json({
        success: true,
        state,
      });

    } catch (err) {

      console.error(
        "❌ NODE PUSH ERROR"
      );

      console.error(err);


      return res.status(500).json({
        success: false,
      });
    }
  }
);


// ======================================
// CHAT
// ======================================

router.post(
  "/chat",
  async (req, res) => {

    try {

      const {
        token,
        notification,
      } = req.body;


      if (!token) {

        return res.status(400).json({
          success: false,
          error: "Missing token",
        });
      }


      if (!notification) {

        return res.status(400).json({
          success: false,
          error:
            "Missing notification",
        });
      }


      await sendChatPush(
        token,
        notification
      );


      return res.json({
        success: true,
      });

    } catch (err) {

      console.error(
        "❌ CHAT PUSH ROUTE ERROR"
      );

      console.error(
        err.code
      );

      console.error(
        err.message
      );


      return res.status(500).json({
        success: false,
        error:
          err.message,
      });
    }
  }
);


module.exports =
  router;