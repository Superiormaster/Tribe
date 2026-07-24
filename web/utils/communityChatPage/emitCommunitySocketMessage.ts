import { updateCommunityMessage, syncCommunityServerMessage } from "@/lib/communityMessageDB";
import { safeEmit } from "@/utils/chat/safeEmit";

export const emitCommunitySocketMessage = async (
  socket: any,
  msg: any,
  ownerId: number,
  setMessages?: any
) => {
  console.log("emitCommunitySocketMessage called");
  console.log("socket.connected =", socket?.connected);
  
  return new Promise(async(resolve, reject) => {
    const payload = {
      client_id: msg.client_id,
      chat: msg.chat,
      sender: msg.sender,
      encrypted_text: msg.encrypted_text,
      caption: msg.caption,
    
      media_type: msg.media_type,
    
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
    
      reply_to: msg.reply_to,
      created_at: msg.created_at,
    };
    console.log("payload =", payload);

    try {
      console.log("Calling safeEmit(send_message)");
      await safeEmit("send_message", payload, async (ack: any) => {
        try {
          console.log("ACK RECEIVED", ack);
          if (!ack?.ok) {
            await updateCommunityMessage(msg.client_id, ownerId, {
              status: "failed",
            });
  
            setMessages?.((prev: any) =>
              prev.map((m: any) =>
                m.client_id === msg.client_id
                  ? { ...m, status: "failed" }
                  : m
              )
            );
  
            return resolve(ack);
          }
  
          // ONLY PATCH SERVER FIELDS (NO RE-NORMALIZATION)
          const finalMessage = {
            ...msg,
            server_id: ack.message.id,
            created_at: ack.message.created_at,
            status: "sent",
          };
  
          await syncCommunityServerMessage(
            msg.client_id,
            ownerId,
            {
                server_id:ack.message.id,
                status:"sent",
                created_at:ack.message.created_at
            }
          );
  
          window.dispatchEvent(
            new CustomEvent("community-message-delivered-ack", {
              detail: {
                client_id: msg.client_id,
                messageId: ack.message.id,
              },
            })
          );
          window.dispatchEvent(
            new CustomEvent(
              "community-message-synced",
              {
                detail: {
                  chat:
                    finalMessage.chat,
                  client_id:
                    msg.client_id,
                  messageId:
                    ack.message.id,
                },
              }
            )
          );
  
          setMessages?.((prev: any) =>
            prev.map((m: any) =>
              m.client_id === msg.client_id
                ? { ...m, ...finalMessage }
                : m
            )
          );
  
          resolve(ack);
        } catch (err) {
          console.log("emitSocketMessage ERROR", err);
          reject(err);
        }
      });
    } catch (err) {
      reject(err);
    }
  });
};