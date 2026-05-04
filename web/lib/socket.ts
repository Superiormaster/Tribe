import { io, Socket } from "socket.io-client";

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL;
let socket: Socket;

export const connectSocket = (user) => {
  if (!socket) {
    socket = io(
      process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000",
      {
        auth: {
          user: {
            user_id: user.user_id,
            username: user.username,
            avatar: user.avatar,
            token: user.token,
          }
        }
      }
    );
  }
  return socket;
};

export const getSocket = () => socket;

export function localSocket(postId: number) {
  const socket = new WebSocket(
    `${WS_BASE}/ws/comments/${postId}/`
  );

  return socket;
}

export function notificationSocket() {
  return new WebSocket(
    `${WS_BASE}/ws/notifications/`
  );
}