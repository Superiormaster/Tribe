import { updateMessage, syncServerMessage } from "@/lib/messageDB";
import { sortMessages } from "@/utils/chat/messageMerger";
import type {
  MessageStatus,
  MediaStatus,
} from "@/utils/chat/messageContract";
import {
  classifyMessageError,
} from "@/utils/chat/messageSendError";
import { safeEmit } from "./safeEmit";

export const emitSocketMessage = async (
  socket: any,
  msg: any,
  ownerId: number,
  setMessages?: any
) => {

  console.log("");
  console.log("========================================");
  console.log("🚀 [SEND 4] emitSocketMessage");
  console.log("========================================");

  console.log(
    "socket:",
    socket
  );

  console.log(
    "socket.connected:",
    socket?.connected
  );

  console.log(
    "socket.id:",
    socket?.id
  );

  console.log(
    "msg:",
    msg
  );

  return new Promise(
    async (resolve, reject) => {

      const payload = {
        client_id:
          msg.client_id,

        chat:
          msg.chat,

        sender:
          msg.sender,

        encrypted_text:
          msg.encrypted_text,

        caption:
          msg.caption,
  
        media_source:
          msg.media_source ||
          (
            msg.media_asset_ids?.length
              ? "upload"
              : msg.media_url?.length
                ? "external"
                : null
          ),

        media_type:
          msg.media_type,

        media_asset_ids:
          Array.isArray(
            msg.media_asset_ids
          )
            ? msg.media_asset_ids
            : [],

        media_url:
          Array.isArray(msg.media_url)
            ? msg.media_url
            : msg.media_url
              ? [msg.media_url]
              : [],

        thumbnail:
          Array.isArray(msg.thumbnail)
            ? msg.thumbnail
            : msg.thumbnail
              ? [msg.thumbnail]
              : [],

        duration:
          Array.isArray(msg.duration)
            ? msg.duration
            : msg.duration != null
              ? [msg.duration]
              : [],

        waveform:
          Array.isArray(msg.waveform)
            ? msg.waveform
            : [],

        reply_to:
          msg.reply_to,

        created_at:
          msg.created_at,
        client_created_at:
          msg.client_created_at,
      };

      console.log(
        "📦 [SEND 4] SOCKET PAYLOAD:",
        payload
      );

      try {

        console.log(
          "➡️ [SEND 4] Calling safeEmit..."
        );

        const result =
          await safeEmit(
            "send_message",
            payload,
            async (ack: any) => {

              console.log("");
              console.log(
                "🔥 [SEND 4] SOCKET ACK RECEIVED"
              );
              console.log(
                "ACK:",
                ack
              );

              try {

                if (!ack?.ok) {
                  const failure = classifyMessageError(
                    null,
                    ack
                  );
                
                  console.warn(
                    "[PRIVATE MESSAGE] ACK FAILURE",
                    {
                      client_id: msg.client_id,
                      type: failure.type,
                      message: failure.message,
                      retryable: failure.retryable,
                    }
                  );
                
                  const patch = {
                    status: failure.retryable
                      ? "pending"
                      : "failed",
                
                    error_type:
                      failure.type,
                
                    error_message:
                      failure.message,
                
                    retryable:
                      failure.retryable,
                  };
                
                  await updateMessage(
                    msg.client_id,
                    ownerId,
                    patch
                  );
                
                  setMessages?.((prev: any[]) =>
                    prev.map((m: any) =>
                      m.client_id === msg.client_id
                        ? {
                            ...m,
                            ...patch,
                          }
                        : m
                    )
                  );
                
                  if (failure.retryable) {
                    return resolve({
                      ...ack,
                      ok: false,
                      retryable: true,
                      error_type: failure.type,
                    });
                  }
                
                  return resolve({
                    ...ack,
                    ok: false,
                    retryable: false,
                    error_type: failure.type,
                  });
                }

                console.log(
                  "✅ [SEND 4] ACK OK"
                );

                console.log(
                  "Server message:",
                  ack.message
                );
 
                const ackClientId =
                  ack?.message?.client_id ??
                  ack?.client_id;

                if (!ackClientId) {
                  console.error(
                    "❌ ACK missing client_id",
                    ack
                  );
                
                  return reject(
                    new Error(
                      "ACK missing client_id"
                    )
                  );
                }

                if (
                  ackClientId !== msg.client_id
                ) {
                  console.error(
                    "❌ Invalid ACK client_id",
                    {
                      expected: msg.client_id,
                      received: ackClientId,
                      ack,
                    }
                  );
                
                  await updateMessage(
                    msg.client_id,
                    ownerId,
                    {
                      status: "failed",
                    }
                  );
                
                  return reject(
                    new Error(
                      !ackClientId
                        ? "ACK missing client_id"
                        : "ACK client_id mismatch"
                    )
                  );
                }

                const serverMessage = ack.message;

                const sentPatch = {
                  server_id: serverMessage.id,
                
                  created_at: msg.created_at,
                
                  server_created_at:
                    serverMessage.created_at,
                
                  status: "sent" as MessageStatus,
                
                  upload_progress:
                    msg.files?.length ? 100 : 0,
                
                  media_status:
                    (msg.files?.length
                      ? "uploaded"
                      : "none") as MediaStatus,
                
                  retryable: false,
                
                  error_type: undefined,
                  error_message: undefined,
                };
  
                setMessages?.((prev: any[]) => {
                  const updated = prev.map((m: any) =>
                    m.client_id === msg.client_id
                      ? {
                          ...m,
                          ...sentPatch,
                          status: "sent",
                        }
                      : m
                  );
                
                  console.log(
                    "🟢 [PRIVATE ACK] REACT FORCE SENT",
                    updated.find(
                      (m: any) =>
                        m.client_id === msg.client_id
                    )
                  );
                
                  return sortMessages(
                    updated,
                    ownerId
                  );
                });
  
                try {
                
                  const synced =
                    await syncServerMessage(
                      msg.client_id,
                      ownerId,
                      sentPatch
                    );
                
                  console.log(
                    "🟢 [PRIVATE ACK] IDB SYNC RESULT",
                    synced
                  );
                
                } catch (error) {
                
                  console.error(
                    "⚠️ [PRIVATE ACK] IDB SYNC FAILED — UI REMAINS SENT",
                    error
                  );
                }

                window.dispatchEvent(
                  new CustomEvent(
                    "message-synced",
                    {
                      detail: {
                
                        client_id:
                          msg.client_id,
                
                        messageId:
                          serverMessage.id,
                      },
                    }
                  )
                );

                resolve(ack);

              } catch (err) {

                console.error(
                  "❌ [SEND 4] ACK HANDLER ERROR:",
                  err
                );

                reject(err);
              }
            }
          );

        console.log(
          "⬅️ [SEND 4] safeEmit returned:",
          result
        );

      } catch (err) {

        console.error(
          "❌ [SEND 4] safeEmit THREW:",
          err
        );

        reject(err);
      }
    }
  );
};