'use client';

import { useEffect, useRef } from 'react';
import { connectSocket } from '@/lib/socket';
import { apiRequest } from '@/utils/api';

export function useCommunitySocket(
  communityId: number | null,
  setMessages: any,
  setTypingUsers: any,
  currentUser: any
) {
  const socketRef = useRef<any>(null);

  useEffect(() => {
    if (!communityId) return;

    let mounted = true;

    const init = async () => {
      try {
        const auth = await apiRequest(
          'api/users/socket-auth/',
          {
            method: 'POST',
          }
        );
        console.log("SOCKET AUTH RESPONSE:", auth);

        if (!mounted) return;

        const socket = connectSocket(auth);

        socketRef.current = socket;

        // =========================
        // CONNECT
        // =========================
        socket.on('connect', () => {
          console.log(
            '✅ community socket connected:',
            socket.id
          );

          socket.emit('join_community', {
            communityId,
          });
        });

        // =========================
        // RECEIVE MESSAGE
        // =========================
        socket.on(
          'community_message',
          (message: any) => {
            setMessages((prev: any[]) => {
              const exists = prev.some(
                (m) => m.id === message.id
              );

              if (exists) return prev;

              return [...prev, message];
            });
          }
        );

        // =========================
        // TYPING
        // =========================
        socket.on(
          'community_typing',
          ({ userId, username }) => {
            if (userId === currentUser.id) return;

            setTypingUsers((prev: any[]) => {
              const exists = prev.find(
                (u) => u.userId === userId
              );

              if (exists) return prev;

              return [
                ...prev,
                {
                  userId,
                  username,
                },
              ];
            });

            setTimeout(() => {
              setTypingUsers((prev: any[]) =>
                prev.filter(
                  (u) => u.userId !== userId
                )
              );
            }, 2000);
          }
        );

        // =========================
        // REACTIONS
        // =========================
        socket.on(
          'community_reaction',
          (data) => {
            setMessages((prev: any[]) =>
              prev.map((msg) => {
                if (
                  msg.id !== data.messageId
                ) {
                  return msg;
                }

                const reactions =
                  msg.reactions || [];

                const existing =
                  reactions.find(
                    (r: any) =>
                      r.userId ===
                      data.userId
                  );

                let updated;

                if (existing) {
                  updated =
                    reactions.map(
                      (r: any) =>
                        r.userId ===
                        data.userId
                          ? data
                          : r
                    );
                } else {
                  updated = [
                    ...reactions,
                    data,
                  ];
                }

                return {
                  ...msg,
                  reactions: updated,
                };
              })
            );
          }
        );

        // =========================
        // DELETE MESSAGE
        // =========================
        socket.on(
          'community_delete',
          ({
            messageId,
            deletedByAdmin,
          }) => {
            setMessages((prev: any[]) =>
              prev.map((msg) => {
                if (
                  msg.id !== messageId
                ) {
                  return msg;
                }

                return {
                  ...msg,
                  deleted: true,
                  deleted_by_admin:
                    deletedByAdmin,
                };
              })
            );
          }
        );

        // =========================
        // PIN MESSAGE
        // =========================
        socket.on(
          'community_pin',
          ({ messageId, pinned }) => {
            setMessages((prev: any[]) =>
              prev.map((msg) => {
                if (
                  msg.id !== messageId
                ) {
                  return msg;
                }

                return {
                  ...msg,
                  is_pinned: pinned,
                };
              })
            );
          }
        );

        // =========================
        // PRESENCE
        // =========================
        socket.on(
          'community_presence_update',
          (data) => {
            console.log(
              'presence:',
              data
            );
          }
        );

        // =========================
        // VISIBILITY RECONNECT
        // =========================
        document.addEventListener('visibilitychange', () => {
          if (!socketRef.current) return;
        
          if (document.hidden) {
            socketRef.current.emit('app_hidden', { communityId });
          } else {
            socketRef.current.emit('app_visible', { communityId });
          }
        });

        // =========================
        // ERRORS
        // =========================
        socket.on(
          'connect_error',
          (err) => {
            console.error(
              'community socket error:',
              err
            );
          }
        );
      } catch (err) {
        console.error(
          'community socket init failed:',
          err
        );
      }
    };

    init();

    return () => {
      mounted = false;

      if (socketRef.current) {
        socketRef.current.emit(
          'leave_community',
          {
            communityId,
          }
        );

        socketRef.current.off();

        socketRef.current.disconnect();
      }
    };
  }, [communityId]);

  // =========================
  // ACTIONS
  // =========================

  const sendMessage = (
    payload: any
  ) => {
    socketRef.current?.emit(
      'community_message',
      {
        communityId,
        ...payload,
      }
    );
  };

  const sendTyping = () => {
    socketRef.current?.emit(
      'community_typing',
      {
        communityId,
      }
    );
  };

  const reactToMessage = (
    messageId: number,
    emoji: string
  ) => {
    socketRef.current?.emit(
      'community_reaction',
      {
        communityId,
        messageId,
        emoji,
      }
    );
  };

  const deleteMessage = (
    messageId: number
  ) => {
    socketRef.current?.emit(
      'community_delete',
      {
        communityId,
        messageId,
      }
    );
  };

  const pinMessage = (
    messageId: number
  ) => {
    socketRef.current?.emit(
      'community_pin',
      {
        communityId,
        messageId,
      }
    );
  };

  return {
    socketRef,

    sendMessage,
    sendTyping,
    reactToMessage,
    deleteMessage,
    pinMessage,
  };
}