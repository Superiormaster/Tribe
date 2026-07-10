import { getSocket } from "./socket";

import {
  getPendingMessages,
  updateMessage,
} from "./messageDB";
import { emitSocketMessage as emitMessage } from "@/utils/chat/emitMessage";
import { uploadMediaFiles } from "@/utils/chat/mediaUpload";

async function resendTextMessage(
  socket,
  msg: Message,
  ownerId,
  setMessages?
) {
  await emitMessage(
    socket,
    msg,
    ownerId,
    setMessages
  );
}

async function resendMediaMessage(
  socket: any,
  msg: Message,
  ownerId: number,
  setMessages?
) {
  let message = { ...msg };

  const needsUpload =
    message.files?.length &&
    message.media_url.some(url => url.startsWith("blob:"));

  if (needsUpload) {
    const uploaded = await uploadMediaFiles(message.files);

    message = {
      ...message,
      media_type: uploaded.media_type,
      media_url: uploaded.media_url,
      thumbnail: uploaded.thumbnail,
      duration: uploaded.duration,
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
    setMessages?
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