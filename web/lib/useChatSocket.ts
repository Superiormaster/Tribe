'use client';

import {
  useEffect,
  useState,
  useRef,
  useCallback,
} from 'react';

import type { Socket } from 'socket.io-client';
import type { TribeSocket } from "@/lib/socket";
import { useNetwork } from '@/components/networkConnection/NetworkContext';

import {
  mergeMessages,
  sortMessages,
} from '@/utils/chat/messageMerger';

import type { Message } from '@/utils/chat/messageContract';

import type {
  Dispatch,
  SetStateAction,
} from 'react';

type CurrentUser = {
  id: number;
};

type PrivateChatHandlerMap = Map<
  number,
  PrivateChatHandlers
>;

type Props = {
  chatId: number | null;

  currentUser: CurrentUser | null;

  socketRef: React.RefObject<
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
  const { isOnline } = useNetwork();
  const isOnlineRef =
    useRef(isOnline);
  
  useEffect(() => {
    isOnlineRef.current =
      isOnline;
  }, [isOnline]);

  const [
    socketReady,
    setSocketReady,
  ] = useState(false);
  
  const handlersRef = useRef<{
    setMessages?: Dispatch<
      SetStateAction<Message[]>
    >;
  
    setIsTyping?: Dispatch<
      SetStateAction<boolean>
    >;
  }>({});
  
  const setHandlers = useCallback(
    ({
      setMessages,
      setIsTyping,
    }: {
      setMessages?: Dispatch<
        SetStateAction<Message[]>
      >;
  
      setIsTyping?: Dispatch<
        SetStateAction<boolean>
      >;
    }) => {
      handlersRef.current = {
        setMessages,
        setIsTyping,
      };
    },
    []
  );

  useEffect(() => {

    if (
      !chatId ||
      !currentUser?.id
    ) {
      setSocketReady(false);
      return;
    }

    const id =
      Number(chatId);

    const currentUserId =
      Number(currentUser.id);

    mountedRef.current = true;

    console.log(
      '🔵 [PRIVATE] MOUNT',
      {
        chatId: id,
        userId: currentUserId,
      }
    );

    let socket:
      TribeSocket | null = null;

    const getGlobalSocket =
      (): TribeSocket | null => {

        const current =
          socketRef.current;

        if (!current) {

          console.log(
            '⏳ [PRIVATE] Global socket not available yet',
            id
          );

          return null;
        }

        socket =
          current;

        return current;
      };

    const handleConnect = () => {

      if (
        !mountedRef.current ||
        !socket
      ) {
        return;
      }

      console.log(
        '🟢 [PRIVATE] SOCKET CONNECTED',
        {
          chatId: id,
          socketId: socket.id,
        }
      );

      setSocketReady(false);

      socket.emit(
        'join_chat',
        {
          chatId: id,
        }
      );
  
      socket.emit("chat_view", {
        chatId,
        visible: true,
      });

      setSocketReady(true);
    };

    const markChatAsSeen = useCallback(
      (targetChatId: number) => {
        if (
          !socket?.connected
        ) {
          return;
        }
    
        if (!isOnlineRef.current) {
          return;
        }
    
        if (
          document.visibilityState !==
          "visible"
        ) {
          return;
        }
    
        if (
          Number(targetChatId) !==
          Number(chatId)
        ) {
          return;
        }
    
        socket.emit(
          "mark_seen",
          {
            chatId: Number(targetChatId),
          }
        );
    
        console.log(
          "👁️ AUTO MARK SEEN:",
          targetChatId
        );
      },
      [
        socket,
        chatId,
      ]
    );

    const handleReceiveMessage = (
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
            setMessages:
              Dispatch<
                SetStateAction<Message[]>
              >
          ) => {

            setMessages(
              prev =>
                sortMessages(
                  mergeMessages(
                    prev,
                    [message]
                  )
                )
            );

          }
        );
      
      if (
        Number(message.chat) ===
        Number(chatId)
      ) {
        markChatAsSeen(
          Number(message.chat)
        );
      }
    };

    const handleTyping = (
      data: any
    ) => {

      const eventChatId =
        Number(
          data?.chatId ??
          data?.chat
        );

      if (
        eventChatId !== id
      ) {
        return;
      }

      socket?.onTyping?.(
        data
      );
    };

    const handleStopTyping = (
      data: any
    ) => {

      const eventChatId =
        Number(
          data?.chatId ??
          data?.chat
        );

      if (
        eventChatId !== id
      ) {
        return;
      }

      socket?.onStopTyping?.(
        data
      );
    };

    const handleDisconnect = (
      reason: string
    ) => {

      if (
        !mountedRef.current
      ) {
        return;
      }

      console.log(
        '🟠 [PRIVATE] SOCKET DISCONNECTED',
        {
          chatId: id,
          reason,
        }
      );

      setSocketReady(false);
    };

    const handleError = (
      err: any
    ) => {

      console.error(
        '🔴 [PRIVATE] CONNECT ERROR',
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

    const handleErr = (
      err: any
    ) => {

      console.error(
        '🔴 [PRIVATE] SOCKET ERROR',
        {
          chatId: id,
          error: err,
        }
      );
    };

    const attach = (
      globalSocket: TribeSocket
    ) => {

      if (
        !mountedRef.current
      ) {
        return;
      }

      socket =
        globalSocket;

      globalSocket.__privateChatHandlers =
        globalSocket.__privateChatHandlers ||
        new Map();

      const existing =
        globalSocket
          .__privateChatHandlers
          .get(id);

      if (existing) {

        console.warn(
          '⚠️ [PRIVATE] Existing handlers found, cleaning first',
          id
        );

        globalSocket.off(
          'connect',
          existing.handleConnect
        );

        globalSocket.off(
          'typing',
          existing.handleTyping
        );

        globalSocket.off(
          'stop_typing',
          existing.handleStopTyping
        );

        globalSocket.off(
          'disconnect',
          existing.handleDisconnect
        );

        globalSocket.off(
          'connect_error',
          existing.handleError
        );

        globalSocket.off(
          'error',
          existing.handleErr
        );

        globalSocket.off(
          'receive_message',
          existing.handleReceiveMessage
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
          }
        );

      globalSocket.on(
        'connect',
        handleConnect
      );

      globalSocket.on(
        'typing',
        handleTyping
      );

      globalSocket.on(
        'stop_typing',
        handleStopTyping
      );

      globalSocket.on(
        'disconnect',
        handleDisconnect
      );

      globalSocket.on(
        'connect_error',
        handleError
      );

      globalSocket.on(
        'error',
        handleErr
      );

      globalSocket.on(
        'receive_message',
        handleReceiveMessage
      );

      globalSocket.onTyping =
        (
          data: any
        ) => {

          if (
            Number(
              data?.userId
            ) ===
            currentUserId
          ) {
            return;
          }

          setIsTyping(true);
        };

      globalSocket.onStopTyping =
        (
          data: any
        ) => {

          if (
            Number(
              data?.userId
            ) ===
            currentUserId
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

          globalSocket
            .setPrivateChatMessages
            ?.(
              id,
              (
                setMessages:
                  Dispatch<
                    SetStateAction<Message[]>
                  >
              ) => {

                setMessages(
                  prev =>
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
          '🟠 [PRIVATE] GLOBAL SOCKET DISCONNECTED',
          id
        );

        setSocketReady(false);
      };

    window.addEventListener(
      'socket-connected',
      handleGlobalSocketConnected
    );

    window.addEventListener(
      'socket-disconnected',
      handleGlobalSocketDisconnected
    );

    return () => {

      console.log(
        '🧹 [PRIVATE] CLEANUP',
        {
          chatId: id,
        }
      );

      mountedRef.current =
        false;

      window.removeEventListener(
        'socket-connected',
        handleGlobalSocketConnected
      );

      window.removeEventListener(
        'socket-disconnected',
        handleGlobalSocketDisconnected
      );

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
          'leave_chat',
          {
            chatId: id,
          }
        );
  
        cleanupSocket.emit("chat_view", {
          chatId: null,
          visible: false,
        });
      }

      if (
        handlers
      ) {

        cleanupSocket.off(
          'connect',
          handlers.handleConnect
        );

        cleanupSocket.off(
          'typing',
          handlers.handleTyping
        );

        cleanupSocket.off(
          'stop_typing',
          handlers.handleStopTyping
        );

        cleanupSocket.off(
          'disconnect',
          handlers.handleDisconnect
        );

        cleanupSocket.off(
          'connect_error',
          handlers.handleError
        );

        cleanupSocket.off(
          'error',
          handlers.handleErr
        );

        cleanupSocket.off(
          'receive_message',
          handlers.handleReceiveMessage
        );

        cleanupSocket
          .__privateChatHandlers
          ?.delete(id);
      }

      delete cleanupSocket
        .setPrivateChatMessages;

      setSocketReady(false);

      console.log(
        '✅ [PRIVATE] CLEANED',
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
    setHandlers,
  };
}