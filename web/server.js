// server.js

const express = require('express');

const http = require('http');

const { Server } = require('socket.io');

const cors = require('cors');

const authenticate = require(
  './servers/auth'
);

const privateChatSocket = require(
  './sockets/privateChatSocket'
);

const communitySocket = require(
  './sockets/communitySocket'
);

const presenceSocket = require(
  './sockets/presenceSocket'
);

const callSocket = require(
  './sockets/callSocket'
);

const app = express();

app.use(
  cors({
    origin: 'http://localhost:3000',
    credentials: true,
  })
);

const server =
  http.createServer(app);

const io = new Server(server, {
  cors: {
    origin:
      'http://localhost:3000',
    credentials: true,
  },
});

io.on(
  'connection',
  async (socket) => {

    const ok =
      await authenticate(socket);

    if (!ok) return;

    // SOCKET MODULES
    presenceSocket(io, socket);

    privateChatSocket(io, socket);

    communitySocket(io, socket);

    callSocket(io, socket);
  }
);

server.listen(5000, () => {

  console.log(
    '🚀 Socket server running on 5000'
  );
});