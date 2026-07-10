'use client';

import {
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { apiRequest } from '@/utils/api';
import { ensureConnected } from '@/utils/chat/waitForConnect';
import { flushOfflineMessages } from '@/lib/offlineFlush';
import { useNetwork } from '@/components/networkConnection/NetworkContext';
import {
  getSocket,
  reconnectSocket,
} from "@/lib/socket";

export function useGlobalSocket(
  currentUser: any
) {
  const socketRef = useRef<any>(null);
  
  const handlersRef = useRef<{
    onConnect?: () => void;
    onDelivered?: (data: any) => void;
    onSeen?: (data: any) => void;
  
    onSocketConnected?: () => void;
    onSocketDisconnected?: () => void;
    onReconnectAttempt?: (
      n: number
    ) => void;
    onReconnect?: (
      n: number
    ) => void;
    onConnectError?: (
      err: any
    ) => void;
    onMessageDeliveredAck?: (data: any) => void;
  }>({});

  const {
    isOnline,
    finishReconnect,
  } = useNetwork();

  const reconnect = useCallback(
    async () => {
      if (
        !isOnline ||
        !currentUser?.id
      ) {
        finishReconnect();
        return;
      }

      try {
        await reconnectSocket();

        const socket = await getSocket();
        console.log("Socket instance", socket);
        console.log("Socket id", socket.id);
        console.log("Connected", socket.connected);

        if (!socket) {
          return;
        }

        await ensureConnected(socket);

        socket.emit(
          'user_online'
        );
        console.log("Reconnect finished");
        console.log("Calling flush");

        await flushOfflineMessages(
          socket,
          currentUser.id
        );
      } catch (err) {
        console.error(
          'Reconnect failed',
          err
        );
      } finally {
        finishReconnect();
      }
    },
    [
      isOnline,
      currentUser?.id,
      finishReconnect,
    ]
  );

  useEffect(() => {
    if (!currentUser?.id) {
      return;
    }

    window.addEventListener(
      'network-reconnected',
      reconnect
    );

    return () => {
      window.removeEventListener(
        'network-reconnected',
        reconnect
      );
    };
  }, [reconnect, currentUser?.id]);
  
  useEffect(() => {
    if (!currentUser?.id) return;
  
    const interval = setInterval(async () => {
      if (!navigator.onLine) return;
    
      const socket = await getSocket();
    
      if (!socket.connected) return;
    
      await flushOfflineMessages(socket, currentUser.id);
    }, 120000); 
  
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id) {
      return;
    }

    let mounted = true;

    const init = async () => {
      try {
        const socket =
          await getSocket();
  
        if (!mounted) return;

        if (!socket) {
          return;
        }

        socketRef.current =
          socket;
  
        const onSocketConnected =
          () => {
            window.dispatchEvent(
              new Event(
                "socket-connected"
              )
            );
          };
  
        const onSocketDisconnected =
          () => {
            window.dispatchEvent(
              new Event(
                "socket-disconnected"
              )
            );
          };
  
        const onReconnectAttempt =
          (attempt: number) => {
            console.log(
              "reconnect attempt",
              attempt
            );
          };
  
        const onReconnect =
          (attempt: number) => {
            console.log(
              "reconnected",
              attempt
            );
          };
  
        const onConnectError =
          (err: any) => {
            console.error(
              "connect error",
              err
            );
          };

        if (
          handlersRef.current
            .onConnect
        ) {
          socket.off(
            'connect',
            handlersRef.current
              .onConnect
          );

          socket.off(
            'delivered',
            handlersRef.current
              .onDelivered
          );

          socket.off(
            'seen',
            handlersRef.current
              .onSeen
          );
        }

        const onConnect =
          async () => {
            if (
              !currentUser?.id
            ) {
              return;
            }

            console.log(
              '🌍 Global socket connected'
            );

            console.log("Connected",socket.id);

            socket.emit(
              'user_online'
            );

            socket.emit(
              "join_notifications"
            );

            try {
              await flushOfflineMessages(
                socket,
                currentUser.id
              );
            } catch (err) {
              console.error(
                'Flush failed',
                err
              );
            }
          };

        const onDelivered = (
          data: any
        ) => {
          window.dispatchEvent(
            new CustomEvent(
              'message-delivered',
              {
                detail: data,
              }
            )
          );
        };

        const onSeen = (
          data: any
        ) => {
          window.dispatchEvent(
            new CustomEvent(
              'message-seen',
              {
                detail: data,
              }
            )
          );
        };
  
        const onMessageDeliveredAck = (data: any) => {
          window.dispatchEvent(
            new CustomEvent("message-delivered-ack", {
              detail: data,
            })
          );
        };

        handlersRef.current = {
          onConnect,
          onDelivered,
          onSeen,
          onMessageDeliveredAck,
        
          onSocketConnected,
          onSocketDisconnected,
          onReconnectAttempt,
          onReconnect,
          onConnectError,
        };

        socket.on(
          'connect',
          onConnect
        );
  
        socket.on(
          "connect",
          onSocketConnected
        );
  
        socket.on(
          "disconnect",
          onSocketDisconnected
        );
  
        socket.io.on(
          "reconnect_attempt",
          onReconnectAttempt
        );
  
        socket.io.on(
          "reconnect",
          onReconnect
        );
  
        socket.on(
          "connect_error",
          onConnectError
        );

        socket.on(
          'delivered',
          onDelivered
        );

        socket.on(
          'seen',
          onSeen
        );
  
        socket.on(
          "message_delivered_ack",
          onMessageDeliveredAck
        );

        if (
          !socket.connected
        ) {
          socket.connect();
        }
      } catch (err) {
        console.error(
          'Global socket init failed:',
          err
        );
      }
    };

    init();

    return () => {
      mounted = false;

      const socket =
        socketRef.current;

      const h =
        handlersRef.current;

      socket?.off(
        "connect",
        h.onConnect
      );
      
      socket?.off(
        "connect",
        h.onSocketConnected
      );
      
      socket?.off(
        "disconnect",
        h.onSocketDisconnected
      );
      
      socket?.off(
        "delivered",
        h.onDelivered
      );
      
      socket?.off(
        "message_delivered_ack",
        h.onMessageDeliveredAck
      );
      
      socket?.off(
        "seen",
        h.onSeen
      );
      
      socket?.off(
        "connect_error",
        h.onConnectError
      );
      
      socket?.io.off(
        "reconnect_attempt",
        h.onReconnectAttempt
      );
      
      socket?.io.off(
        "reconnect",
        h.onReconnect
      );

      handlersRef.current =
        {};
    };
  }, [currentUser?.id]);

  return socketRef;
}