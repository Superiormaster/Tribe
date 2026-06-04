// sockets/privateChatSocket.js

const {
  CHAT_ROOM,
} = require('../servers/rooms');

module.exports = function privateChatSocket(
  io,
  socket
) {

  socket.on(
    'join_chat',
    async ({ chatId }) => {

      try {

        const res =
          await socket.api.get(
            `chats/${chatId}/`
          );

        const members =
          res.data.members;

        const isMember =
          members.some(
            (m) =>
              m.id === socket.user.id
          );

        if (!isMember) {

          socket.emit(
            'error',
            'Not allowed in this chat'
          );

          return;
        }

        socket.join(
          CHAT_ROOM(chatId)
        );

        console.log(
          `📥 ${socket.user.username} joined chat_${chatId}`
        );

      } catch (err) {

        console.error(
          'join failed:',
          err.response?.data ||
          err.message
        );
      }
    }
  );

  socket.on(
    'send_message',
    async (data, callback) => {

      console.log("📥 SOCKET RECEIVED send_message:", data);

      try {

        const {
          chatId,
          encrypted,
          media_url,
          media_type,
          clientId,
          reply_to,
        } = data;

        const payload = {
          chat: chatId,
          encrypted_text: encrypted,
          media_url: media_url || null,
          media_type: media_type || "text",
          reply_to:
            typeof reply_to === "number"
              ? reply_to
              : reply_to?.id ?? null,
        };

        const res =
          await socket.api.post(
            `chats/chats/${chatId}/messages/`,
            payload
          );
        console.log("💾 SAVED MESSAGE FROM API:", res.data);

        const savedMessage =
          res.data;

        savedMessage.username =
          socket.user.username;

        savedMessage.avatar =
          socket.user.avatar;

        savedMessage.sender = 
          socket.user.id;

        savedMessage.id = savedMessage.id;

        console.log("📡 EMITTING TO ROOM:", CHAT_ROOM(chatId));
        console.log("📡 FINAL MESSAGE SENT:", {
          ...savedMessage,
          chatId,
          clientId,
        });
        io.to(
          CHAT_ROOM(chatId)
        ).emit(
          'receive_message',
          {
            ...savedMessage,
            chatId,
            clientId,
          }
        );

        if (callback) {

          callback({
            ok: true,
            message: {
              ...savedMessage,
              encrypted_text: data.encrypted,
              reply_to: savedMessage.reply_to || data.reply_to || null,
              clientId,
              localId: clientId,
              chatId,
            }
          });
        }

      } catch (err) {

        console.error(
          'message failed:',
          err.response?.data ||
          err.message
        );

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
    'typing_start',
    ({ chatId }) => {

      socket.to(
        CHAT_ROOM(chatId)
      ).emit(
        'typing',
        {
          userId: socket.user.id,
        }
      );
    }
  );

  socket.on(
    'typing_stop',
    ({ chatId }) => {

      socket.to(
        CHAT_ROOM(chatId)
      ).emit(
        'stop_typing',
        {
          userId: socket.user.id,
        }
      );
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
    'mark_seen',
    async ({ chatId }) => {

      try {

        const res =
          await socket.api.post(
            'chats/mark-seen/',
            { chatId }
          );

        io.to(
          CHAT_ROOM(chatId)
        ).emit(
          'seen',
          {
            chatId,
            messageIds:
              res.data.messageIds,
            userId:
              socket.user.id,
          }
        );

      } catch (err) {

        console.error(
          'seen failed:',
          err.response?.data ||
          err.message
        );
      }
    }
  );
};