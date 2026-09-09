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
  const userId =
    Number(socket.user.id);

  /*
   * Register THIS socket.
   */
  addUserSocket(
    userId,
    socket.id
  );

  /*
   * Join personal room.
   */
  socket.join(
    USER_ROOM(userId)
  );

  console.log(
    `🟢 PRESENCE CONNECTED: ${socket.user.username} | socket=${socket.id}`
  );

  /*
   * Tell backend this user is online.
   */
  try {
    await socket.api.post(
      "users/presence/online/"
    );
  } catch (err) {
    console.error(
      "presence online failed:",
      err.response?.data ||
      err.message
    );
  }

  /*
   * Notify friends.
   */
  try {
    const friends =
      await socket.api.get(
        "users/presence-receivers/"
      );

    for (const id of friends.data) {
      io.to(
        USER_ROOM(id)
      ).emit(
        "user_status",
        {
          userId,
          status: "online",
        }
      );
    }
  } catch (err) {
    console.error(
      "presence receivers failed:",
      err.response?.data ||
      err.message
    );
  }

  /*
   * HEARTBEAT
   */
  socket.heartbeatInterval =
    setInterval(async () => {
      try {
        await socket.api.post(
          "users/presence/heartbeat/"
        );
      } catch (err) {
        console.error(
          "heartbeat failed:",
          err.response?.data ||
          err.message
        );
      }
    }, 15000);

  /*
   * APP STATE
   */
  socket.on(
    "app_state",
    ({ state } = {}) => {
      if (
        state !== "foreground" &&
        state !== "background"
      ) {
        return;
      }

      setUserState(
        userId,
        state
      );

      console.log(
        `📱 APP STATE: ${socket.user.username} → ${state}`
      );
    }
  );

  /*
   * DISCONNECT
   */
  socket.on(
    "disconnect",
    async (reason) => {
      try {
        clearInterval(
          socket.heartbeatInterval
        );

        const isOffline =
          removeUserSocket(
            userId,
            socket.id
          );

        console.log(
          `🔴 SOCKET DISCONNECTED: ${socket.user.username} | socket=${socket.id} | reason=${reason} | completelyOffline=${isOffline}`
        );

        if (!isOffline) {
          return;
        }

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
              userId,
              status: "offline",
              last_seen:
                res.data.last_seen,
            }
          );
        }

        console.log(
          `⚫ USER OFFLINE: ${socket.user.username}`
        );

      } catch (err) {
        console.error(
          "disconnect error:",
          err.response?.data ||
          err.message
        );
      }
    }
  );
};