const {
  joinCommunity,
  leaveCommunity,
  getCommunityCount,
  getCommunityUsers,
} = require('../servers/communityPresence');
const {
  getUserState,
} = require("../servers/presence");

const {
  USER_ROOM,
} = require('../servers/rooms');

function emitCommunityPresence(
  io,
  communityId
) {
  const room =
    `community_${communityId}`;

  const onlineUserIds =
    getCommunityUsers(
      communityId
    );

  io.to(room).emit(
    "community_presence_update",
    {
      communityId,
      onlineUserIds,
    }
  );
}

async function ensureCommunityPermissions(socket, communityId) {
  socket.communityPermissions =
    socket.communityPermissions || {};

  const existing =
    socket.communityPermissions[communityId];

  if (existing) {
    return existing;
  }

  const res = await socket.api.get(
    `chats/communities/${communityId}/community-detail/`
  );

  const detail = res.data;

  if (detail.is_banned) {
    throw new Error(
      "You are banned from this community."
    );
  }

  const socketUserId =
    Number(socket.user.id);

  const ownerId =
    Number(detail.owner_id);

  let role =
    String(detail.role || "")
      .trim()
      .toLowerCase();

  if (socketUserId === ownerId) {
    role = "owner";
  }

  const permissions = {
    muted: Boolean(detail.is_muted),
    role,
    ownerId,

    require_post_approval:
      Boolean(detail.require_post_approval),

    join_approval_required:
      Boolean(detail.join_approval_required),
  };

  socket.communityPermissions[communityId] =
    permissions;

  return permissions;
}

module.exports = function communitySocket(io, socket) {
  
  socket.onAny((event, ...args) => {
    console.log(
      "🔥🔥 SERVER RECEIVED:",
      event,
      JSON.stringify(
        args,
        (key, value) =>
          typeof value === "function"
            ? "[FUNCTION]"
            : value
      )
    );
  });

  const joinedCommunities = new Set();
  
  // =========================
  // JOIN COMMUNITY (FIXED SINGLE SOURCE OF TRUTH)
  // =========================
  socket.on(
    "join_community",
    async ({ communityId }, callback) => {
  
      const normalizedCommunityId =
        Number(communityId);
  
      if (!normalizedCommunityId) {
        console.log(
          "❌ INVALID COMMUNITY ID"
        );
  
        callback?.({
          ok: false,
          error: "Invalid communityId",
        });
  
        return;
      }
  
      const room =
        `community_${normalizedCommunityId}`;
  
      try {
  
        console.log(
          "1️⃣ BEFORE PERMISSIONS"
        );
  
        const permissions =
          await ensureCommunityPermissions(
            socket,
            normalizedCommunityId
          );
  
        console.log(
          "2️⃣ AFTER PERMISSIONS",
          permissions
        );
  
        console.log(
          "3️⃣ BEFORE SOCKET.JOIN",
          room
        );
  
        await socket.join(room);
  
        console.log(
          "4️⃣ AFTER SOCKET.JOIN",
          {
            room,
            rooms: Array.from(socket.rooms),
          }
        );
  
        joinedCommunities.add(
          normalizedCommunityId
        );
  
        console.log(
          "5️⃣ BEFORE PRESENCE"
        );
  
        joinCommunity(
          normalizedCommunityId,
          socket.user.id
        );
  
        emitCommunityPresence(
          io,
          normalizedCommunityId
        );
  
        console.log(
          "6️⃣ ABOUT TO ACK"
        );
  
        callback?.({
          ok: true,
          communityId:
            normalizedCommunityId,
          role:
            permissions.role,
        });
  
        console.log(
          "7️⃣ ACK CALLED"
        );
  
        // IMPORTANT:
        // Nothing else should be awaited
        // before the ACK.
  
        try {
  
          const deliveredRes =
            await socket.api.post(
              "chats/communities/mark-community-delivered/",
              {
                communityId:
                  normalizedCommunityId,
              }
            );
  
          io.to(room).emit(
            "community_delivered",
            {
              communityId:
                normalizedCommunityId,
  
              messageIds:
                deliveredRes.data.messageIds,
  
              lastDeliveredMessageId:
                deliveredRes.data.lastDeliveredMessageId,
  
              userId:
                socket.user.id,
            }
          );
  
        } catch (err) {
  
          console.error(
            "community delivered failed:",
            err.response?.data ||
            err.message
          );
        }
  
      } catch (err) {
  
        console.error(
          "❌ COMMUNITY JOIN ERROR",
          {
            socketId: socket.id,
            communityId:
              normalizedCommunityId,
            error:
              err.response?.data ||
              err.message ||
              err,
          }
        );
  
        callback?.({
          ok: false,
          error:
            err.response?.data ||
            err.message ||
            "Failed to join community",
        });
      }
    }
  );

  // =========================
  // MESSAGE
  // =========================
  socket.on('community_message', async (data, callback) => {
    if (
      socket.communityPermissions?.[data.communityId]?.muted
    ) {
      return callback?.({
        ok: false,
        error: "You are muted in this community.",
      });
    }
  
    const communityId =
      data.communityId;
    const clientId = data.client_id;

    if (!communityId) {
      console.error(
        "❌ Community message rejected: missing communityId",
        data
      );

      return callback?.({
        ok: false,
        error: "Missing communityId",
        client_id: clientId,
      });
    }

    if (!clientId) {
      return callback?.({
        ok: false,
        error: "Missing client_id",
      });
    }

    const role =
      socket.communityPermissions?.[
        data.communityId
      ]?.role;

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

    try {
      const payload = {
        encrypted_text:
          typeof data.encrypted_text === "string"
            ? data.encrypted_text
            : "",
      
        caption:
          typeof data.caption === "string"
            ? data.caption
            : "",
      
        media_type:
          typeof data.media_type === "string"
            ? data.media_type
            : "text",
      
        client_id: clientId,
      
        mention_user_ids:
          Array.isArray(data.mention_user_ids)
            ? data.mention_user_ids
            : [],
      
        mention_all:
          Boolean(data.mention_all),

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
      
      if (data.reply_to?.id) {
        payload.reply_to_id = data.reply_to.id;
      }

      const res = await socket.api.post(
        `chats/chats/${data.communityId}/community-messages/`,
        payload
      );

      const savedMessage = res.data;

      savedMessage.sender = socket.user.id;
      savedMessage.sender_username = socket.user.username;
      savedMessage.sender_avatar = socket.user.avatar;
  
      const inboxUserIds =
        savedMessage.inbox_user_ids || [];
  
      const recipientIds = [];

      for (const userId of inboxUserIds) {
      
        // Don't push to sender
        if (String(userId) === String(socket.user.id)) {
          continue;
        }
      
        const state = getUserState(userId);
      
        const shouldPush =
          state === "background" ||
          state === "offline";
      
        if (shouldPush) {
          recipientIds.push(userId);
        }
      }

      if (recipientIds.length) {

        try {
      
          await socket.api.post(
            `chats/messages/${savedMessage.id}/community-push/`,
            {
              recipient_ids:
                recipientIds,
            }
          );
      
        } catch (pushError) {
      
          console.error(
            "❌ COMMUNITY CHAT PUSH FAILED:",
            pushError.response?.data ||
            pushError.message
          );
        }
      }

      const messageEvent = {
        ...savedMessage,
      
        sender: socket.user.id,
        sender_username: socket.user.username,
        sender_avatar: socket.user.avatar,
      
        communityId: Number(data.communityId),
      
        inbox_type: "community",
      
        status: "sent",
      
        members: savedMessage.members || [],
      
        // Inbox fields
        community_id: Number(data.communityId),
        chat_id: savedMessage.chat_id,
        username: socket.user.username,
        avatar: socket.user.avatar,
        last_sender_id: socket.user.id,
        media_type: savedMessage.media_type,
      };
      
      io.to(`community_${data.communityId}`).emit(
        "community_message",
        messageEvent
      );

      for (const userId of inboxUserIds) {
        io.to(USER_ROOM(userId)).emit(
          "inbox_message",
          messageEvent
        );
      }

      callback?.({ ok: true, id: savedMessage.id, message: messageEvent, client_id: clientId });

    } catch (err) {
      console.error('community message failed:', err.message);
      callback?.({ ok: false, client_id: clientId,
      error:
        err.response?.data ||
        err.message ||
        "Failed to send community message" });
    }
  });
  
  socket.on(
    "mark_community_delivered",
    async ({ communityId }) => {
      try {
        const res =
          await socket.api.post(
            "chats/communities/mark-community-delivered/",
            {
              communityId,
            }
          );
  
        io.to(`community_${communityId}`).emit(
          "community_delivered",
          {
            communityId,
            messageIds: res.data.messageIds,
            lastDeliveredMessageId:
              res.data.lastDeliveredMessageId,
            userId: socket.user.id,
          }
        );
      } catch (err) {
        console.error(
          "community delivered failed",
          err.response?.data ||
            err.message
        );
      }
    }
  );
  
  socket.on(
    "mark_community_seen",
    async ({ communityId }) => {
      try {
        const res =
          await socket.api.post(
            "chats/communities/mark-community-seen/",
            {
              communityId,
            }
          );
  
        io.to(`community_${communityId}`).emit(
          "community_seen",
          {
            communityId,
            messageIds: res.data.messageIds,
            lastSeenMessageId:
              res.data.lastSeenMessageId,
            userId: socket.user.id,
          }
        );
      } catch (err) {
        console.error(
          "community seen failed",
          err.response?.data ||
            err.message
        );
      }
    }
  );

  // =========================
  // TYPING
  // =========================
  socket.on(
    "community_typing_start",
    ({ communityId }) => {
      if (!communityId) return;

      const permissions =
        socket.communityPermissions?.[
          communityId
        ];
      
      if (!permissions) {
        return;
      }
  
      socket
        .to(`community_${communityId}`)
        .emit(
          "community_typing",
          {
            communityId,
            userId:
              socket.user.id,
            username:
              socket.user.username,
            isTyping: true,
          }
        );
    }
  );
  
  socket.on(
    "community_typing_stop",
    ({ communityId }) => {
      if (!communityId) return;

      const permissions =
        socket.communityPermissions?.[
          communityId
        ];
      
      if (!permissions) {
        return;
      }
  
      socket
        .to(`community_${communityId}`)
        .emit(
          "community_typing",
          {
            communityId,
            userId:
              socket.user.id,
            username:
              socket.user.username,
            isTyping: false,
          }
        );
    }
  );

  // =========================
  // REACTION
  // =========================
  socket.on(
    "community_reaction",
    async ({
      communityId,
      messageId,
      emoji,
    }) => {
  
      if (!communityId || !messageId || !emoji) {
        return;
      }
  
      try {
        const res = await socket.api.post(
          `chats/messages/${messageId}/react/`,
          {
            emoji,
          }
        );
  
        const reactionEvent = {
          communityId,
          messageId,
          userId: res.data.user_id,
          emoji: res.data.emoji,
          removed: Boolean(res.data.removed),
          reactions: Array.isArray(
            res.data.reactions
          )
            ? res.data.reactions
            : [],
        };
  
        io.to(
          `community_${communityId}`
        ).emit(
          "community_reaction",
          reactionEvent
        );
  
      } catch (err) {
        console.error(
          "community reaction failed:",
          err.response?.data ||
          err.message
        );
      }
    }
  );

  // =========================
  // DELETE
  // =========================
  socket.on(
    "community_delete",
    ({
      communityId,
      messageIds,
      deletedByAdmin = false,
    }) => {
  
      if (!communityId) {
        return;
      }
  
      if (
        !Array.isArray(messageIds) ||
        !messageIds.length
      ) {
        return;
      }
  
      io
        .to(`community_${communityId}`)
        .emit(
          "community_messages_deleted",
          {
            communityId,
            messageIds,
            deletedByAdmin,
          }
        );
    }
  );

  // =========================
  // COMMUNITY PIN BROADCAST
  // =========================
  
  socket.on(
    "community_pin",
    ({
      communityId,
      messageId,
      pinned,
      message,
      pinnedCount,
      maxPinned,
      userId,
    }) => {
  
      const normalizedCommunityId =
        Number(communityId);
  
      const normalizedMessageId =
        Number(messageId);
  
      if (
        !normalizedCommunityId ||
        !normalizedMessageId
      ) {
        console.error(
          "❌ COMMUNITY PIN BROADCAST: invalid payload",
          {
            communityId,
            messageId,
            pinned,
          }
        );
  
        return;
      }
  
      const room =
        `community_${normalizedCommunityId}`;
  
      console.log(
        "📡 COMMUNITY PIN BROADCAST:",
        {
          communityId:
            normalizedCommunityId,
          messageId:
            normalizedMessageId,
          pinned: Boolean(pinned),
          room,
        }
      );
  
      io.to(room).emit(
        "community_pin",
        {
          communityId:
            normalizedCommunityId,
  
          messageId:
            normalizedMessageId,
  
          pinned:
            Boolean(pinned),
  
          userId:
            userId ??
            socket.user?.id,
  
          message:
            message ?? null,
  
          pinnedCount:
            pinnedCount ?? null,
  
          maxPinned:
            maxPinned ?? 5,
        }
      );
    }
  );
  
  // =========================
  // LEAVE COMMUNITY
  // =========================
  socket.on('leave_community', ({ communityId }) => {
    if (!communityId) return;

    const room = `community_${communityId}`;

    socket.leave(room);
    joinedCommunities.delete(communityId);

    leaveCommunity(communityId, socket.user.id);

    emitCommunityPresence(
      io,
      communityId
    );
  });

  // =========================
  // DISCONNECT CLEANUP
  // =========================
  socket.on('disconnect', () => {
    joinedCommunities.forEach((communityId) => {
      leaveCommunity(communityId, socket.user.id);

      const room = `community_${communityId}`;
      emitCommunityPresence(
        io,
        communityId
      );
    });

    joinedCommunities.clear();
  });
};