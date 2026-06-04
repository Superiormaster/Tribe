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
  socket.on('join_community', async ({ communityId }) => {
    if (!communityId) return;

    try {
      const res = await socket.api.get(
        `communities/${communityId}/`
      );

      const community = res.data;

      const isMember = community.members.some(
        (m) => m.id === socket.user.id
      );

      if (!isMember) {
        socket.emit('error', 'Not a community member');
        return;
      }

      const room = `community_${communityId}`;

      socket.join(room);
      joinedCommunities.add(communityId);

      joinCommunity(communityId, socket.user.id);

      const count = getCommunityCount(communityId);

      io.to(room).emit('community_presence_update', {
        communityId,
        onlineCount: count,
      });

      console.log(
        `🟢 ${socket.user.username} joined ${room}`
      );

    } catch (err) {
      console.error(
        'community join failed:',
        err.response?.data || err.message
      );
    }
  });

  // =========================
  // MESSAGE
  // =========================
  socket.on('community_message', async (data, callback) => {
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
        `communities/${data.communityId}/chat/`,
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