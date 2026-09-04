// sockets/privateChatSocket.js

const {
  CHAT_ROOM,
  USER_ROOM,
} = require('../servers/rooms');

const {
  getUserState,
} = require("../servers/presence");

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
  
  socket.join(
    USER_ROOM(socket.user.id)
  );

  console.log(
    `👤 Socket ${socket.id} joined ${USER_ROOM(socket.user.id)}`
  );
  
  // =========================
  // UPDATE SOCKET ACCESS TOKEN
  // =========================
  
  socket.on(
    "update_access_token",
    ({ accessToken } = {}) => {
  
      if (
        !accessToken ||
        typeof accessToken !== "string"
      ) {
        console.error(
          "❌ Invalid socket access token update"
        );
  
        return;
      }
  
      if (
        typeof socket.updateAccessToken !==
        "function"
      ) {
        console.error(
          "❌ socket.updateAccessToken unavailable"
        );
  
        return;
      }
  
      socket.updateAccessToken(
        accessToken
      );
  
      console.log(
        "🔐 Socket token refreshed for user:",
        socket.user.id
      );
    }
  );

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
    async ({
      accessToken,
    } = {}) => {
  
      try {
  
        if (
          accessToken &&
          typeof accessToken === "string"
        ) {
  
          socket.updateAccessToken?.(
            accessToken
          );
  
        }
  
        console.log(
          "📡 user_online:",
          {
            userId:
              socket.user.id,
            hasAccessToken:
              Boolean(
                socket.accessToken
              ),
          }
        );
  
        const res =
          await socket.api.post(
            "chats/mark-all-delivered/"
          );
  
        console.log(
          "✅ MARK ALL DELIVERED SUCCESS:",
          res.data
        );
  
        for (
          const delivery
          of res.data
        ) {
  
          io.to(
            CHAT_ROOM(
              delivery.chatId
            )
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

        await socket.api.post(
          "notifications/push/flush/"
        );
  
      } catch (err) {
  
        console.error(
          "❌ mark-all-delivered failed:",
          {
            status:
              err.response?.status,
  
            data:
              err.response?.data,
  
            message:
              err.message,
          }
        );
  
      }
    }
  );

  socket.on(
    'send_message',
    async (data, callback) => {
  
      console.log("");
      console.log("========================================");
      console.log("🔥🔥🔥 NODE RECEIVED send_message 🔥🔥🔥");
      console.log("========================================");
  
      console.log("Socket ID:", socket.id);
      console.log("User:", socket.user?.id);
      console.log("Username:", socket.user?.username);
      console.log("Callback:", typeof callback);
  
      console.log("DATA:");
      console.dir(data, {
        depth: null,
      });
  
      console.log(
        "========================================"
      );
  
      try {
  
        const {
          client_id,
          chat: chatId,
          encrypted_text,
          caption,
          waveform,
          media_asset_ids,
          media_type,
          reply_to,
        } = data;
  
        console.log(
          "📦 [NODE] Parsed message:"
        );
  
        console.log({
          client_id,
          chatId,
          encrypted_text,
          caption,
          media_type,
          waveform,
          media_asset_ids,
          reply_to,
        });
  
        console.log(
          "🔎 [NODE] Getting chat detail..."
        );
  
        const detail =
          await socket.api.get(
            `chats/${chatId}/detail/`
          );
  
        console.log(
          "✅ [NODE] Chat detail response:",
          detail.data
        );
  
        const recipient =
          detail.data.other_user;
  
        const recipientId =
          recipient?.id;
  
        console.log(
          "👤 [NODE] Recipient:",
          recipient
        );
  
        const mediaSource =
          data.media_source === "upload" ||
          data.media_source === "external" ||
          data.media_source === "forward"
            ? data.media_source
            : null;
        
        const mediaAssetIds =
          mediaSource === "upload"
            ? (
                Array.isArray(data.media_asset_ids)
                  ? data.media_asset_ids
                  : []
              )
            : [];
        
        const mediaUrls =
          mediaSource === "external"
            ? (
                Array.isArray(data.media_url)
                  ? data.media_url
                  : []
              )
            : [];
  
        const replyToId =
          Number.isInteger(data.reply_to_id)
            ? data.reply_to_id
            : (
                typeof data.reply_to === "number"
                  ? data.reply_to
                  : data.reply_to?.id ?? null
              );
  
        console.log("🔥 RAW MEDIA SOURCE:", data.media_source);
        console.log("🔥 RAW MEDIA URL:", data.media_url);
        console.log("🔥 RAW MEDIA ASSETS:", data.media_asset_ids);
        console.log("🔥 COMPUTED MEDIA SOURCE:", mediaSource);

        const payload = {
          chat: chatId,
        
          client_id,
        
          encrypted_text:
            typeof encrypted_text === "string"
              ? encrypted_text
              : "",
        
          caption:
            typeof caption === "string"
              ? caption
              : "",
        
          media_type:
            typeof data.media_type === "string"
              ? data.media_type
              : "text",
          media_source: mediaSource,
          media_asset_ids: mediaAssetIds,
          media_url: mediaUrls,
  
          thumbnail:
            Array.isArray(data.thumbnail)
              ? data.thumbnail
              : [],
  
          waveform:
            Array.isArray(data.waveform)
              ? data.waveform
              : [],
        
          reply_to_id: replyToId,
        
          client_created_at:
            data.client_created_at ?? null,
        };
  
        console.log(
          "🔥 FINAL MEDIA PAYLOAD:",
          JSON.stringify({
            media_source: payload.media_source,
            media_asset_ids: payload.media_asset_ids,
            media_url: payload.media_url,
          }, null, 2)
        );
        console.log(
          "📤 [NODE] Django payload:"
        );
  
        console.dir(payload, {
          depth: null,
        });
  
        if (
          socket.chatPermissions?.[
            chatId
          ]?.blocked
        ) {
  
          console.error(
            "❌ [NODE] MESSAGE BLOCKED BY PERMISSIONS"
          );
  
          return callback?.({
            ok: false,
            error:
              "Messaging is unavailable.",
          });
        }
  
        console.log(
          "🚀 [NODE] ABOUT TO POST TO DJANGO"
        );
  
        console.log(
          "Endpoint:",
          `chats/chats/${chatId}/messages/`
        );
  
        const res =
          await socket.api.post(
            `chats/chats/${chatId}/messages/`,
            payload
          );
  
        console.log(
          "✅ [NODE] DJANGO RESPONSE RECEIVED"
        );
  
        console.log(
          "Status:",
          res.status
        );
  
        console.dir(
          res.data,
          { depth: null }
        );
  
        const savedMessage =
          res.data;
  
        savedMessage.username =
          socket.user.username;
  
        savedMessage.avatar =
          socket.user.avatar;
  
        savedMessage.sender =
          socket.user.id;
  
        const recipientState =
          recipientId
            ? getUserState(recipientId)
            : null;
        
        const shouldPush =
          recipientState === "background" ||
          recipientState === "offline";
        
        console.log(
          "📱 CHAT PUSH CHECK:",
          {
            recipientId,
            recipientState,
            shouldPush,
            messageId:
              savedMessage.id,
          }
        );
        
        if (
          recipientId &&
          shouldPush
        ) {
        
          try {
        
            await socket.api.post(
              "chats/private-chat-push/",
              {
                message_id:
                  savedMessage.id,
        
                recipient_id:
                  recipientId,
              }
            );
        
            console.log(
              "📱 CHAT PUSH QUEUED:",
              {
                recipientId,
                messageId:
                  savedMessage.id,
              }
            );
        
          } catch (pushError) {
        
            console.error(
              "❌ CHAT PUSH REQUEST FAILED:",
              pushError.response?.data ||
              pushError.message
            );
          }
        }
  
        console.log(
          "📡 [NODE] Broadcasting receive_message..."
        );
  
        const messageEvent = {
          ...savedMessage,
          chat: chatId,
          client_id,
          inbox_type: "private",
          sender: socket.user.id,
          status: "sent",
        };
  
        io.to(
          CHAT_ROOM(chatId)
        ).emit(
          "receive_message",
          messageEvent
        );
  
        io.to(
          USER_ROOM(socket.user.id)
        ).emit(
          "inbox_message",
          messageEvent
        );
  
        if (recipientId) {
          io.to(
            USER_ROOM(recipientId)
          ).emit(
            "inbox_message",
            messageEvent
          );
        }
        
        console.log(
          "📨 Inbox event emitted:",
          {
            chatId,
            senderId: socket.user.id,
            recipientId,
            client_id,
          }
        );
  
        console.log(
          "✅ [NODE] Broadcast complete"
        );
  
        console.log(
          "📨 [NODE] ABOUT TO SEND ACK"
        );
  
        callback?.({
          ok: true,
          message: messageEvent,
        });
  
        console.log(
          "✅ [NODE] ACK SENT"
        );
  
      } catch (err) {
  
        console.error("");
        console.error(
          "🔥🔥🔥 [NODE] send_message FAILED 🔥🔥🔥"
        );
  
        console.error(
          "message:",
          err?.message
        );
  
        console.error(
          "response status:",
          err?.response?.status
        );
  
        console.error(
          "response data:",
          err?.response?.data
        );
  
        console.error(
          "response headers:",
          err?.response?.headers
        );
  
        console.error(
          "stack:",
          err?.stack
        );
  
        console.error(
          "========================================"
        );
  
        callback?.({
          ok: false,
          error:
            err.response?.data ||
            err.message,
        });
      }
    }
  );
  
  socket.on(
    "delete_messages",
    ({
      chatId,
      messageIds,
      deletedByAdmin = false,
    }) => {
      if (!chatId) return;
  
      if (
        !Array.isArray(messageIds) ||
        !messageIds.length
      ) {
        return;
      }
  
      io
        .to(CHAT_ROOM(chatId))
        .emit(
          "messages_deleted",
          {
            chatId,
            messageIds,
            deletedByAdmin,
          }
        );
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
    const {
      chatId,
      messageId,
      emoji,
    } = data;
  
    try {
  
      const res = await socket.api.post(
        `chats/messages/${messageId}/react/`,
        {
          emoji,
        }
      );
  
      const result = res.data;
  
      const userId =
        socket.user.id;
  
      if (result.removed) {
  
        io.to(
          CHAT_ROOM(chatId)
        ).emit("reaction", {
          messageId,
          emoji: result.emoji,
          userId,
          removed: true,
        });
  
        return;
      }
  
      if (
        result.changed &&
        result.previous_emoji
      ) {
  
        // First remove old emoji
        io.to(
          CHAT_ROOM(chatId)
        ).emit("reaction", {
          messageId,
          emoji: result.previous_emoji,
          userId,
          removed: true,
        });
  
        // Then add new emoji
        io.to(
          CHAT_ROOM(chatId)
        ).emit("reaction", {
          messageId,
          emoji: result.emoji,
          userId,
          removed: false,
        });
  
        return;
      }
  
      io.to(
        CHAT_ROOM(chatId)
      ).emit("reaction", {
        messageId,
        emoji: result.emoji,
        userId,
        removed: false,
      });
  
    } catch (err) {
  
      console.error(
        "reaction failed:",
        err.response?.data ||
        err.message
      );
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