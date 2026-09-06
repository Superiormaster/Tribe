import type { Socket } from "socket.io-client";
import { getSocket } from "@/lib/socket";
import { ensureConnected } from "./waitForConnect";

export async function safeEmit(
  event: string,
  data: any,
  ackHandler?: (ack: any) => Promise<void> | void
): Promise<any> {

  console.log("");
  console.log("========================================");
  console.log("🚀 [SEND 5] safeEmit");
  console.log("========================================");

  const socket: Socket = await getSocket();

  console.log(
    "🔌 [SEND 5] socket:",
    socket
  );

  console.log(
    "🔌 [SEND 5] socket.id:",
    socket?.id
  );

  console.log(
    "🔌 [SEND 5] connected:",
    socket?.connected
  );

  if (
    !socket ||
    typeof socket.emit !== "function" ||
    typeof socket.on !== "function" ||
    typeof socket.off !== "function"
  ) {
    throw new Error(
      "Invalid Socket.IO socket returned by getSocket()"
    );
  }

  const connected =
    await ensureConnected(socket);

  if (!connected) {
    throw new Error(
      "Socket not connected"
    );
  }

  return new Promise((resolve, reject) => {

    let settled = false;

    const finishResolve = (value: any) => {
      if (settled) return;

      settled = true;
      resolve(value);
    };

    const finishReject = (error: any) => {
      if (settled) return;

      settled = true;
      reject(error);
    };

    socket
      .timeout(20000)
      .emit(
        event,
        data,
        async (
          err: any,
          ack: any
        ) => {

          if (err) {
            console.error(
              "❌ [SEND 5] SOCKET ACK TIMEOUT:",
              err
            );

            finishReject(err);
            return;
          }

          console.log(
            "🔥 [SEND 5] ACK RECEIVED:",
            ack
          );

          try {

            if (ackHandler) {
              await ackHandler(ack);
            }

            finishResolve(ack);

          } catch (error) {

            finishReject(error);
          }
        }
      );
  });
}