const {
  getCommunityOnlineCount,
} = require("./communityPresence");

async function emitCommunityOnlineCount(
  io,
  socket,
  communityId
) {
  try {
    const res =
      await socket.api.get(
        `chats/communities/${communityId}/online-members/`
      );

    const memberIds =
      Array.isArray(
        res.data.member_ids
      )
        ? res.data.member_ids
        : [];

    const onlineCount =
      getCommunityOnlineCount(
        memberIds
      );

    io.to(
      `community_${communityId}`
    ).emit(
      "community_online_count",
      {
        communityId:
          Number(communityId),

        onlineCount,
      }
    );

    console.log(
      `👥 COMMUNITY ONLINE COUNT: community=${communityId} online=${onlineCount}`
    );

  } catch (err) {
    console.error(
      "❌ COMMUNITY ONLINE COUNT FAILED:",
      {
        communityId,
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

module.exports = {
  emitCommunityOnlineCount,
};