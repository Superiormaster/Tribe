import type { Socket } from "socket.io-client";

import {
  waitForAllFlushes,
} from "@/utils/chat/flushCoordinator";

import {
  emitCommunitySocketMessage,
} from "@/utils/communityChatPage/emitCommunitySocketMessage";

export async function sendCommunityMessageThroughQueue(
  socket: Socket,
  message: any,
  ownerId: number,
  setMessages?: any
) {
  console.log(
    "📨 COMMUNITY SEND THROUGH QUEUE:",
    message.client_id
  );

  await waitForAllFlushes();

  return emitCommunitySocketMessage(
    socket,
    message,
    ownerId,
    setMessages
  );
}