'use client';

import { useEffect, useRef } from 'react';
import { reconnectSocket } from "@/lib/socket";
import {
  mergeMessages,
  sortMessages,
} from "@/utils/chat/messageMerger";
import type { Message } from "@/utils/chat/messageContract";
import type {
  Dispatch,
  SetStateAction,
} from "react";

type CurrentUser = {
  id: number;
};

export function useCommunitySocket(
  communityId: number |null,
  currentUser: CurrentUser | null
) {
  const socketRef = useRef<any>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    if (!communityId) return;

    mountedRef.current = true;

    const init = async () => {
      try {
        const socket = await reconnectSocket();

        if (!mountedRef.current) {
          return;
        }

        socketRef.current = socket;

        // ======================
        // CONNECT
        // ======================

        const handleConnect = () => {
          console.log(
            "✅ community socket connected:",
            socket.id
          );

          socket.emit("join_community", {
            communityId,
          });
        };

        socket.on(
          "connect",
          handleConnect
        );

        if (socket.connected) {
          handleConnect();
        }

        // ======================
        // RECEIVE MESSAGE
        // ======================

        const handleMessage = (
          message: Message
        ) => {
          if (
            Number(
              message.community ??
              message.communityId
            ) !== Number(communityId)
          ) {
            return;
          }

          socketRef.current?.onMessage?.(
            message
          );
        };

        socket.on(
          "community_message",
          handleMessage
        );

        // ======================
        // TYPING
        // ======================

        const handleTyping = (
          data: any
        ) => {
          socketRef.current?.onTyping?.(
            data
          );
        };

        socket.on(
          "community_typing",
          handleTyping
        );

        // ======================
        // REACTION
        // ======================

        const handleReaction = (
          data: any
        ) => {
          socketRef.current?.onReaction?.(
            data
          );
        };

        socket.on(
          "community_reaction",
          handleReaction
        );

        // ======================
        // DELETE
        // ======================

        const handleDelete = (
          data: any
        ) => {
          socketRef.current?.onDelete?.(
            data
          );
        };

        socket.on(
          "community_delete",
          handleDelete
        );

        // ======================
        // PIN
        // ======================

        const handlePin = (
          data: any
        ) => {
          socketRef.current?.onPin?.(
            data
          );
        };

        socket.on(
          "community_pin",
          handlePin
        );

        // ======================
        // PRESENCE
        // ======================

        const handlePresence = (
          data: any
        ) => {
          socketRef.current?.onPresence?.(
            data
          );
        };

        socket.on(
          "community_presence_update",
          handlePresence
        );

        // ======================
        // ERROR
        // ======================

        const handleError = (
          err: any
        ) => {
          console.error(
            "community socket error:",
            err
          );
        };

        socket.on(
          "connect_error",
          handleError
        );

        // ======================
        // HANDLERS
        // ======================

        socketRef.current.setHandlers = ({
          setMessages,
          setTypingUsers,
        }: {
          setMessages: Dispatch<
            SetStateAction<Message[]>
          >;

          setTypingUsers: Dispatch<
            SetStateAction<any[]>
          >;
        }) => {
          if (!socketRef.current)
            return;

          socketRef.current.onMessage = (
            message: Message
          ) => {
            setMessages(prev =>
              sortMessages(
                mergeMessages(
                  prev,
                  [message]
                )
              )
            );
          };

          socketRef.current.onTyping = ({
            userId,
            username,
          }: any) => {
            if (
              userId === currentUser?.id
            ) {
              return;
            }

            setTypingUsers(prev => {
              const exists =
                prev.some(
                  u =>
                    u.userId ===
                    userId
                );

              if (exists)
                return prev;

              return [
                ...prev,
                {
                  userId,
                  username,
                },
              ];
            });

            setTimeout(() => {
              setTypingUsers(prev =>
                prev.filter(
                  u =>
                    u.userId !==
                    userId
                )
              );
            }, 2000);
          };
        };

        // ======================
        // STORE HANDLERS
        // ======================

        socketRef.current.__handlers = {
          handleConnect,
          handleMessage,
          handleTyping,
          handleReaction,
          handleDelete,
          handlePin,
          handlePresence,
          handleError,
        };

      } catch (err) {
        console.error(
          "Community socket init failed:",
          err
        );
      }
    };

    init();

    return () => {
      mountedRef.current = false;

      const socket =
        socketRef.current;

      const h =
        socket?.__handlers;

      if (!socket || !h) {
        return;
      }

      if (
        socket.connected &&
        communityId
      ) {
        socket.emit(
          "leave_community",
          {
            communityId,
          }
        );
      }

      socket.off(
        "connect",
        h.handleConnect
      );

      socket.off(
        "community_message",
        h.handleMessage
      );

      socket.off(
        "community_typing",
        h.handleTyping
      );

      socket.off(
        "community_reaction",
        h.handleReaction
      );

      socket.off(
        "community_delete",
        h.handleDelete
      );

      socket.off(
        "community_pin",
        h.handlePin
      );

      socket.off(
        "community_presence_update",
        h.handlePresence
      );

      socket.off(
        "connect_error",
        h.handleError
      );

      socket.__handlers =
        undefined;

      socketRef.current = null;
    };
  }, [
    communityId,
    currentUser?.id,
  ]);

  return socketRef;
}