const express =
  require("express");

const http =
  require("http");

const { Server } =
  require("socket.io");

const cors =
  require("cors");

const authenticate =
  require("./servers/auth");

const privateChatSocket =
  require("./sockets/privateChatSocket");

const communitySocket =
  require("./sockets/communitySocket");

const presenceSocket =
  require("./sockets/presenceSocket");

const callSocket =
  require("./sockets/callSocket");

const pushRoutes =
  require("./routes/push");

const app =
  express();

app.use(
  express.json()
);

app.use(
  cors({
    origin:
      "http://localhost:3000",
    credentials: true,
  })
);

app.use(
  "/push",
  pushRoutes
);

const server =
  http.createServer(app);

const io =
  new Server(server, {
    cors: {
      origin:
        "http://localhost:3000",
      credentials: true,
    },
  });
console.log("SERVER PID", process.pid);

io.on(
  "connection",
  async socket => {
    socket.onAny((event, ...args) => {
        console.log("EVENT:", event, args);
    });
    console.log("NEW CONNECTION", socket.id);
    const ok =
      await authenticate(
        socket
      );
  
    console.log("AUTH RESULT", ok);

    if (!ok) {
        console.log("AUTH FAILED");
        return;
    }
  
    console.log("REGISTERING EVENTS");

    presenceSocket(
      io,
      socket
    );

    privateChatSocket(
      io,
      socket
    );

    communitySocket(
      io,
      socket
    );

    callSocket(
      io,
      socket
    );
  }
);

server.listen(
  5000,
  () => {
    console.log(
      "🚀 Socket server running on 5000"
    );
  }
);