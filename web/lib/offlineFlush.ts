import { getSocket } from "./socket";

import {
  getPendingMessages,
  replaceOptimisticMessage,
  updateMessage,
} from "./messageDB";
import { emitMessage } from "@/utils/chat/emitMessage";

export const flushOfflineMessages = async (
    ownerId: number
  ) => {
    console.log("FLUSH CALLED");
  const socket = getSocket();

  if (!navigator.onLine || !socket?.connected) return;

  const pending =
  await getPendingMessages(ownerId);

  for (const msg of pending) {
    try {
      await emitMessage(socket, msg, ownerId);
  
      await new Promise(r =>
        setTimeout(r, 200)
      );
    } catch (err) {
      console.error(err);

      await updateMessage(
        msg.localId,
        ownerId,
        {
          status: "failed",
        }
      );
    }
  }
};