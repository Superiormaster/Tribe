// servers/communityPresence.js

const communityUsers = new Map();
// communityId -> Set(userId)

function joinCommunity(communityId, userId) {
  if (!communityUsers.has(communityId)) {
    communityUsers.set(communityId, new Set());
  }

  communityUsers.get(communityId).add(userId);
}

function leaveCommunity(communityId, userId) {
  if (!communityUsers.has(communityId)) return;

  communityUsers.get(communityId).delete(userId);

  if (communityUsers.get(communityId).size === 0) {
    communityUsers.delete(communityId);
  }
}

function getCommunityCount(communityId) {
  return communityUsers.get(communityId)?.size || 0;
}

function getAll() {
  return communityUsers;
}

module.exports = {
  joinCommunity,
  leaveCommunity,
  getCommunityCount,
  getAll,
};