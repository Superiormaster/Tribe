'use client';

import { useEffect, useRef } from 'react';
import { connectSocket } from '@/lib/socket';
import { apiRequest } from '@/utils/api';
import { flushOfflineMessages } from "@/lib/offlineFlush";
import { useNetworkStatus } from "@/utils/useNetworkStatus";

export function useChatSocket(
  chatIdNum: number | null,
  currentUser: any
) {
  const socketRef = useRef<any>(null);
  const mountedRef = useRef(true);
  const isOnline = useNetworkStatus();

  useEffect(() => {
    if (!isOnline) return;
  
    const socket = socketRef.current;
  
    if (!socket) return;
  
    const timer = setTimeout(() => {
      if (socket?.connected) {
        console.log("🌐 Network restored");
        flushOfflineMessages(currentUser.id);
      }
    }, 1000);
  
    return () => clearTimeout(timer);
  
  }, [isOnline, currentUser?.id]);
  
  useEffect(() => {
    console.log(
      "NETWORK:",
      isOnline
    );
  }, [isOnline]);
  
  useEffect(() => {
    if (!chatIdNum) return;

    mountedRef.current = true;

    let socket: any;

    const init = async () => {
      try {
        const auth = await apiRequest("api/users/socket-auth/", {
          method: "POST",
        });

        if (!mountedRef.current) return;

        socket = connectSocket(auth);
        socketRef.current = socket;

        // ======================
        // CONNECT
        // ======================
        const handleConnect = () => {
          console.log("✅ socket connected:", socket.id);

          socket.emit("join_chat", {
            chatId: chatIdNum,
          });

          socket.emit("mark_seen", {
            chatId: chatIdNum,
          });

          flushOfflineMessages(currentUser.id);
        };

        socket.on("connect", handleConnect);

        // ======================
        // RECEIVE MESSAGE
        // ======================
        const handleMessage = (msg: any) => {
          console.log("📩 SOCKET:", msg);
        
          if (Number(msg.chatId || msg.chat) !== Number(chatIdNum)) return;
        
          const normalized = {
            localId: msg.clientId,
            id: msg.id,
        
            chatId: msg.chatId,
        
            senderId: msg.sender || msg.senderId,
        
            username: msg.sender_username,
        
            text: msg.encrypted_text || "",
        
            media_url: msg.media_url || null,
            media_type: msg.media_type || null,
        
            status: 'sent',
        
            created_at: msg.created_at,
          };
        
          socketRef.current?.onMessage?.(normalized);
        };

        socket.on("receive_message", handleMessage);

        // ======================
        // DELIVERED
        // ======================
        socket.on("delivered", (data) => {
          socketRef.current?.onDelivered?.(data);
        });

        // ======================
        // SEEN
        // ======================
        socket.on("seen", (data) => {
          socketRef.current?.onSeen?.(data);
        });

        // ======================
        // REACTIONS
        // ======================
        socket.on("reaction", (data) => {
          socketRef.current?.onReaction?.(data);
        });

        // ======================
        // TYPING
        // ======================
        socket.on("typing", (data) => {
          socketRef.current?.onTyping?.(data);
        });

        socket.on("stop_typing", (data) => {
          socketRef.current?.onStopTyping?.(data);
        });

        // ======================
        // USER STATUS
        // ======================
        socket.on("user_status", (data) => {
          socketRef.current?.onUserStatus?.(data);
        });

        // ======================
        // STORE CLEANUP
        // ======================
        socketRef.current.__handlers = {
          handleConnect,
          handleMessage,
        };

      } catch (err) {
        console.error("Socket init failed:", err);
      }
    };

    init();

    // ======================
    // CLEANUP
    // ======================
    return () => {
      mountedRef.current = false;

      const socket = socketRef.current;

      if (socket) {
        const h = socket.__handlers;

        if (h) {
          socket.off("connect", h.handleConnect);
          socket.off("receive_message", h.handleMessage);
        }

        socket.off();
      }
    };
  }, [chatIdNum]);

  return socketRef;
}