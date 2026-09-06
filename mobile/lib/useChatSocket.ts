import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  DeviceEventEmitter,
} from "react-native";

import type {
  Socket,
} from "socket.io-client";

import {
  mergeMessages,
  sortMessages,
} from "@/utils/chat/messageMerger";

import type {
  Message,
} from "@/utils/chat/messageContract";

import type {
  Dispatch,
  SetStateAction,
  MutableRefObject,
} from "react";

type CurrentUser = {
  id: number;
};

type PrivateChatHandlerMap = Map<
  number,
  PrivateChatHandlers
>;

type TribeSocket = Socket & {
  __privateChatHandlers?: PrivateChatHandlerMap;

  onTyping?: (data: any) => void;

  onStopTyping?: (data: any) => void;

  onMessage?: (
    message: Message
  ) => void;

  setPrivateChatMessages?: (
    chatId: number,
    updater: (
      setMessages: Dispatch<
        SetStateAction<Message[]>
      >
    ) => void
  ) => void;
};

type Props = {
  chatId: number | null;

  currentUser: CurrentUser | null;

  // THIS MUST BE THE GLOBAL SOCKET REF.
  socketRef: MutableRefObject<
    TribeSocket | null
  >;

  setIsTyping: Dispatch<
    SetStateAction<boolean>
  >;

  setChatUser?: Dispatch<
    SetStateAction<any | null>
  >;
};

type PrivateChatHandlers = {
  handleConnect: () => void;

  handleTyping: (
    data: any
  ) => void;

  handleDisconnect: (
    reason: string
  ) => void;

  handleStopTyping: (
    data: any
  ) => void;

  handleErr: (
    err: any
  ) => void;

  handleError: (
    err: any
  ) => void;

  handleReceiveMessage: (
    message: Message
  ) => void;

  handleUserStatus: (
    data: any
  ) => void;
};

export function useChatSocket({
  chatId,
  currentUser,
  socketRef,
  setIsTyping,
  setChatUser,
}: Props) {
  const mountedRef =
    useRef(false);

  const [
    socketReady,
    setSocketReady,
  ] = useState(false);

  useEffect(() => {
    if (
      !chatId ||
      !currentUser?.id
    ) {
      setSocketReady(false);
      return;
    }

    const id = Number(chatId);

    mountedRef.current = true;

    console.log(
      "🔵 [PRIVATE] MOUNT",
      {
        chatId: id,
        userId: currentUser.id,
      }
    );

    let socket: TribeSocket | null =
      null;

    const getGlobalSocket =
      (): TribeSocket | null => {
        const current =
          socketRef.current;

        if (!current) {
          console.log(
            "⏳ [PRIVATE] Global socket not available yet",
            id
          );

          return null;
        }

        socket = current;

        return current;
      };

    const handleConnect =
      () => {
        if (
          !mountedRef.current
        ) {
          return;
        }

        if (!socket) {
          return;
        }

        console.log(
          "🟢 [PRIVATE] SOCKET CONNECTED",
          {
            chatId: id,
            socketId: socket.id,
          }
        );

        setSocketReady(false);

        // Rejoin ONLY this chat.
        socket.emit(
          "join_chat",
          {
            chatId: id,
          }
        );

        socket.emit(
          "mark_seen",
          {
            chatId: id,
          }
        );

        setSocketReady(true);
      };

    const handleReceiveMessage =
      (
        message: Message
      ) => {
        if (
          !mountedRef.current
        ) {
          return;
        }

        const messageChatId =
          Number(
            (message as any)?.chat ??
            (message as any)?.chatId
          );

        if (
          messageChatId !== id
        ) {
          return;
        }

        socket
          ?.setPrivateChatMessages
          ?.(
            id,
            (
              setMessages: Dispatch<
                SetStateAction<Message[]>
              >
            ) => {
              setMessages(
                (prev) =>
                  sortMessages(
                    mergeMessages(
                      prev,
                      [message]
                    )
                  )
              );
            }
          );
      };

    const handleTyping =
      (data: any) => {
        if (
          Number(
            data?.chatId ??
            data?.chat
          ) !== id
        ) {
          return;
        }

        socket?.onTyping?.(
          data
        );
      };

    const handleStopTyping =
      (data: any) => {
        if (
          Number(
            data?.chatId ??
            data?.chat
          ) !== id
        ) {
          return;
        }

        socket?.onStopTyping?.(
          data
        );
      };

    const handleUserStatus =
      ({
        userId,
        status,
        last_seen,
      }: {
        userId: number;
        status: string;
        last_seen: string | null;
      }) => {
        if (
          Number(userId) ===
          Number(currentUser.id)
        ) {
          return;
        }

        if (
          !mountedRef.current
        ) {
          return;
        }

        setChatUser?.(
          (prev: any) =>
            prev
              ? {
                  ...prev,
                  status,
                  last_seen:
                    last_seen ??
                    undefined,
                }
              : prev
        );
      };

    const handleDisconnect =
      (
        reason: string
      ) => {
        if (
          !mountedRef.current
        ) {
          return;
        }

        console.log(
          "🟠 [PRIVATE] SOCKET DISCONNECTED",
          {
            chatId: id,
            reason,
          }
        );

        setSocketReady(false);
      };

    const handleError =
      (err: any) => {
        console.error(
          "🔴 [PRIVATE] CONNECT ERROR",
          {
            chatId: id,
            error: err,
          }
        );

        if (
          mountedRef.current
        ) {
          setSocketReady(false);
        }
      };

    const handleErr =
      (err: any) => {
        console.error(
          "🔴 [PRIVATE] SOCKET ERROR",
          {
            chatId: id,
            error: err,
          }
        );
      };

    const attach =
      (
        globalSocket: TribeSocket
      ) => {
        if (
          !mountedRef.current
        ) {
          return;
        }

        socket = globalSocket;

        globalSocket.__privateChatHandlers =
          globalSocket.__privateChatHandlers ||
          new Map();

        // Prevent duplicate registration.
        const existing =
          globalSocket
            .__privateChatHandlers
            .get(id);

        if (existing) {
          console.warn(
            "⚠️ [PRIVATE] Existing handlers found, cleaning first",
            id
          );

          globalSocket.off(
            "connect",
            existing.handleConnect
          );

          globalSocket.off(
            "typing",
            existing.handleTyping
          );

          globalSocket.off(
            "stop_typing",
            existing.handleStopTyping
          );

          globalSocket.off(
            "disconnect",
            existing.handleDisconnect
          );

          globalSocket.off(
            "connect_error",
            existing.handleError
          );

          globalSocket.off(
            "error",
            existing.handleErr
          );

          globalSocket.off(
            "receive_message",
            existing.handleReceiveMessage
          );

          globalSocket.off(
            "user_status",
            existing.handleUserStatus
          );
        }

        globalSocket
          .__privateChatHandlers
          .set(
            id,
            {
              handleConnect,
              handleTyping,
              handleDisconnect,
              handleStopTyping,
              handleErr,
              handleError,
              handleReceiveMessage,
              handleUserStatus,
            }
          );

        globalSocket.on(
          "connect",
          handleConnect
        );

        globalSocket.on(
          "typing",
          handleTyping
        );

        globalSocket.on(
          "stop_typing",
          handleStopTyping
        );

        globalSocket.on(
          "disconnect",
          handleDisconnect
        );

        globalSocket.on(
          "connect_error",
          handleError
        );

        globalSocket.on(
          "error",
          handleErr
        );

        globalSocket.on(
          "receive_message",
          handleReceiveMessage
        );

        globalSocket.on(
          "user_status",
          handleUserStatus
        );

        globalSocket.onTyping =
          (data: any) => {
            if (
              Number(
                data?.userId
              ) ===
              Number(
                currentUser.id
              )
            ) {
              return;
            }

            setIsTyping(true);
          };

        globalSocket.onStopTyping =
          (data: any) => {
            if (
              Number(
                data?.userId
              ) ===
              Number(
                currentUser.id
              )
            ) {
              return;
            }

            setIsTyping(false);
          };

        globalSocket.onMessage =
          (
            message: Message
          ) => {
            if (
              !mountedRef.current
            ) {
              return;
            }

            if (
              Number(
                (message as any)?.chat ??
                (message as any)?.chatId
              ) !== id
            ) {
              return;
            }

            globalSocket
              .setPrivateChatMessages
              ?.(
                id,
                (
                  setMessages: Dispatch<
                    SetStateAction<Message[]>
                  >
                ) => {
                  setMessages(
                    (prev) =>
                      sortMessages(
                        mergeMessages(
                          prev,
                          [message]
                        )
                      )
                  );
                }
              );
          };

        if (
          globalSocket.connected
        ) {
          handleConnect();
        }
      };

    const initialSocket =
      getGlobalSocket();

    if (
      initialSocket
    ) {
      attach(
        initialSocket
      );
    }

    const handleGlobalSocketConnected =
      () => {
        if (
          !mountedRef.current
        ) {
          return;
        }

        const globalSocket =
          socketRef.current;

        if (
          !globalSocket
        ) {
          return;
        }

        // Avoid duplicate attachment.
        if (
          socket ===
            globalSocket &&
          globalSocket
            .__privateChatHandlers
            ?.has(id)
        ) {
          handleConnect();
          return;
        }

        attach(
          globalSocket
        );
      };

    const handleGlobalSocketDisconnected =
      () => {
        if (
          !mountedRef.current
        ) {
          return;
        }

        console.log(
          "🟠 [PRIVATE] GLOBAL SOCKET DISCONNECTED",
          id
        );

        setSocketReady(false);
      };

    const connectedSubscription =
      DeviceEventEmitter.addListener(
        "socket-connected",
        handleGlobalSocketConnected
      );

    const disconnectedSubscription =
      DeviceEventEmitter.addListener(
        "socket-disconnected",
        handleGlobalSocketDisconnected
      );

    return () => {
      console.log(
        "🧹 [PRIVATE] CLEANUP",
        {
          chatId: id,
        }
      );

      mountedRef.current =
        false;

      connectedSubscription.remove();

      disconnectedSubscription.remove();

      const cleanupSocket =
        socket;

      if (
        !cleanupSocket
      ) {
        setSocketReady(false);
        return;
      }

      const handlers =
        cleanupSocket
          .__privateChatHandlers
          ?.get(id);

      if (
        cleanupSocket.connected
      ) {
        cleanupSocket.emit(
          "leave_chat",
          {
            chatId: id,
          }
        );
      }

      if (handlers) {
        cleanupSocket.off(
          "connect",
          handlers.handleConnect
        );

        cleanupSocket.off(
          "typing",
          handlers.handleTyping
        );

        cleanupSocket.off(
          "stop_typing",
          handlers.handleStopTyping
        );

        cleanupSocket.off(
          "disconnect",
          handlers.handleDisconnect
        );

        cleanupSocket.off(
          "connect_error",
          handlers.handleError
        );

        cleanupSocket.off(
          "error",
          handlers.handleErr
        );

        cleanupSocket.off(
          "receive_message",
          handlers.handleReceiveMessage
        );

        cleanupSocket.off(
          "user_status",
          handlers.handleUserStatus
        );

        cleanupSocket
          .__privateChatHandlers
          ?.delete(id);
      }

      delete cleanupSocket.setPrivateChatMessages;

      setSocketReady(false);

      console.log(
        "✅ [PRIVATE] CLEANED",
        id
      );
    };
  }, [
    chatId,
    currentUser?.id,
    socketRef,
    setIsTyping,
    setChatUser,
  ]);

  return {
    socketRef,
    socketReady,
  };
}