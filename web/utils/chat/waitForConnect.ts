import type { Socket } from "socket.io-client";

export const waitForConnect = (
  socket: Socket,
  timeout = 15000
): Promise<void> => {
  if (!socket) {
    return Promise.reject(
      new Error("Socket instance is missing")
    );
  }

  if (socket.connected) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    let finished = false;

    let timer: ReturnType<typeof setTimeout>;

    const cleanup = () => {
      if (typeof socket.off === "function") {
        socket.off("connect", onConnect);
        socket.off("connect_error", onError);
      }

      clearTimeout(timer);
    };

    const finish = () => {
      if (finished) return;

      finished = true;
      cleanup();

      resolve();
    };

    const onConnect = () => {
      console.log(
        "🔌 SOCKET CONNECTED WHILE WAITING:",
        socket.id
      );

      finish();
    };

    const onError = (error: Error) => {
      console.error(
        "❌ SOCKET CONNECTION ERROR:",
        error
      );
    };

    timer = setTimeout(() => {
      if (finished) return;

      finished = true;
      cleanup();

      reject(
        new Error(
          "Socket connection timeout"
        )
      );
    }, timeout);

    if (
      typeof socket.once !== "function" ||
      typeof socket.on !== "function"
    ) {
      cleanup();

      reject(
        new Error(
          "Invalid socket: expected Socket.IO Socket"
        )
      );

      return;
    }

    socket.once(
      "connect",
      onConnect
    );

    socket.on(
      "connect_error",
      onError
    );

    if (socket.connected) {
      finish();
      return;
    }

    if (
      typeof socket.connect === "function"
    ) {
      socket.connect();
    }
  });
};

export const ensureConnected = async (
  socket: Socket
): Promise<boolean> => {
  if (!socket) {
    return false;
  }

  if (socket.connected) {
    return true;
  }

  try {
    await waitForConnect(socket);

    return true;
  } catch (error) {
    console.error(
      "❌ ensureConnected failed:",
      error
    );

    return false;
  }
};