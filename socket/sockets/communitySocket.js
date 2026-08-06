const {
  joinCommunity,
  leaveCommunity,
  getCommunityCount,
} = require('../servers/communityPresence');

module.exports = function communitySocket(io, socket) {
  const joinedCommunities = new Set();

  // =========================
  // JOIN COMMUNITY (FIXED SINGLE SOURCE OF TRUTH)
  // =========================
  socket.on("join_community", async ({ communityId }) => {
    try {
      const res = await socket.api.get(
        `chats/communities/${communityId}/community-detail/`
      );
  
      const detail = res.data;
  
      if (detail.is_banned) {
        socket.emit(
          "error",
          "You are banned from this community."
        );
        return;
      }
  
      socket.communityPermissions =
        socket.communityPermissions || {};
  
      socket.communityPermissions[communityId] = {
        muted: detail.is_muted,
        role: detail.role,
        require_post_approval:
          detail.require_post_approval,
        join_approval_required:
          detail.join_approval_required,
      };
  
      const room = `community_${communityId}`;
  
      socket.join(room);
      joinedCommunities.add(communityId);
  
      joinCommunity(communityId, socket.user.id);
  
      const count =
        getCommunityCount(communityId);
  
      io.to(room).emit(
        "community_presence_update",
        {
          communityId,
          onlineCount: count,
        }
      );
      
      const deliveredRes =
        await socket.api.post(
          "chats/communities/mark-community-delivered/",
          {
            communityId,
          }
        );
      
      io.to(room).emit(
        "community_delivered",
        {
          communityId,
          messageIds:
            deliveredRes.data.messageIds,
          lastDeliveredMessageId:
            deliveredRes.data.lastDeliveredMessageId,
          userId: socket.user.id,
        }
      );
  
    } catch (err) {
      console.error(
        "community join failed:",
        err.response?.data || err.message
      );
    }
  });

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

    const role =
      socket.communityPermissions?.[
        data.communityId
      ]?.role;

    try {
      const payload = {
        text: data.text || '',
        reply_to_id: data.reply_to?.id || null,
      };

      if (data.media_url) {
        payload.media_url = data.media_url;
        payload.media_type = data.media_type;
      }

      const res = await socket.api.post(
        `chats/chats/${data.communityId}/community_messages/`,
        payload
      );

      const savedMessage = res.data;

      savedMessage.sender = socket.user.id;
      savedMessage.sender_username = socket.user.username;
      savedMessage.sender_avatar = socket.user.avatar;

      io.to(`community_${data.communityId}`).emit(
        'community_message',
        savedMessage
      );

      callback?.({ ok: true, id: savedMessage.id });

    } catch (err) {
      console.error('community message failed:', err.message);
      callback?.({ ok: false });
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
  socket.on('community_typing', ({ communityId }) => {
    socket.to(`community_${communityId}`).emit('community_typing', {
      userId: socket.user.id,
      username: socket.user.username,
    });
  });

  // =========================
  // REACTION
  // =========================
  socket.on('community_reaction', async ({ communityId, messageId, emoji }) => {
    try {
      await socket.api.post(`messages/${messageId}/react/`, { emoji });

      io.to(`community_${communityId}`).emit('community_reaction', {
        messageId,
        emoji,
        userId: socket.user.id,
      });

    } catch (err) {
      console.error('community reaction failed:', err.message);
    }
  });

  // =========================
  // DELETE
  // =========================
  socket.on('community_delete', async ({ communityId, messageId }) => {
    try {
      await socket.api.post(`messages/${messageId}/delete_message/`);

      io.to(`community_${communityId}`).emit('community_delete', {
        messageId,
        deletedByAdmin: false,
      });

    } catch (err) {
      console.error('community delete failed:', err.message);
    }
  });

  // =========================
  // PIN
  // =========================
  socket.on('community_pin', async ({ communityId, messageId }) => {
    try {
      const res = await socket.api.post(
        `messages/${messageId}/toggle_pin/`
      );

      io.to(`community_${communityId}`).emit('community_pin', {
        messageId,
        pinned: res.data.is_pinned,
      });

    } catch (err) {
      console.error('community pin failed:', err.message);
    }
  });

  // =========================
  // LEAVE COMMUNITY
  // =========================
  socket.on('leave_community', ({ communityId }) => {
    if (!communityId) return;

    const room = `community_${communityId}`;

    socket.leave(room);
    joinedCommunities.delete(communityId);

    leaveCommunity(communityId, socket.user.id);

    const count = getCommunityCount(communityId);

    io.to(room).emit('community_presence_update', {
      communityId,
      onlineCount: count,
    });
  });

  // =========================
  // DISCONNECT CLEANUP
  // =========================
  socket.on('disconnect', () => {
    joinedCommunities.forEach((communityId) => {
      leaveCommunity(communityId, socket.user.id);

      const room = `community_${communityId}`;
      const count = getCommunityCount(communityId);

      io.to(room).emit('community_presence_update', {
        communityId,
        onlineCount: count,
      });
    });

    joinedCommunities.clear();
  });
};