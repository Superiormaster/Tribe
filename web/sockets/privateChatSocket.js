// sockets/privateChatSocket.js

const {
  CHAT_ROOM,
} = require('../servers/rooms');

const {
  isUserOnline,
} = require(
  "../servers/presence"
);

const {
  sendChatPush,
} = require(
  "../servers/pushChat"
);

module.exports = function privateChatSocket(
  io,
  socket
) {
  console.log("privateChatSocket loaded");

  socket.on(
    "join_chat",
    async ({ chatId }) => {
      try {
        const res = await socket.api.get(
          `chats/${chatId}/`
        );
  
        const members = res.data.members;
  
        const isMember = members.some(
          (m) => m.id === socket.user.id
        );
  
        if (!isMember) {
          socket.emit(
            "error",
            "Not allowed in this chat"
          );
          return;
        }
  
        // Cache permissions
        const detail =
          await socket.api.get(
            `chats/chats/${chatId}/detail/`
          );
  
        socket.chatPermissions =
          socket.chatPermissions || {};
  
        socket.chatPermissions[chatId] = {
          blocked:
            detail.data.is_message_blocked ||
            detail.data.blocked_me,
        };
  
        socket.join(
          CHAT_ROOM(chatId)
        );
  
        console.log(
          `📥 ${socket.user.username} joined chat_${chatId}`
        );

        const deliveredRes = await socket.api.post(
          "chats/mark-delivered/",
          {
            chatId,
          }
        );
  
        io.to(CHAT_ROOM(chatId)).emit(
          "delivered",
          {
            chatId,
            messageIds: deliveredRes.data.messageIds,
            userId: socket.user.id,
          }
        );
      } catch (err) {
        console.error(
          "join failed:",
          err.response?.data ||
            err.message
        );
      }
    }
  );
  
  socket.on(
    "user_online",
    async () => {
      const res =
        await socket.api.post(
          "chats/mark-all-delivered/"
        );
  
      for (const delivery of res.data) {
        io.to(
          CHAT_ROOM(delivery.chatId)
        ).emit(
          "delivered",
          {
            chatId:
              delivery.chatId,
            messageIds:
              delivery.messageIds,
            lastDeliveredMessageId:
              delivery.lastDeliveredMessageId,
            userId:
              socket.user.id,
          }
        );
      }
    }
  );

  socket.on(
    'send_message',
    async (data, callback) => {
      console.log("SERVER RECEIVED send_message", data);
      console.log("callback type", typeof callback);
      
      console.log("==================================");
      console.log("SERVER GOT send_message");
      console.log("Socket:", socket.id);
      console.log("User:", socket.user?.id);
      console.log("Data:", data);
      console.log("==================================");

      try {

        const {
          client_id,
          chat:chatId,
          encrypted_text,
          caption,
          media_url,
          media_type,
          thumbnail,
          waveform,
          duration,
          reply_to,
        } = data;
        
        const chatRes =
          await socket.api.get(
            `chats/${chatId}/`
          );
        
        const recipient =
          chatRes.data.members.find(
            m => m.id !== socket.user.id
          );
        
        const recipientId =
          recipient.id;

        const payload = {
          chat: chatId,
          client_id,
          encrypted_text,
          caption,
          media_url,
          media_type,
          thumbnail,
          waveform,
          duration,
          reply_to:
              typeof reply_to === "number"
                  ? reply_to
                  : null,
        };

        if (
          socket.chatPermissions?.[
            chatId
          ]?.blocked
        ) {
          return callback?.({
            ok: false,
            error:
              "Messaging is unavailable.",
          });
        }

        console.log("Posting to Django...");
        console.log(payload);
        const res =
          await socket.api.post(
            `chats/chats/${chatId}/messages/`,
            payload
          );

        const savedMessage =
          res.data;
        console.log("Django saved message");
        console.log(savedMessage);

        savedMessage.username =
          socket.user.username;

        savedMessage.avatar =
          socket.user.avatar;

        savedMessage.sender = 
          socket.user.id;
      
        const recipientOnline =
          isUserOnline(
            recipientId
          );
      
        if (!recipientOnline && recipient.fcm_token) {
          await sendChatPush(
            recipient.fcm_token,
            {
              senderName:
                socket.user.username,
          
              text:
                savedMessage.encrypted_text,
          
              media_type:
                savedMessage.media_type,
          
              thumbnail:
                savedMessage.thumbnail,
          
              chat:chatId,
            }
          );
        }

        console.log("Broadcasting to room", CHAT_ROOM(chatId));
        io.to(
          CHAT_ROOM(chatId)
        ).emit(
          'receive_message',
          {
            ...savedMessage,
            chat: chatId,
          }
        );
        console.log("Broadcasting", {
          id: savedMessage.id,
          savedMessage
        });

        console.log("ABOUT TO CALLBACK");
        if (callback) {
          console.log("Sending ACK back to frontend");

          callback({
            ok: true,
            message: {
              ...savedMessage,
              chat: chatId,
            }
          });
        }
        console.log("CALLBACK DONE");

      } catch (err) {

        console.error(
          'message failed:',
          err.response?.data ||
          err.message
        );
        
        console.error("SERVER ERROR");
        console.error(err);
      
        if (err.response) {
          console.error("Status:", err.response.status);
          console.error("Data:", err.response.data);
        }

        if (callback) {
          callback({
            ok: false,
            error:
              err.response?.data ||
              err.message,
          });
        }
      }
    }
  );

  socket.on(
    "typing_start",
    async ({ chatId }) => {
      if (
        socket.chatPermissions?.[
          chatId
        ]?.blocked
      ) {
        return;
      }
  
      socket.to(
        CHAT_ROOM(chatId)
      ).emit("typing", {
        userId: socket.user.id,
      });
    }
  );
  
  socket.on(
    "typing_stop",
    async ({ chatId }) => {
      if (
        socket.chatPermissions?.[
          chatId
        ]?.blocked
      ) {
        return;
      }
  
      socket.to(
        CHAT_ROOM(chatId)
      ).emit("stop_typing", {
        userId: socket.user.id,
      });
    }
  );

  socket.on("reaction", async (data) => {
    const { chatId, messageId, emoji } = data;
  
    try {
      const res = await socket.api.post(
        `chats/messages/${messageId}/react/`,
        { emoji }
      );
  
      io.to(CHAT_ROOM(chatId)).emit("reaction", {
        messageId,
        emoji,
        userId: socket.user.id,
        removed: res.data.removed || false,
      });
  
    } catch (err) {
      console.error("reaction failed:", err.message);
    }
  });

  socket.on(
    "mark_delivered",
    async ({ chatId }) => {
      try {
        const res =
          await socket.api.post(
            "chats/mark-delivered/",
            {
              chatId,
            }
          );
  
        io.to(CHAT_ROOM(chatId)).emit(
          "delivered",
          {
            chatId,
            messageIds:
              res.data.messageIds,
            lastDeliveredMessageId:
              res.data.lastDeliveredMessageId,
            userId:
              socket.user.id,
          }
        );
      } catch (err) {
        console.error(
          "mark_delivered failed",
          err.response?.data ||
          err.message
        );
      }
    }
  );

  socket.on(
    "mark_seen",
    async ({ chatId }) => {
      try {
        const res =
          await socket.api.post(
            "chats/mark-seen/",
            {
              chatId,
            }
          );
  
        io.to(
          CHAT_ROOM(chatId)
        ).emit(
          "seen",
          {
            chatId,
            messageIds:
              res.data.messageIds,
            lastSeenMessageId:
              res.data
                .lastSeenMessageId,
            userId:
              socket.user.id,
          }
        );
      } catch (err) {
        console.error(
          "mark_seen failed",
          err.response?.data ||
          err.message
        );
      }
    }
  );
};