import {
  replaceOptimisticMessage,
  updateMessage,
} from '@/lib/messageDB';
import { normalizeMessage } from '@/utils/chat/messageNormalizer';

export const emitMessage = async (
  socket: any,
  msg: any,
  ownerId: number,
  setMessages?: any
) => {
  return new Promise((resolve, reject) => {
    socket.emit(
      "send_message",
      {
        clientId: msg.localId,
        chatId: msg.chatId,
        encrypted: msg.encrypted_text || msg.encrypted,
        reply_to: msg.reply_to || null,
      },
      async (ack: any) => {
        console.log(
          "ACK RECEIVED",
          JSON.stringify(ack, null, 2)
        );
        console.log(
          "SENDING REPLY:",
          JSON.stringify(msg.reply_to, null, 2)
        );
        try {
          if (!ack?.ok) {
            await updateMessage(msg.localId, ownerId, {
              status: "failed",
            });
            return;
          }
    
          console.log(
            "ACK MESSAGE:",
            JSON.stringify(ack.message, null, 2)
          );
    
          const finalMessage = normalizeMessage({
            localId: msg.localId,
            id: ack.message.id,
            chatId: msg.chatId,
            ownerId: msg.ownerId,
            encrypted_text: msg.encrypted_text,
            status: "sent",
            created_at: ack.message.created_at,
            reply_to: msg.reply_to || ack.message.reply_to || null,
          }, msg.ownerId);
    
          await replaceOptimisticMessage(
            msg.localId,
            finalMessage,
            ownerId
          );
          console.log(
            "FINAL MESSAGE",
            JSON.stringify(finalMessage, null, 2)
          );
  
          resolve(ack);
    
          if (setMessages) {
            setMessages((prev: any) =>
              prev.map((m: any) =>
                m.localId === msg.localId ? finalMessage : m
              )
            );
          }
        } catch (err) {
          reject(err);
        }
      }
    );
  });
};