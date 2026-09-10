// servers/communityPresence.js

const {
  isUserOnline,
} = require("./presence");

function getCommunityOnlineCount(memberIds) {
  if (!Array.isArray(memberIds)) {
    return 0;
  }

  let count = 0;

  for (const userId of memberIds) {
    if (isUserOnline(userId)) {
      count++;
    }
  }

  return count;
}

module.exports = {
  getCommunityOnlineCount,
};