// sockets/presenceSocket.js

const {
  USER_ROOM,
} = require('../servers/rooms');

module.exports = function presenceSocket(
  io,
  socket
) {

  socket.join(
    USER_ROOM(socket.user.id)
  );

  socket.broadcast.emit(
    'user_status',
    {
      userId: socket.user.id,
      status: 'online',
    }
  );

  socket.api.post(
    'users/presence/online/',
    {
      userId: socket.user.id,
    }
  );

  socket.heartbeatInterval =
    setInterval(async () => {

      try {

        await socket.api.post(
          'users/presence/heartbeat/'
        );

      } catch (err) {

        console.error(
          'heartbeat failed:',
          err.message
        );
      }

    }, 15000);

  socket.on(
    'disconnect',
    async () => {

      try {

        if (
          socket.heartbeatInterval
        ) {
          clearInterval(
            socket.heartbeatInterval
          );
        }

        await socket.api.post(
          'users/presence/offline/',
          {
            userId: socket.user.id,
          }
        );

        socket.broadcast.emit(
          'user_status',
          {
            userId: socket.user.id,
            status: 'offline',
          }
        );

        console.log(
          `${socket.user.username} disconnected`
        );

      } catch (err) {

        console.error(
          'disconnect error:',
          err.message
        );
      }
    }
  );
};