// sockets/callSocket.js

const {
  USER_ROOM,
} = require('../servers/rooms');

module.exports = function callSocket(
  io,
  socket
) {

  socket.on(
    'call-user',
    ({ to, roomId }) => {

      io.to(
        USER_ROOM(to)
      ).emit(
        'incoming-call',
        {
          from: socket.user.id,
          roomId,
        }
      );
    }
  );

  socket.on(
    'call-reject',
    ({ to }) => {

      io.to(
        USER_ROOM(to)
      ).emit(
        'call-rejected',
        {
          from: socket.user.id,
        }
      );
    }
  );

  socket.on(
    'call-accept',
    ({ to, roomId }) => {

      io.to(
        USER_ROOM(to)
      ).emit(
        'call-accepted',
        {
          from: socket.user.id,
          roomId,
        }
      );
    }
  );
};