const communities = new Map();

function joinCommunity(communityId, userId) {
  if (!communities.has(communityId)) {
    communities.set(
      communityId,
      new Set()
    );
  }

  communities
    .get(communityId)
    .add(userId);
}

function leaveCommunity(communityId, userId) {
  const users =
    communities.get(communityId);

  if (!users) return;

  users.delete(userId);

  if (!users.size) {
    communities.delete(communityId);
  }
}

function getCommunityCount(
  communityId,
  excludeUserId = null
) {
  const users =
    communities.get(communityId);

  if (!users) {
    return 0;
  }

  if (!excludeUserId) {
    return users.size;
  }

  let count = 0;

  for (const userId of users) {
    if (
      Number(userId) !==
      Number(excludeUserId)
    ) {
      count++;
    }
  }

  return count;
}

function getCommunityUsers(communityId) {
  return Array.from(
    communities.get(communityId) || []
  );
}

module.exports = {
  joinCommunity,
  leaveCommunity,
  getCommunityCount,
  getCommunityUsers,
};