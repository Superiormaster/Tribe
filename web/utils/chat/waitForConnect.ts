const waitForConnect = (
  socket,
  timeout = 10000
) =>
  new Promise((resolve, reject) => {
    if (socket.connected) {
      resolve(true);
      return;
    }
    console.log(
        "Socket connected:",
        socket.connected,
        "active:",
        socket.active
    );

    const timer = setTimeout(() => {
      cleanup();
      reject(
        new Error(
          "Socket connection timeout"
        )
      );
    }, timeout);

    const cleanup = () => {
      clearTimeout(timer);

      socket.off(
        "connect",
        onConnect
      );

      socket.off(
        "connect_error",
        onError
      );
    };

    const onConnect = () => {
      cleanup();
      resolve(true);
    };

    const onError = err => {
      cleanup();
      reject(err);
    };

    socket.on(
      "connect",
      onConnect
    );

    socket.on(
      "connect_error",
      onError
    );

    if (!socket.active) {
      socket.connect();
    }
  });

export const ensureConnected = async (
  socket
) => {
  if (socket.connected) {
    return true;
  }
  console.log(
      "Socket connected:",
      socket.connected,
      "active:",
      socket.active
  );

  try {
    await waitForConnect(socket);
    return true;
  } catch {
    return false;
  }
};