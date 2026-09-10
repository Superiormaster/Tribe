'use client';

import {
  useEffect,
  useState,
  useRef,
  useCallback,
} from 'react';

import {
  flushOutbox,
} from '@/utils/chat/outboxProcessor';

import {
  useNetwork,
} from '@/components/networkConnection/NetworkContext';

import {
  getSocket,
  reconnectSocket,
} from '@/lib/socket';
import type { TribeSocket } from "@/lib/socket";

import {
  ensureConnected,
} from '@/utils/chat/waitForConnect';

import {
  rejoinAllCommunities,
} from '@/lib/communitySocket';

type UserPresence = {
  status: 'online' | 'offline';
  last_seen: string | null;
};

export function useGlobalSocket(
  currentUser: any
) {
  const socketRef = useRef<TribeSocket | null>(null);

  const handlersRef = useRef<{
    onConnect?: () => void;

    onDelivered?: (data: any) => void;
    onSeen?: (data: any) => void;

    onCommunityDelivered?: (data: any) => void;
    onCommunitySeen?: (data: any) => void;

    onSendState?: () => void;

    onSocketConnected?: () => void;
    onSocketDisconnected?: (reason: string) => void;

    onReconnectAttempt?: (n: number) => void;
    onReconnect?: (n: number) => void;
    onConnectError?: (err: any) => void;

    onMessageDeliveredAck?: (data: any) => void;
    onUserStatus?: (
      data: any
    ) => void;
  }>({});

  const {
    isOnline,
    finishReconnect,
  } = useNetwork();
  
  const [presence, setPresence] =
  useState<Map<number, UserPresence>>(
    new Map()
  );

  const reconnectPromiseRef =
    useRef<Promise<any> | null>(null);

  const ensureGlobalSocket =
    useCallback(
      async () => {
        if (
          !currentUser?.id ||
          !navigator.onLine
        ) {
          return null;
        }

        if (
          reconnectPromiseRef.current
        ) {
          return reconnectPromiseRef.current;
        }

        const promise =
          (async () => {
            try {
              let socket =
                await getSocket();

              if (!socket) {
                console.warn(
                  '⚠️ GLOBAL: getSocket() returned null'
                );

                return null;
              }

              socketRef.current =
                socket;

              if (socket.connected) {
                await ensureConnected(
                  socket
                );

                return socket;
              }

              console.log(
                '🔌 GLOBAL: socket disconnected — reconnecting'
              );

              socket =
                await reconnectSocket();

              if (!socket) {
                console.warn(
                  '⚠️ GLOBAL: reconnectSocket() returned null'
                );

                return null;
              }

              socketRef.current =
                socket;

              await ensureConnected(
                socket
              );

              console.log(
                '🟢 GLOBAL: socket ensured',
                socket.id
              );

              return socket;

            } catch (error) {
              console.error(
                '❌ GLOBAL SOCKET ENSURE FAILED',
                error
              );

              return null;

            } finally {
              reconnectPromiseRef.current =
                null;
            }
          })();

        reconnectPromiseRef.current =
          promise;

        return promise;
      },
      [currentUser?.id]
    );

  const reconnect =
    useCallback(
      async () => {
        if (
          !isOnline ||
          !currentUser?.id
        ) {
          finishReconnect();
          return;
        }

        try {
          console.log(
            '🌐 GLOBAL NETWORK RECOVERY'
          );

          const socket =
            await ensureGlobalSocket();

          if (!socket) {
            console.warn(
              '⚠️ GLOBAL RECOVERY: socket unavailable'
            );

            return;
          }

          if (
            !socket.connected
          ) {
            console.warn(
              '⚠️ GLOBAL RECOVERY: socket still disconnected'
            );

            return;
          }

          socket.emit(
            'network_online'
          );

          console.log(
            '📬 GLOBAL: network_online emitted'
          );

          try {
            await flushOutbox({
              ownerId:
                currentUser.id,

              privateSocket:
                socket,

              communitySocket:
                socket,

              isOnline:
                true,
            });

          } catch (error) {
            console.error(
              '❌ GLOBAL: outbox flush failed',
              error
            );
          }

        } catch (error) {
          console.error(
            '❌ GLOBAL NETWORK RECOVERY FAILED',
            error
          );

        } finally {
          finishReconnect();
        }
      },
      [
        isOnline,
        currentUser?.id,
        ensureGlobalSocket,
        finishReconnect,
      ]
    );

  useEffect(() => {
    const handler = (
      event: Event
    ) => {
      const customEvent =
        event as CustomEvent<{
          accessToken: string;
        }>;

      const accessToken =
        customEvent.detail?.accessToken;

      if (!accessToken) {
        return;
      }

      const socket =
        socketRef.current;

      if (!socket) {
        return;
      }

      socket.emit(
        'update_access_token',
        {
          accessToken,
        }
      );

      console.log(
        '🔐 GLOBAL: refreshed access token sent to socket'
      );
    };

    window.addEventListener(
      'access-token-refreshed',
      handler
    );

    return () => {
      window.removeEventListener(
        'access-token-refreshed',
        handler
      );
    };
  }, []);

  useEffect(() => {
    if (!currentUser?.id) {
      return;
    }

    let recovering = false;

    const recoverConnection =
      async () => {
        if (
          recovering ||
          !navigator.onLine
        ) {
          return;
        }

        recovering = true;

        try {
          await reconnect();

        } finally {
          recovering = false;
        }
      };

    window.addEventListener(
      'online',
      recoverConnection
    );

    window.addEventListener(
      'network-reconnected',
      recoverConnection
    );

    return () => {
      window.removeEventListener(
        'online',
        recoverConnection
      );

      window.removeEventListener(
        'network-reconnected',
        recoverConnection
      );
    };
  }, [
    currentUser?.id,
    reconnect,
  ]);

  useEffect(() => {
    if (!currentUser?.id) {
      return;
    }

    let mounted = true;

    const startup =
      async () => {
        if (
          !navigator.onLine ||
          !mounted
        ) {
          return;
        }

        try {
          console.log(
            '🚀 GLOBAL SOCKET STARTUP'
          );

          const socket =
            await ensureGlobalSocket();

          if (
            !mounted ||
            !socket
          ) {
            return;
          }

          if (
            socket.connected
          ) {
            socket.emit(
              'network_online'
            );

            await flushOutbox({
              ownerId:
                currentUser.id,

              privateSocket:
                socket,

              communitySocket:
                socket,

              isOnline:
                navigator.onLine,
            });
          }

        } catch (error) {
          console.error(
            '❌ GLOBAL STARTUP FAILED',
            error
          );
        }
      };

    void startup();

    return () => {
      mounted = false;
    };
  }, [
    currentUser?.id,
    ensureGlobalSocket,
  ]);

  useEffect(() => {
    if (!currentUser?.id) {
      return;
    }

    let stopped = false;

    const checkSocket =
      async () => {
        if (
          stopped ||
          !navigator.onLine
        ) {
          return;
        }

        try {
          const socket =
            await getSocket();

          if (stopped) {
            return;
          }

          if (
            socket?.connected
          ) {
            return;
          }

          console.log(
            '🔌 GLOBAL HEALTH CHECK — SOCKET DISCONNECTED'
          );

          const restored =
            await ensureGlobalSocket();

          if (
            restored?.connected
          ) {
            restored.emit(
              'network_online'
            );

            console.log(
              '📬 GLOBAL HEALTH: network_online emitted'
            );
          }

        } catch (error) {
          console.warn(
            '⚠️ GLOBAL SOCKET HEALTH CHECK FAILED',
            error
          );
        }
      };

    const interval =
      window.setInterval(
        checkSocket,
        5000
      );

    void checkSocket();

    return () => {
      stopped = true;

      window.clearInterval(
        interval
      );
    };
  }, [
    currentUser?.id,
    ensureGlobalSocket,
  ]);

  useEffect(() => {
    if (!currentUser?.id) {
      return;
    }

    const interval =
      window.setInterval(
        async () => {
          if (
            !navigator.onLine
          ) {
            return;
          }

          try {
            const socket =
              await getSocket();

            if (
              !socket ||
              !socket.connected
            ) {
              return;
            }

            await flushOutbox({
              ownerId:
                currentUser.id,

              privateSocket:
                socket,

              communitySocket:
                socket,

              isOnline:
                true,
            });

          } catch (error) {
            console.error(
              '❌ PERIODIC OUTBOX FLUSH FAILED',
              error
            );
          }
        },
        60_000
      );

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, [
    currentUser?.id,
  ]);

  useEffect(() => {
    if (!currentUser?.id) {
      return;
    }

    let mounted = true;

    const init =
      async () => {
        try {
          const socket =
            await getSocket();

          if (!mounted) {
            return;
          }

          if (!socket) {
            return;
          }

          socketRef.current =
            socket;
  
          const onUserStatus = ({
            userId,
            status,
            last_seen,
          }: {
            userId: number;
            status: 'online' | 'offline';
            last_seen?: string | null;
          }) => {
            const id = Number(userId);
          
            if (
              !id ||
              id === Number(currentUser.id)
            ) {
              return;
            }
          
            setPresence(prev => {
              const next = new Map(prev);
          
              next.set(id, {
                status,
                last_seen:
                  last_seen ??
                  next.get(id)?.last_seen ??
                  null,
              });
          
              return next;
            });
          
            console.log(
              '🌍 GLOBAL USER STATUS:',
              {
                userId: id,
                status,
                last_seen,
              }
            );
          };

          const sendState = () => {
            if (
              !socket.connected
            ) {
              return;
            }

            socket.emit(
              'app_state',
              {
                state:
                  document.hidden
                    ? 'background'
                    : 'foreground',
              }
            );
          };

          const onSocketConnected =
            () => {
              console.log(
                '🟢 GLOBAL SOCKET CONNECTED',
                socket.id
              );

              window.dispatchEvent(
                new Event(
                  'socket-connected'
                )
              );
            };

          const onSocketDisconnected =
            (reason: string) => {
              console.log(
                '🔴 GLOBAL SOCKET DISCONNECTED',
                reason
              );

              window.dispatchEvent(
                new Event(
                  'socket-disconnected'
                )
              );
            };

          const onConnect =
            async () => {
              if (
                !currentUser?.id
              ) {
                return;
              }

              console.log(
                '🌍 GLOBAL SOCKET CONNECT EVENT',
                socket.id
              );

              sendState();

              socket.emit(
                'network_online'
              );

              console.log(
                '📬 GLOBAL: network_online emitted after connect'
              );

              rejoinAllCommunities(
                socket
              );

              /*
               * Notifications.
               */
              socket.emit(
                'join_notifications'
              );

              /*
               * Flush offline outbox.
               */
              try {
                await flushOutbox({
                  ownerId:
                    currentUser.id,

                  privateSocket:
                    socket,

                  communitySocket:
                    socket,

                  isOnline:
                    true,
                });

              } catch (error) {
                console.error(
                  '❌ GLOBAL CONNECT: outbox flush failed',
                  error
                );
              }
            };

          document.addEventListener(
            'visibilitychange',
            sendState
          );

          socket.on(
            'connect',
            sendState
          );

          /*
           * Initial presence state.
           */
          sendState();

          const onDelivered =
            (data: any) => {
              window.dispatchEvent(
                new CustomEvent(
                  'message-delivered',
                  {
                    detail: data,
                  }
                )
              );
            };

          const onSeen =
            (data: any) => {
              window.dispatchEvent(
                new CustomEvent(
                  'message-seen',
                  {
                    detail: data,
                  }
                )
              );
            };

          const onCommunityDelivered =
            (data: any) => {
              window.dispatchEvent(
                new CustomEvent(
                  'community-message-delivered',
                  {
                    detail: data,
                  }
                )
              );
            };

          const onCommunitySeen =
            (data: any) => {
              window.dispatchEvent(
                new CustomEvent(
                  'community-message-seen',
                  {
                    detail: data,
                  }
                )
              );
            };

          const onMessageDeliveredAck =
            (data: any) => {
              window.dispatchEvent(
                new CustomEvent(
                  'message-delivered-ack',
                  {
                    detail: data,
                  }
                )
              );
            };

          handlersRef.current = {
            onSendState:
              sendState,

            onConnect,

            onDelivered,
            onSeen,
            onUserStatus,

            onCommunityDelivered,
            onCommunitySeen,

            onMessageDeliveredAck,

            onSocketConnected,
            onSocketDisconnected,
          };

          socket.on(
            'connect',
            onConnect
          );

          socket.on(
            'connect',
            onSocketConnected
          );

          socket.on(
            'disconnect',
            onSocketDisconnected
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
            'user_status',
            onUserStatus
          );

          socket.on(
            'community_delivered',
            onCommunityDelivered
          );

          socket.on(
            'community_seen',
            onCommunitySeen
          );

          socket.on(
            'message_delivered_ack',
            onMessageDeliveredAck
          );

          const onReconnectAttempt =
            (attempt: number) => {
              console.log(
                '🔄 SOCKET RECONNECT ATTEMPT',
                attempt
              );
            };

          const onReconnect =
            (attempt: number) => {
              console.log(
                '🟢 SOCKET RECONNECTED',
                attempt
              );

              if (
                socket.connected
              ) {
                socket.emit(
                  'network_online'
                );
              }
            };

          const onConnectError =
            (err: any) => {
              console.error(
                '❌ SOCKET CONNECT ERROR',
                err
              );
            };

          handlersRef.current.onReconnectAttempt =
            onReconnectAttempt;

          handlersRef.current.onReconnect =
            onReconnect;

          handlersRef.current.onConnectError =
            onConnectError;

          socket.io.on(
            'reconnect_attempt',
            onReconnectAttempt
          );

          socket.io.on(
            'reconnect',
            onReconnect
          );

          socket.on(
            'connect_error',
            onConnectError
          );

          if (
            !socket.connected
          ) {
            socket.connect();
          }

        } catch (error) {
          console.error(
            '❌ GLOBAL SOCKET INIT FAILED',
            error
          );
        }
      };

    void init();

    return () => {
      mounted = false;

      const socket =
        socketRef.current;

      const h =
        handlersRef.current;

      if (!socket) {
        return;
      }

      socket.off(
        'connect',
        h.onConnect
      );

      socket.off(
        'connect',
        h.onSocketConnected
      );

      socket.off(
        'user_status',
        h.onUserStatus
      );

      socket.off(
        'disconnect',
        h.onSocketDisconnected
      );

      socket.off(
        'connect',
        h.onSendState
      );

      if (
        h.onSendState
      ) {
        document.removeEventListener(
          'visibilitychange',
          h.onSendState
        );
      }

      socket.off(
        'delivered',
        h.onDelivered
      );

      socket.off(
        'seen',
        h.onSeen
      );

      socket.off(
        'community_delivered',
        h.onCommunityDelivered
      );

      socket.off(
        'community_seen',
        h.onCommunitySeen
      );

      socket.off(
        'message_delivered_ack',
        h.onMessageDeliveredAck
      );

      socket.off(
        'connect_error',
        h.onConnectError
      );

      socket.io.off(
        'reconnect_attempt',
        h.onReconnectAttempt
      );

      socket.io.off(
        'reconnect',
        h.onReconnect
      );

      handlersRef.current =
        {};
    };
  }, [
    currentUser?.id,
  ]);

  return {
    socketRef,
    presence,
  };
}