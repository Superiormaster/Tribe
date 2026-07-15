import { ensureConnected } from "./waitForConnect";
import { getSocket } from "@/lib/socket";

export async function safeEmit(
  event: string,
  data: any,
  ack?: (...args: any[]) => void
) {
  console.log("safeEmit ->", event);
  console.log("ack =", ack);

  const socket = await getSocket();

  const ok = await ensureConnected(socket);
  if (!ok) throw new Error("Socket not connected");

  console.log("connected =", socket.connected);

  socket.emit(event, data, (...args: any[]) => {
    console.log("RAW ACK", args);
    ack?.(...args);
  });
}