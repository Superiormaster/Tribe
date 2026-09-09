const onlineUsers = new Map();

/**
 * Add socket
 */
function addUserSocket(userId, socketId) {
  const id = Number(userId);

  if (!onlineUsers.has(id)) {
    onlineUsers.set(id, {
      sockets: new Set(),
      state: "foreground",
    });
  }

  onlineUsers
    .get(id)
    .sockets
    .add(socketId);
}

function removeUserSocket(userId, socketId) {
  const id = Number(userId);

  const user = onlineUsers.get(id);

  if (!user) {
    return true;
  }

  user.sockets.delete(socketId);

  if (user.sockets.size === 0) {
    onlineUsers.delete(id);
    return true;
  }

  return false;
}

function setUserState(userId, state) {
  const id = Number(userId);

  if (
    state !== "foreground" &&
    state !== "background"
  ) {
    return;
  }

  const user = onlineUsers.get(id);

  if (!user) {
    return;
  }

  user.state = state;
}

function getUserState(userId) {
  const id = Number(userId);

  const user = onlineUsers.get(id);

  if (!user) {
    return "offline";
  }

  return user.state;
}

function isUserOnline(userId) {
  return getUserState(userId) !== "offline";
}

function getUserSockets(userId) {
  const id = Number(userId);

  const user = onlineUsers.get(id);

  if (!user) {
    return new Set();
  }

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