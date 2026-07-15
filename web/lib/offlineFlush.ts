import { getSocket } from "./socket";

import {
  getPendingMessages,
  updateMessage,
} from "./messageDB";
import { emitSocketMessage as emitMessage } from "@/utils/chat/emitMessage";
import { uploadMediaFiles } from "@/utils/chat/mediaUpload";
import type { Socket } from "socket.io-client";
import type { Message } from "@/utils/chat/messageContract";
import type { Dispatch, SetStateAction } from "react";

async function resendTextMessage(
  socket: Socket,
  msg: Message,
  ownerId: number,
  setMessages?: React.Dispatch<React.SetStateAction<Message[]>>
) {
  await emitMessage(
    socket,
    msg,
    ownerId,
    setMessages
  );
}


async function resendMediaMessage(
  socket: Socket,
  msg: Message,
  ownerId: number,
  setMessages?: Dispatch<SetStateAction<Message[]>>
) {
  let message = { ...msg };

  const needsUpload =
    !!message.files?.length &&
    (message.media_url ?? []).some((url) =>
      url.startsWith("blob:")
    );

  if (needsUpload && message.files) {
    const uploaded = await uploadMediaFiles(message.files);

    message = {
      ...message,
      media_type: uploaded.media_type,
      media_url: uploaded.media_url,
      thumbnail: uploaded.thumbnail,
      duration: message.duration,
    };
  }

  await emitMessage(
    socket,
    message,
    ownerId,
    setMessages
  );
}

let flushing = false;

export const flushOfflineMessages =
  async (
    socket: Socket,
    ownerId: number,
    setMessages?: Dispatch<SetStateAction<Message[]>>
  ) => {
    if (flushing) {
      return;
    }

    console.log("FLUSH CALLED");

    flushing = true;

    try {
      console.log("Before getPendingMessages");

      const pending = await getPendingMessages(ownerId);
      if (pending.length === 0) return;
      
      console.log("After getPendingMessages");
      console.log("PENDING", pending);

      for (const msg of pending) {
        try {
          if (msg.media_type === "text") {
            await resendTextMessage(
              socket,
              msg,
              ownerId,
              setMessages
            );
          } else {
            await resendMediaMessage(
              socket,
              msg,
              ownerId,
              setMessages
            );
          }
      
          await waitForAck();
      
        } catch (err) {
          console.error(err);
      
          await updateMessage(
            msg.client_id,
            ownerId,
            {
              status: "failed",
            }
          );
        }
      }
    } finally {
      flushing = false;
    }
  };

function waitForAck(timeout = 5000) {
  return new Promise(resolve => {
    const handler = () => {
      window.removeEventListener(
        "message-delivered-ack",
        handler
      );
      resolve(null);
    };

    window.addEventListener(
      "message-delivered-ack",
      handler,
      { once: true }
    );

    setTimeout(() => {
      window.removeEventListener(
        "message-delivered-ack",
        handler
      );
      resolve(null);
    }, timeout);
  });
}