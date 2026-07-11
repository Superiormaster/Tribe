const onlineUsers = new Map();

/**
 * Add socket
 */
function addUserSocket(
  userId,
  socketId
) {
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(
      userId,
      new Set()
    );
  }

  onlineUsers
    .get(userId)
    .add(socketId);
}

/**
 * Remove socket
 */
function removeUserSocket(
  userId,
  socketId
) {
  const sockets =
    onlineUsers.get(userId);

  if (!sockets) return false;

  sockets.delete(socketId);

  if (sockets.size === 0) {
    onlineUsers.delete(userId);
    return true; // user fully offline
  }

  return false;
}

/**
 * Is user online?
 */
function isUserOnline(
  userId
) {
  return onlineUsers.has(userId);
}

/**
 * Get sockets
 */
function getUserSockets(
  userId
) {
  return (
    onlineUsers.get(userId) ||
    new Set()
  );
}

module.exports = {
  onlineUsers,
  addUserSocket,
  removeUserSocket,
  isUserOnline,
  getUserSockets,
};