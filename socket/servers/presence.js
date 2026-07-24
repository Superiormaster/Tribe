const onlineUsers = new Map();

/**
 * Add socket
 */
function addUserSocket(
  userId,
  socketId
) {
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, {
      sockets: new Set(),
      state: "foreground",
    });
  }

  onlineUsers
    .get(userId)
    .sockets
    .add(socketId);
}

/**
 * Remove socket
 */
function removeUserSocket(
  userId,
  socketId
) {
  const user = onlineUsers.get(userId);

  if (!user) return true;

  user.sockets.delete(socketId);

  if (user.sockets.size === 0) {
    onlineUsers.delete(userId);
    return true;
  }

  return false;
}

function setUserState(userId, state) {
  const user = onlineUsers.get(userId);

  if (!user) return;

  if (
    state !== "foreground" &&
    state !== "background"
  ) {
    return;
  }

  user.state = state;
}

function getUserState(userId) {
  const user = onlineUsers.get(userId);

  if (!user) return "offline";

  return user.state;
}

function isUserOnline(userId) {
  return getUserState(userId) !== "offline";
}

/**
 * Get sockets
 */
function getUserSockets(
  userId
) {
  const user = onlineUsers.get(userId);
  if (!user) return new Set();

  return user.sockets;
}

module.exports = {
  onlineUsers,
  addUserSocket,
  removeUserSocket,
  isUserOnline,
  getUserSockets,
  setUserState,
  getUserState,
};