'use client';

import { useEffect, useRef } from 'react';
import { connectSocket } from '@/lib/socket';
import { apiRequest } from '@/utils/api';
import { openDB } from 'idb';
import { decryptMessage } from '@/lib/crypto';

export function useChatSocket(
  chatIdNum: number | null,
  setMessages: any,
  setIsTyping: any,
  currentUser: any
) {
  const socketRef = useRef<any>(null);
  const dbRef = useRef<any>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    if (!chatIdNum) return;

    mountedRef.current = true;

    const init = async () => {
      try {
        dbRef.current = await openDB("chat-db", 2, {
          upgrade(db) {
            if (!db.objectStoreNames.contains("messages")) {
              const store = db.createObjectStore("messages", { keyPath: "id" });
              store.createIndex("chatId", "chatId");
            }
          },
        });

        const auth = await apiRequest("api/users/socket-auth/", {
          method: "POST",
        });

        if (!mountedRef.current) return;

        const socket = connectSocket(auth);
        socketRef.current = socket;

        socket.on("connect", () => {
          console.log("✅ connected:", socket.id);

          socket.emit("join_chat", { chatId: chatIdNum });
        });

        // ================= RECEIVE MESSAGE =================
        socket.on("receive_message", async (msg: any) => {
          try {
            let text = msg.text;

            if (msg.encrypted) {
              text = await decryptMessage(
                currentUser.privateKey,
                msg.encrypted
              );
            }

            const finalMsg = {
              ...msg,
              text,
              chatId: msg.chatId || chatIdNum,
            };

            const existing = await dbRef.current.get("messages", msg.id);
            if (existing) return;

            await dbRef.current.put("messages", finalMsg);

            const tx = dbRef.current.transaction("messages", "readonly");
            const index = tx.store.index("chatId");
            const messages = await index.getAll(chatIdNum);

            setMessages(messages);
          } catch (err) {
            console.error("decrypt/save failed:", err);
          }
        });

        // ================= EVENTS =================
        socket.on("delivered", ({ messageId }) => {
          setMessages((prev: any[]) =>
            prev.map(m =>
              m.id === messageId ? { ...m, status: "delivered" } : m
            )
          );
        });

        // =========================
        // 😀 REACTIONS
        // =========================
        socket.on("reaction", (data) => {
          setMessages((prev: any[]) =>
            prev.map((msg) => {
              if (msg.id !== data.messageId) return msg;

              const reactions = msg.reactions || [];
              const existing = msg.reactions?.find(
                (r) => r.userId === data.userId
              );

              let updated;

              if (existing) {
                updated = reactions.map((r) =>
                  r.userId === data.userId ? data : r
                );
              } else {
                updated = [...(reactions || []), data];
              }

              return { ...msg, reactions: updated };
            })
          );
        });

        socket.on("seen", ({ messageIds }) => {
          setMessages((prev: any[]) =>
            prev.map(m =>
              messageIds?.includes(m.id)
                ? { ...m, status: "read" }
                : m
            )
          );
        });

        socket.on("typing", ({ userId }) => {
          if (userId !== currentUser.id) setIsTyping(true);
        });

        socket.on("stop_typing", ({ userId }) => {
          if (userId !== currentUser.id) setIsTyping(false);
        });

        socket.on("user_status", ({ userId, status }) => {
          console.log("User status:", userId, status);
        });

        socket.emit("mark_seen", { chatId: chatIdNum });

        // ================= VISIBILITY FIX =================
        document.addEventListener("visibilitychange", () => {
          if (!socketRef.current) return;

          if (document.hidden) {
            console.log("🔄 reconnect trigger");
            socketRef.current.disconnect();
          }
        });

      } catch (err) {
        console.error("Socket init failed:", err);
      }
    };

    init();

    return () => {
      mountedRef.current = false;

      if (socketRef.current) {
        socketRef.current.off();
        socketRef.current.disconnect();
      }
    };
  }, [chatIdNum]);

  return socketRef;
}