const {
  USER_ROOM,
} = require("../servers/rooms");

const {
  addUserSocket,
  removeUserSocket,
  setUserState,
} = require("../servers/presence");

module.exports = async function presenceSocket(
  io,
  socket
) {
  addUserSocket(
    socket.user.id,
    socket.id
  );

  socket.join(
    USER_ROOM(socket.user.id)
  );

  const friends =
    await socket.api.get(
      "users/presence-receivers/"
    );
  
  await socket.api.post(
    "users/presence/online/"
  );
  
  for (const id of friends.data) {
    io.to(
      USER_ROOM(id)
    ).emit(
      "user_status",
      {
        userId:
          socket.user.id,
        status:
          "online",
      }
    );
  }
  
  socket.heartbeatInterval =
    setInterval(async () => {
      try {
        await socket.api.post(
          "users/presence/heartbeat/"
        );
      } catch (err) {
        console.error(
          "heartbeat failed:",
          err.message
        );
      }
    }, 15000);
  
  socket.on("app_state", ({ state }) => {
    setUserState(socket.user.id, state);
  });

  socket.on(
    "disconnect",
    async () => {
      try {
        const isOffline =
          removeUserSocket(
            socket.user.id,
            socket.id
          );
  
        clearInterval(
          socket.heartbeatInterval
        );
  
        if (!isOffline)
          return;
  
        const friends =
          await socket.api.get(
            "users/presence-receivers/"
          );
  
        const res =
          await socket.api.post(
            "users/presence/offline/"
          );
  
        for (const id of friends.data) {
          io.to(
            USER_ROOM(id)
          ).emit(
            "user_status",
            {
              userId:
                socket.user.id,
              status:
                "offline",
              last_seen:
                res.data.last_seen,
            }
          );
        }
  
        console.log(
          `${socket.user.username} disconnected`
        );
      } catch (err) {
        console.error(
          "disconnect error:",
          err.message
        );
      }
    }
  );
};