import { io, Socket } from "socket.io-client";
import { flushOfflineMessages } from "./offlineFlush";
import { apiRequest } from "@/utils/api";

let socketInstance: Socket | null = null;

// ----------------------
// CONNECT SOCKET
// ----------------------
export const connectSocket = (user: any) => {
  if (!socketInstance) {
    socketInstance = io(
      process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000",
      {
        auth: {
          user: {
            user_id: user.user_id,
            username: user.username,
            avatar: user.avatar,
            token: user.token,
          },
        },
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 2000,
      }
    );

    socketInstance.on("connect", () => {
      console.log("✅ socket connected");

      flushOfflineMessages();
    });

    socketInstance.on("disconnect", async (reason) => {
      console.log("socket disconnected", reason);
    
      try {
        const auth = await apiRequest(
          "api/users/socket-auth/",
          { method: "POST" }
        );
    
        socketInstance.auth = {
          user: {
            user_id: auth.user_id,
            username: auth.username,
            avatar: auth.avatar,
            token: auth.token,
          },
        };
    
        socketInstance.connect();
    
      } catch (err) {
        console.error("reconnect failed");
      }
    });
  }

  return socketInstance;
};

export const getSocket = () => socketInstance;