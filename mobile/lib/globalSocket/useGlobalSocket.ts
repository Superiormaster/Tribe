import {
AppState,
AppStateStatus,
DeviceEventEmitter,
} from "react-native";

import {
useEffect,
useRef,
useCallback,
} from "react";

import { apiRequest } from "@/utils/api";
import { ensureConnected } from "@/utils/chat/waitForConnect";
import {
flushOutbox,
} from "@/utils/chat/outboxProcessor";
import { useNetwork } from "@/components/networkConnection/NetworkContext";
import {
getSocket,
reconnectSocket,
} from "@/lib/socket";
import {
rejoinAllCommunities,
} from "@/lib/communitySocket";

export function useGlobalSocket(
currentUser: any
) {
const socketRef = useRef<any>(null);

const handlersRef = useRef<{
onConnect?: () => void;

onDelivered?: (data: any) => void;
onSeen?: (data: any) => void;

onCommunityDelivered?: (
  data: any
) => void;

onCommunitySeen?: (
  data: any
) => void;

onSendState?: () => void;

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

onMessageDeliveredAck?: (
  data: any
) => void;

}>({});

const {
isOnline,
finishReconnect,
} = useNetwork();

const reconnectPromiseRef =
useRef<Promise<any> | null>(null);

  const ensureGlobalSocket =
  useCallback(
  async () => {
  if (
  !currentUser?.id ||
  !isOnline
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
         "⚠️ GLOBAL: getSocket() returned null"
       );

       return null;
     }

     socketRef.current =
       socket;

     if (
       socket.connected
     ) {
       await ensureConnected(
         socket
       );

       return socket;
     }

     console.log(
       "🔌 GLOBAL: socket disconnected — reconnecting"
     );

     socket =
       await reconnectSocket();

     if (!socket) {
       console.warn(
         "⚠️ GLOBAL: reconnectSocket() returned null"
       );

       return null;
     }

     socketRef.current =
       socket;

     await ensureConnected(
       socket
     );

     console.log(
       "🟢 GLOBAL: socket ensured",
       socket.id
     );

     return socket;

   } catch (error) {
     console.error(
       "❌ GLOBAL SOCKET ENSURE FAILED",
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
  [
  currentUser?.id,
  isOnline,
  ]
  );

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
  const socket =
  await ensureGlobalSocket();
  
  console.log(
  "Socket instance",
  socket
  );
  
  if (!socket) {
  return;
  }
  
  console.log(
  "Socket id",
  socket.id
  );
  
  console.log(
  "Connected",
  socket.connected
  );
  
  socket.emit(
  "user_online"
  );
  
  console.log(
  "Reconnect finished"
  );
  
  console.log(
  "Calling flush"
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
  "❌ Initial outbox flush failed",
  error
  );
  }
  
  } catch (err) {
  console.error(
  "Reconnect failed",
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
  ensureGlobalSocket,
  ]
  );

  useEffect(() => {
  const subscription =
  DeviceEventEmitter.addListener(
  "access-token-refreshed",
  (data: {
  accessToken?: string;
  }) => {
  const accessToken =
  data?.accessToken;
  
   if (!accessToken) {
   return;
 }

 const socket =
   socketRef.current;

 if (!socket) {
   return;
 }

 socket.emit(
   "update_access_token",
   {
     accessToken,
   }
 );

 console.log(
   "🔐 Global socket received refreshed access token"
 );
  
  }
  );

return () => {
  subscription.remove();
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
      !isOnline
    ) {
      return;
    }

    recovering = true;

    try {
      console.log(
        "🌐 GLOBAL NETWORK RECOVERY"
      );

      const socket =
        await ensureGlobalSocket();

      if (!socket) {
        console.warn(
          "⚠️ GLOBAL NETWORK RECOVERY: socket unavailable"
        );

        return;
      }

      if (
        socket.connected
      ) {
        socket.emit(
          "user_online"
        );

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
      }

      console.log(
        "✅ GLOBAL NETWORK RECOVERY COMPLETE"
      );

    } catch (error) {
      console.error(
        "❌ GLOBAL NETWORK RECOVERY FAILED",
        error
      );

    } finally {
      recovering = false;
    }
  };

const networkSubscription =
  DeviceEventEmitter.addListener(
    "network-reconnected",
    recoverConnection
  );

if (isOnline) {
  void recoverConnection();
}

return () => {
  networkSubscription.remove();
};

}, [
currentUser?.id,
ensureGlobalSocket,
isOnline,
]);

  useEffect(() => {
  if (!currentUser?.id) {
  return;
  }

let mounted = true;

const startup =
  async () => {
    if (
      !isOnline ||
      !mounted
    ) {
      return;
    }

    try {
      console.log(
        "🚀 GLOBAL SOCKET STARTUP"
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
        console.log(
          "🚀 APP START — CHECKING OUTBOX"
        );

        await flushOutbox({
          ownerId:
            currentUser.id,

          privateSocket:
            socket,

          communitySocket:
            socket,

          isOnline:
            isOnline,
        });
      }

    } catch (error) {
      console.error(
        "❌ GLOBAL STARTUP FAILED",
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
isOnline,
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
      !isOnline
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
        "🔌 GLOBAL HEALTH CHECK — SOCKET DISCONNECTED"
      );

      await ensureGlobalSocket();

    } catch (error) {
      console.warn(
        "⚠️ GLOBAL SOCKET HEALTH CHECK FAILED",
        error
      );
    }
  };

const interval =
  setInterval(
    checkSocket,
    5000
  );

void checkSocket();

return () => {
  stopped = true;

  clearInterval(
    interval
  );
};

}, [
currentUser?.id,
ensureGlobalSocket,
isOnline,
]);

  useEffect(() => {
  if (!currentUser?.id) {
  return;
  }

const interval =
  setInterval(
    async () => {
      if (!isOnline) {
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
          "❌ PERIODIC OUTBOX FLUSH FAILED",
          error
        );
      }
    },
    60_000
  );

return () => {
  clearInterval(
    interval
  );
};

}, [
currentUser?.id,
isOnline,
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

      const sendState =
        () => {
          if (
            !socket.connected
          ) {
            return;
          }

          const state =
            AppState.currentState;

          socket.emit(
            "app_state",
            {
              state:
                state === "active"
                  ? "foreground"
                  : "background",
            }
          );
        };

      const handleAppStateChange =
        (
          nextState: AppStateStatus
        ) => {
          if (
            !socket.connected
          ) {
            return;
          }

          socket.emit(
            "app_state",
            {
              state:
                nextState === "active"
                  ? "foreground"
                  : "background",
            }
          );
        };

      const appStateSubscription =
        AppState.addEventListener(
          "change",
          handleAppStateChange
        );

      socket.on(
        "connect",
        sendState
      );

      sendState();

      const onSocketConnected =
        () => {
          DeviceEventEmitter.emit(
            "socket-connected"
          );
        };

      const onSocketDisconnected =
        () => {
          DeviceEventEmitter.emit(
            "socket-disconnected"
          );
        };

      const onReconnectAttempt =
        (
          attempt: number
        ) => {
          console.log(
            "reconnect attempt",
            attempt
          );
        };

      const onReconnect =
        (
          attempt: number
        ) => {
          console.log(
            "reconnected",
            attempt
          );
        };

      const onConnectError =
        (
          err: any
        ) => {
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
          "connect",
          handlersRef.current
            .onConnect
        );

        socket.off(
          "delivered",
          handlersRef.current
            .onDelivered
        );

        socket.off(
          "seen",
          handlersRef.current
            .onSeen
        );
      }

      if (
        handlersRef.current
          .onSendState
      ) {
        socket.off(
          "connect",
          handlersRef.current
            .onSendState
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
            "🌍 Global socket connected"
          );

          console.log(
            "Connected",
            socket.id
          );

          socket.emit(
            "user_online"
          );

          rejoinAllCommunities(
            socket
          );

          sendState();

          socket.emit(
            "join_notifications"
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

          } catch (err) {
            console.error(
              "Flush failed",
              err
            );
          }
        };

      const onDelivered =
        (
          data: any
        ) => {
          DeviceEventEmitter.emit(
            "message-delivered",
            data
          );
        };

      const onSeen =
        (
          data: any
        ) => {
          DeviceEventEmitter.emit(
            "message-seen",
            data
          );
        };

      const onCommunityDelivered =
        (
          data: any
        ) => {
          console.log(
            "📬 COMMUNITY DELIVERED:",
            data
          );

          DeviceEventEmitter.emit(
            "community-message-delivered",
            data
          );
        };

      const onCommunitySeen =
        (
          data: any
        ) => {
          console.log(
            "👁️ COMMUNITY SEEN:",
            data
          );

          DeviceEventEmitter.emit(
            "community-message-seen",
            data
          );
        };

      const onMessageDeliveredAck =
        (
          data: any
        ) => {
          DeviceEventEmitter.emit(
            "message-delivered-ack",
            data
          );
        };

      handlersRef.current = {
        onSendState:
          sendState,

        onConnect,

        onDelivered,

        onSeen,

        onCommunityDelivered,

        onCommunitySeen,

        onMessageDeliveredAck,

        onSocketConnected,

        onSocketDisconnected,

        onReconnectAttempt,

        onReconnect,

        onConnectError,
      };

      socket.on(
        "connect",
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
        "delivered",
        onDelivered
      );

      socket.on(
        "community_delivered",
        onCommunityDelivered
      );

      socket.on(
        "seen",
        onSeen
      );

      socket.on(
        "community_seen",
        onCommunitySeen
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

      const originalCleanup =
        () => {
          appStateSubscription.remove();
        };

      void originalCleanup;

    } catch (err) {
      console.error(
        "Global socket init failed:",
        err
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
    "connect",
    h.onSendState
  );

  socket?.off(
    "delivered",
    h.onDelivered
  );

  socket?.off(
    "community_delivered",
    h.onCommunityDelivered
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
    "community_seen",
    h.onCommunitySeen
  );

  socket?.off(
    "connect_error",
    h.onConnectError
  );

  socket?.io?.off(
    "reconnect_attempt",
    h.onReconnectAttempt
  );

  socket?.io?.off(
    "reconnect",
    h.onReconnect
  );

  handlersRef.current =
    {};
};

}, [
currentUser?.id,
]);

return socketRef;
}