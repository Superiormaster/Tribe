import type { Socket } from "socket.io-client";

import {
  emitSocketMessage,
} from "@/utils/chat/emitMessage";

export async function sendMessageThroughQueue(
  socket: Socket,
  message: any,
  ownerId: number,
  setMessages?: any
) {
  console.log(
    "📨 SEND THROUGH QUEUE:",
    message.client_id
  );

  if (!socket.connected) {
    throw new Error(
      "Socket is not connected"
    );
  }

  return emitSocketMessage(
    socket,
    message,
    ownerId,
    setMessages
  );
}

type FlushFunction =
  () => Promise<void>;

let privateFlushPromise:
  Promise<void> | null = null;

let communityFlushPromise:
  Promise<void> | null = null;

export function runPrivateFlush(
  flush: FlushFunction
): Promise<void> {
  if (privateFlushPromise) {
    return privateFlushPromise;
  }

  privateFlushPromise = flush();

  privateFlushPromise =
    privateFlushPromise.finally(() => {
      privateFlushPromise = null;
    });

  return privateFlushPromise;
}

export function runCommunityFlush(
  flush: FlushFunction
): Promise<void> {
  if (communityFlushPromise) {
    return communityFlushPromise;
  }

  communityFlushPromise = flush();

  communityFlushPromise =
    communityFlushPromise.finally(() => {
      communityFlushPromise = null;
    });

  return communityFlushPromise;
}

export async function waitForPrivateFlush() {
  if (privateFlushPromise) {
    await privateFlushPromise;
  }
}

export async function waitForCommunityFlush() {
  if (communityFlushPromise) {
    await communityFlushPromise;
  }
}

export async function waitForAllFlushes() {
  await Promise.all([
    privateFlushPromise,
    communityFlushPromise,
  ]);
}