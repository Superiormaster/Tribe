import {
  updateCommunityMessage,
  syncCommunityServerMessage,
} from "@/lib/communityMessageDB";

import type {
  MessageStatus,
  MediaStatus,
} from "@/utils/chat/messageContract";
import { safeEmit } from "@/utils/chat/safeEmit";
import { sortMessages } from "@/utils/chat/messageMerger";
import {
  classifyMessageError,
} from "@/utils/chat/messageSendError";

export const emitCommunitySocketMessage = async (
  socket: any,
  msg: any,
  ownerId: number,
  setMessages?: any
) => {
  console.log("emitCommunitySocketMessage called");
  console.log("socket.connected =", socket?.connected);

  const communityId =
    msg.communityId ??
    msg.community ??
    msg.chat;

  if (!communityId) {
    throw new Error(
      "Community message is missing communityId"
    );
  }
  const mentionUserIds =
    msg?.mention_user_ids ?? [];
  
  const mentionAll =
    msg?.mention_all ?? false;

  const payload = {
    client_id: msg.client_id,

    // COMMUNITY IDENTIFIER
    communityId: Number(communityId),

    sender: msg.sender,

    encrypted_text: msg.encrypted_text,
    caption: msg.caption,

    media_type: msg.media_type,
    media_source:
      msg.media_source ||
      (
        msg.media_asset_ids?.length
          ? "upload"
          : msg.media_url?.length
            ? "external"
            : undefined
      ),

    mentions: Array.isArray(msg.mentions)
      ? msg.mentions
      : [],
    mention_user_ids: mentionUserIds,
    mention_all: mentionAll,
  
    media_asset_ids:
      Array.isArray(
        msg.media_asset_ids
      )
        ? msg.media_asset_ids
        : [],

    media_url: Array.isArray(msg.media_url)
      ? msg.media_url
      : msg.media_url
        ? [msg.media_url]
        : [],

    thumbnail: Array.isArray(msg.thumbnail)
      ? msg.thumbnail
      : msg.thumbnail
        ? [msg.thumbnail]
        : [],

    duration: Array.isArray(msg.duration)
      ? msg.duration
      : msg.duration != null
        ? [msg.duration]
        : [],

    waveform: Array.isArray(msg.waveform)
      ? msg.waveform
      : [],

    reply_to:
      typeof msg.reply_to === "object"
        ? msg.reply_to?.id ?? null
        : msg.reply_to ?? null,

    created_at: msg.created_at,
    client_created_at: msg.client_created_at,
  };

  console.log(
    "🏘️ COMMUNITY SOCKET PAYLOAD =",
    payload
  );

  return new Promise(async (resolve, reject) => {
    try {
      await safeEmit(
        "community_message",
        payload,
        async (ack: any) => {
          try {
            console.log(
              "🏘️ COMMUNITY ACK =",
              ack
            );

            if (!ack?.ok) {
              const failure = classifyMessageError(
                null,
                ack
              );
    
              console.warn(
                "[COMMUNITY MESSAGE] ACK FAILURE",
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
            
              await updateCommunityMessage(
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

            const ackClientId =
              ack?.message?.client_id ??
              ack?.client_id;

            if (!ackClientId) {
              return reject(
                new Error(
                  "ACK missing client_id"
                )
              );
            }

            if (
              ackClientId !==
              msg.client_id
            ) {
              await updateCommunityMessage(
                msg.client_id,
                ownerId,
                {
                  status: "failed",
                }
              );

              return reject(
                new Error(
                  "ACK client_id mismatch"
                )
              );
            }

            const serverMessage = ack.message;

            const sentPatch = {
              server_id: serverMessage.id,
            
              created_at: msg.created_at,
            
              server_created_at:
                serverMessage.created_at,
            
              status:
                "sent" as MessageStatus,
            
              upload_progress:
                msg.files?.length ? 100 : 0,
            
              media_status:
                (
                  msg.files?.length
                    ? "uploaded"
                    : "none"
                ) as MediaStatus,
            
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
                "🟢 [COMMUNITY ACK] REACT FORCE SENT",
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
                await syncCommunityServerMessage(
                  msg.client_id,
                  ownerId,
                  sentPatch
                );
            
              console.log(
                "🟢 [COMMUNITY ACK] IDB SYNC RESULT",
                synced
              );
            
            } catch (error) {
            
              console.error(
                "⚠️ [COMMUNITY ACK] IDB SYNC FAILED — UI REMAINS SENT",
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
              "emitCommunitySocketMessage ACK ERROR:",
              err
            );

            reject(err);
          }
        }
      );
    } catch (err) {
      console.error(
        "emitCommunitySocketMessage ERROR:",
        err
      );

      reject(err);
    }
  });
};