"use client";

import { io, Socket } from "socket.io-client";
import { apiRequest } from "@/utils/api";

let socketInstance: Socket | null = null;
let authPromise: Promise<any> | null = null;

async function getSocketAuth() {
  if (authPromise) {
    return authPromise;
  }

  authPromise = apiRequest(
    "api/users/socket-auth/",
    {
      method: "POST",
    }
  );

  try {
    return await authPromise;
  } finally {
    authPromise = null;
  }
}

export async function getSocket() {
  if (socketInstance) {
    return socketInstance;
  }

  const auth =
    await getSocketAuth();

  socketInstance = io(
    process.env.NEXT_PUBLIC_SOCKET_URL!,
    {
      autoConnect: false,

      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      randomizationFactor: 0.5,

      auth: {
        user: {
          user_id: auth.user_id,
          username: auth.username,
          avatar: auth.avatar,
          token: auth.token,
        },
      },
    }
  );
  
  socketInstance.onAnyOutgoing((event, ...args) => {
      console.log("OUTGOING:", event, args);
  });

  return socketInstance;
}

export async function refreshSocketAuth() {
  const socket =
    await getSocket();

  const auth =
    await getSocketAuth();

  socket.auth = {
    user: {
      user_id: auth.user_id,
      username: auth.username,
      avatar: auth.avatar,
      token: auth.token,
    },
  };
}

let connectPromise: Promise<Socket> | null = null;

export async function reconnectSocket(): Promise<Socket> {
  const socket = await getSocket();

  if (socket.connected) {
    return socket;
  }

  if (connectPromise) {
    return connectPromise;
  }

  connectPromise = (async () => {
    try {
      await refreshSocketAuth();

      if (socket.connected) {
        return socket;
      }

      return await new Promise<Socket>(
        (resolve, reject) => {
          let settled = false;

          const cleanup = () => {
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
            if (settled) return;

            settled = true;
            cleanup();

            console.log(
              "🟢 [SOCKET] CONNECTED:",
              socket.id
            );

            resolve(socket);
          };

          const onError = (err: Error) => {
            if (settled) return;

            settled = true;
            cleanup();

            console.error(
              "🔴 [SOCKET] CONNECTION ERROR:",
              err
            );

            reject(err);
          };

          socket.once(
            "connect",
            onConnect
          );

          socket.once(
            "connect_error",
            onError
          );

          if (!socket.connected) {
            socket.connect();
          }
        }
      );
    } finally {
      connectPromise = null;
    }
  })();

  return connectPromise;
}