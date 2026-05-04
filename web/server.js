const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const axios = require("axios");

const app = express();
app.use(cors({ origin: "http://localhost:3000", credentials: true }));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    credentials: true
  }
});

const CHAT_ROOM = (id) => `chat_${id}`;

io.on("connection", async (socket) => {
  try {
    const user = socket.handshake.auth?.user;

    // 🔐 Authenticate user via Django
    if (!user || !user.token) {
      throw new Error("No auth");
    }

    const res = await axios.get(
      "http://127.0.0.1:8000/api/users/me/",
      {
        headers: {
          Authorization: `Token ${user.token}`,
        },
      }
    );

    const verifiedUser = res.data;

    socket.user = {
      id: verifiedUser.id,
      username: verifiedUser.username,
      avatar: verifiedUser.avatar
    };

    console.log("✅ Authenticated:", socket.user.username);

    socket.api = axios.create({
      baseURL: "http://127.0.0.1:8000/api/",
      headers: {
        Authorization: `Token ${user.token}`,
      },
    });

    await socket.api.post("users/presence/online/", {
      userId: socket.user.id,
    });

    socket.broadcast.emit("user_status", {
      userId: socket.user.id,
      status: "online",
    });
    
    socket.heartbeatInterval = setInterval(async () => {
      try {
        await socket.api.post("users/presence/heartbeat/");
      } catch (err) {
        console.error("Heartbeat failed:", err.message);
      }
    }, 15000);

  } catch (err) {
    console.log("❌ Unauthorized socket");
    socket.disconnect();
    return;
  }

  // ✅ Join chat
  socket.on("join_chat", async ({ chatId }) => {
    try {
      // 🔐 Verify membership from Django
      const res = await socket.api.get(`chats/${chatId}/`);

      const members = res.data.members;

      const isMember = members.some(
        (m) => m.id === socket.user.id
      );

      if (!isMember) {
        socket.emit("error", "Not allowed in this chat");
        return;
      }

      socket.join(CHAT_ROOM(chatId));
      console.log(`📥 ${socket.user.username} joined chat_${chatId}`);

    } catch (err) {
      console.error("Join failed:", err.response?.data || err.message);
    }
  });
  
  socket.on("send_message", async (data, callback) => {
    try {
      const { chatId, text, media_url, media_type, clientId } = data;

      const payload = {
        chat: chatId,
        text: text || "",
        media_url: media_url || null,
        media_type: media_type || "text",
      };
  
      // 1. SAVE TO DJANGO FIRST (IMPORTANT)
      const res = await socket.api.post(
        "chats/messages/",
        payload,
      );
  
      const savedMessage = res.data;
  
      // 2. ATTACH USER INFO FOR FRONTEND ONLY
      savedMessage.username = socket.user.username;
      savedMessage.avatar = socket.user.avatar;
  
      // 3. BROADCAST
      io.to(CHAT_ROOM(chatId)).emit("receive_message", savedMessage);
      if (callback) {
        callback({
          ok: true,
          id: savedMessage.id,
          clientId,
        });
      }

      socket.to(CHAT_ROOM(chatId)).emit("delivered", {
        messageId: savedMessage.id,
      });
  
    } catch (err) {
      if (callback) callback({ ok: false });
      console.error(
        "❌ Message failed:",
        err.response?.data || err.message
      );
    }
  });
  
  socket.on("reaction", async ({ messageId, emoji, chatId }) => {
    try {
      await socket.api.post(
        `chats/messages/${messageId}/react/`,
        { emoji },
      );
  
      io.to(CHAT_ROOM(chatId)).emit("reaction", {
        messageId,
        emoji,
        userId: socket.user.id,
      });
  
    } catch (err) {
      console.error("Reaction error:", err.response?.data || err.message);
    }
  });
  
  socket.on("typing_start", ({ chatId, userId }) => {
    socket.to(CHAT_ROOM(chatId)).emit("typing", { userId });
  });

  socket.on("typing_stop", ({ chatId, userId }) => {
    socket.to(CHAT_ROOM(chatId)).emit("stop_typing", { userId });
  });
  
  socket.on("mark_seen", async ({ chatId }) => {
    try {
      const res = await socket.api.post(
        "chats/mark-seen/",
        { chatId },
      );
  
      io.to(CHAT_ROOM(chatId)).emit("seen", {
        chatId,
        messageIds: res.data.messageIds,
        userId: socket.user.id,
      });
  
    } catch (err) {
      console.error("Seen error:", err.response?.data || err.message);
    }
  });
  
  socket.on("call-user", ({ to, roomId }) => {
    socket.to(to).emit("incoming-call", {
      from: socket.user.id,
      roomId
    });
  });

  socket.on("call-reject", ({ to }) => {
    socket.to(to).emit("call-rejected", {
      from: socket.user.id
    });
  });

  socket.on("call-accept", ({ to, roomId }) => {
    socket.to(to).emit("call-accepted", {
      from: socket.user.id,
      roomId
    });
  });

  socket.on("disconnect", async () => {
    if (socket.heartbeatInterval) {
      clearInterval(socket.heartbeatInterval);
    }

    await socket.api.post("users/presence/offline/", { userId: socket.user.id, });
  
    socket.broadcast.emit("user_status", {
      userId: socket.user.id,
      status: "offline",
    });

    console.log("User disconnected:", socket.user.username);
  });
});

server.listen(5000, () =>
  console.log("🚀 Chat server running on port 5000")
);