'use client';

import { useEffect, useRef } from 'react';
import { reconnectSocket } from "@/lib/socket";
import {
  mergeMessages,
  sortMessages
} from '@/utils/chat/messageMerger';
import type { Message } from "@/utils/chat/messageContract";
import type { Dispatch, SetStateAction } from "react";

type CurrentUser = {
  id: number;
};

export function useChatSocket(
  chatIdNum: number | null,
  currentUser: CurrentUser | null,
  handlers?: {
    onSeen?: (data: any) => void;
    onDelivered?: (data: any) => void;
  }
) {
  const socketRef = useRef<any>(null);
  const mountedRef = useRef(true);

  const {
    onSeen,
    onDelivered,
  } = handlers || {};
  
  useEffect(() => {
    console.log("MOUNT useChatSocket", chatIdNum);
    if (!chatIdNum) return;

    mountedRef.current = true;

    const init = async () => {
      try {
        const socket = await reconnectSocket();
        console.log(socket.id);

        if (!mountedRef.current) {
          return;
        }
  
        socketRef.current = socket;

        // ======================
        // CONNECT
        // ======================
        const handleConnect = () => {
          console.log("✅ socket connected:", socket.id);
  
          socket.emit(
            "user_online"
          );

          socket.emit("join_chat", {
            chatId: chatIdNum,
          });

          socket.emit("mark_seen", {
            chatId: chatIdNum,
          });
        };

        socket.on("connect", handleConnect);

        // ======================
        // RECEIVE MESSAGE
        // ======================
        const handleMessage = (message: Message) => {
          if (Number(message.chat) !== Number(chatIdNum)) return;
        
          socketRef.current?.onMessage?.(message);
        };

        const handleReceiveMessage = (msg:any) => {
          if (
            Number(msg.chat ?? msg.chatId) !== Number(chatIdNum)
          ) {
            return;
          }
      
          handleMessage(msg);
        };
      
        socket.on(
          "receive_message",
          handleReceiveMessage
        );
  
        const handleTyping =
          (data: any) => {
            socketRef.current?.onTyping?.(
              data
            );
          };

        const handleStopTyping =
          (data: any) => {
            socketRef.current?.onStopTyping?.(
              data
            );
          };
  
        const handleReaction =
          (data: any) => {
            socketRef.current?.onReaction?.(
              data
            );
          };
  
        const handleDelivered =
          (data: any) => {
            onDelivered?.(data);
        
            window.dispatchEvent(
              new CustomEvent(
                "message-delivered",
                {
                  detail: data,
                }
              )
            );
          };

        const handleSeen =
          (data: any) => {
            onSeen?.(data);
        
            window.dispatchEvent(
              new CustomEvent(
                "message-seen",
                {
                  detail: data,
                }
              )
            );
          };
  
        const handleUserStatus =
          (data: any) => {
            socketRef.current?.onUserStatus?.(
              data
            );
          };

        socket.on("typing", handleTyping);
        socket.on("stop_typing", handleStopTyping);
        socket.on("reaction", handleReaction);
        socket.on("delivered", handleDelivered);
        socket.on("seen", handleSeen);
        socket.on("user_status", handleUserStatus);

        socketRef.current.setHandlers = ({
          setMessages,
          setIsTyping,
        }: {
          setMessages: Dispatch<SetStateAction<Message[]>>;
          setIsTyping: Dispatch<SetStateAction<boolean>>;
        }) => {
          if (!socketRef.current) return;
        
          socketRef.current.onTyping = (
            { userId }: { userId: number }
          ) => {
        
            if (userId === currentUser?.id)
              return;
        
            setIsTyping(true);
          };
        
          socketRef.current.onStopTyping = (
            { userId }: { userId: number }
          ) => {
              if (userId === currentUser?.id)
                return;
        
              setIsTyping(false);
            };
  
          socketRef.current.onMessage = (message: Message) => {
            setMessages((prev: Message[]) =>
              sortMessages(
                mergeMessages(prev, [message])
              )
            );
          };
        };

        // ======================
        // STORE CLEANUP
        // ======================
        socketRef.current.__handlers = {
          handleConnect,
          handleTyping,
          handleStopTyping,
          handleReaction,
          handleDelivered,
          handleSeen,
          handleReceiveMessage,
          handleUserStatus,
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
      console.log("UNMOUNT useChatSocket", chatIdNum);
      mountedRef.current = false;
    
      const socket = socketRef.current;
      const h = socket?.__handlers;
    
      if (!socket || !h) {
        return;
      }
    
      if (
        socket.connected &&
        chatIdNum
      ) {
        socket.emit("leave_chat", {
          chatId: chatIdNum,
        });
      }
    
      socket.off(
        "connect",
        h.handleConnect
      );
    
      socket.off(
        "receive_message",
        h.handleReceiveMessage
      );
    
      socket.off(
        "typing",
        h.handleTyping
      );
    
      socket.off(
        "stop_typing",
        h.handleStopTyping
      );
    
      socket.off(
        "reaction",
        h.handleReaction
      );
    
      socket.off(
        "delivered",
        h.handleDelivered
      );
    
      socket.off(
        "seen",
        h.handleSeen
      );
    
      socket.off(
        "user_status",
        h.handleUserStatus
      );
    
      socket.__handlers = undefined;
      socketRef.current = null;
    };
  }, [
      chatIdNum,
      currentUser?.id,
    ]);

  return socketRef;
}