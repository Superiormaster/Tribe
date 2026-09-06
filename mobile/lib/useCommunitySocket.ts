import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Alert,
  DeviceEventEmitter,
} from "react-native";

import { apiRequest } from "@/utils/api";

import {
  joinCommunity,
} from "@/lib/communitySocket";

import {
  addDesiredCommunity,
  removeDesiredCommunity,
} from "@/lib/communitySocketRegistry";

import {
  mergeMessages,
  sortMessages,
} from "@/utils/chat/messageMerger";

import type {
  Message,
} from "@/utils/chat/messageContract";

import {
  updateCommunityMessage,
} from "@/lib/communityMessageDB";

import type {
  Dispatch,
  SetStateAction,
  MutableRefObject,
} from "react";

type CurrentUser = {
  id: number;
};

type CommunityHandlers = {
  setMessages: Dispatch<
    SetStateAction<Message[]>
  >;

  setTypingUsers: Dispatch<
    SetStateAction<any[]>
  >;

  setOnlineCount: Dispatch<
    SetStateAction<number>
  >;
};

export function useCommunitySocket(
  communityId: number | null,
  currentUser: CurrentUser | null,
  socketRef: MutableRefObject<any>,
) {
  const mountedRef =
    useRef(false);

  const [
    socketReady,
    setSocketReady,
  ] = useState(false);

  const typingTimeouts =
    useRef(
      new Map<
        number,
        ReturnType<typeof setTimeout>
      >()
    );

  useEffect(() => {
    if (
      !communityId ||
      !currentUser?.id
    ) {
      setSocketReady(false);
      return;
    }

    mountedRef.current = true;

    const id =
      Number(communityId);

    addDesiredCommunity(id);

    let localSocket: any = null;

    const getGlobalSocket = () => {
      const socket =
        socketRef.current;

      if (!socket) {
        console.log(
          "⏳ [COMMUNITY] Global socket not available",
          id
        );

        return null;
      }

      localSocket = socket;

      return socket;
    };

    const doJoin = async () => {
      const socket =
        getGlobalSocket();

      if (!socket) {
        setSocketReady(false);
        return;
      }

      if (!socket.connected) {
        console.log(
          "⏳ [COMMUNITY] Global socket not connected",
          {
            communityId: id,
          }
        );

        setSocketReady(false);
        return;
      }

      console.log(
        "🏘️ [COMMUNITY] JOINING COMMUNITY",
        {
          communityId: id,
          socketId: socket.id,
        }
      );

      setSocketReady(false);

      try {
        const result =
          await joinCommunity(
            socket,
            id
          );

        if (!mountedRef.current) {
          return;
        }

        if (result?.ok) {
          console.log(
            "✅ [COMMUNITY] COMMUNITY READY",
            {
              communityId: id,
              socketId: socket.id,
              ack: result.ack,
            }
          );

          setSocketReady(true);
        } else {
          console.error(
            "❌ [COMMUNITY] JOIN FAILED",
            {
              communityId: id,
              ack: result?.ack,
            }
          );

          setSocketReady(false);
        }
      } catch (error) {
        console.error(
          "❌ [COMMUNITY] JOIN ERROR",
          {
            communityId: id,
            error,
          }
        );

        if (
          mountedRef.current
        ) {
          setSocketReady(false);
        }
      }
    };

    const handleGlobalSocketConnected =
      () => {
        if (
          !mountedRef.current
        ) {
          return;
        }

        const socket =
          getGlobalSocket();

        if (!socket) {
          return;
        }

        console.log(
          "🟢 [COMMUNITY] GLOBAL SOCKET READY",
          {
            communityId: id,
            socketId: socket.id,
          }
        );

        void doJoin();
      };

    const handleGlobalSocketDisconnected =
      () => {
        if (
          !mountedRef.current
        ) {
          return;
        }

        console.log(
          "🔴 [COMMUNITY] GLOBAL SOCKET DISCONNECTED",
          {
            communityId: id,
          }
        );

        setSocketReady(false);
      };

    const handleMessage =
      (
        message: Message
      ) => {
        if (
          Number(
            message.community ??
            message.communityId
          ) !== id
        ) {
          return;
        }

        const handlers =
          localSocket
            ?.__communityHandlers
            ?.get(id);

        handlers?.onMessage?.(
          message
        );
      };

    const handleTyping =
      (data: any) => {
        if (
          Number(
            data?.communityId
          ) !== id
        ) {
          return;
        }

        localSocket
          ?.__communityHandlers
          ?.get(id)
          ?.onTyping?.(data);
      };

    const handleReaction =
      (data: any) => {
        if (
          Number(
            data?.communityId
          ) !== id
        ) {
          return;
        }

        localSocket
          ?.__communityHandlers
          ?.get(id)
          ?.onReaction?.(data);
      };

    const handleDelete =
      (data: any) => {
        if (
          Number(
            data?.communityId
          ) !== id
        ) {
          return;
        }

        localSocket
          ?.__communityHandlers
          ?.get(id)
          ?.onDelete?.(data);
      };

    const handlePresence =
      (data: any) => {
        if (
          Number(
            data?.communityId
          ) !== id
        ) {
          return;
        }

        localSocket
          ?.__communityHandlers
          ?.get(id)
          ?.onPresence?.(data);
      };

    const registerSocketHandlers =
      (socket: any) => {
        if (!socket) {
          return;
        }

        localSocket = socket;

        socket.__communityHandlers =
          socket.__communityHandlers ||
          new Map();

        socket.__communityHandlers.set(
          id,
          {
            onMessage:
              undefined,

            onTyping:
              undefined,

            onReaction:
              undefined,

            onDelete:
              undefined,

            onPresence:
              undefined,
          }
        );

        socket.on(
          "community_message",
          handleMessage
        );

        socket.on(
          "community_typing",
          handleTyping
        );

        socket.on(
          "community_reaction",
          handleReaction
        );

        socket.on(
          "community_delete",
          handleDelete
        );

        socket.on(
          "community_presence_update",
          handlePresence
        );
      };

    const socket =
      getGlobalSocket();

    if (socket) {
      registerSocketHandlers(
        socket
      );

      if (socket.connected) {
        void doJoin();
      }
    }

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

    const setCommunityHandlers = ({
      setMessages,
      setTypingUsers,
      setOnlineCount,
    }: CommunityHandlers) => {
      const socket =
        socketRef.current;

      if (!socket) {
        return;
      }

      socket.__communityHandlers =
        socket.__communityHandlers ||
        new Map();

      const handlers =
        socket.__communityHandlers.get(
          id
        );

      if (!handlers) {
        return;
      }

      handlers.onMessage =
        (message: Message) => {
          setMessages(
            (prev) =>
              sortMessages(
                mergeMessages(
                  prev,
                  [message]
                )
              )
          );
        };

      handlers.onReaction =
        async (data: any) => {
          const {
            communityId:
              eventCommunityId,
            messageId,
            reactions,
          } = data;

          if (
            Number(
              eventCommunityId
            ) !== id
          ) {
            return;
          }

          const normalizedReactions =
            Array.isArray(
              reactions
            )
              ? reactions.map(
                  (
                    reaction: any
                  ) => {
                    const users =
                      Array.isArray(
                        reaction.users
                      )
                        ? reaction.users.map(
                            (
                              user: any
                            ) => ({
                              id:
                                Number(
                                  user.id
                                ),

                              username:
                                user.username ??
                                "",
                            })
                          )
                        : [];

                    return {
                      emoji:
                        reaction.emoji,

                      count:
                        Number(
                          reaction.count ??
                          users.length
                        ),

                      users,
                    };
                  }
                )
              : [];

          setMessages(
            (prev) =>
              prev.map(
                (msg) =>
                  String(msg.id) ===
                  String(messageId)
                    ? {
                        ...msg,
                        reactions:
                          normalizedReactions,
                      }
                    : msg
              )
          );

          await updateCommunityMessage(
            String(messageId),
            currentUser?.id,
            {
              reactions:
                normalizedReactions,
            }
          );
        };

      handlers.onPresence =
        ({
          onlineUserIds,
        }: {
          onlineUserIds: number[];
        }) => {
          const count =
            onlineUserIds.filter(
              (userId) =>
                Number(userId) !==
                Number(
                  currentUser?.id
                )
            ).length;

          setOnlineCount(
            count
          );
        };

      handlers.onTyping =
        ({
          userId,
          username,
          isTyping,
        }: any) => {
          if (
            Number(userId) ===
            Number(
              currentUser?.id
            )
          ) {
            return;
          }

          const numericUserId =
            Number(userId);

          if (!isTyping) {
            setTypingUsers(
              (prev) =>
                prev.filter(
                  (user) =>
                    Number(
                      user.userId
                    ) !==
                    numericUserId
                )
            );

            const timeout =
              typingTimeouts.current.get(
                numericUserId
              );

            if (timeout) {
              clearTimeout(
                timeout
              );

              typingTimeouts.current.delete(
                numericUserId
              );
            }

            return;
          }

          setTypingUsers(
            (prev) => {
              const exists =
                prev.some(
                  (user) =>
                    Number(
                      user.userId
                    ) ===
                    numericUserId
                );

              if (exists) {
                return prev;
              }

              return [
                ...prev,
                {
                  userId:
                    numericUserId,
                  username,
                },
              ];
            }
          );

          const existingTimeout =
            typingTimeouts.current.get(
              numericUserId
            );

          if (existingTimeout) {
            clearTimeout(
              existingTimeout
            );
          }

          const timeout =
            setTimeout(
              () => {
                setTypingUsers(
                  (prev) =>
                    prev.filter(
                      (user) =>
                        Number(
                          user.userId
                        ) !==
                        numericUserId
                    )
                );

                typingTimeouts.current.delete(
                  numericUserId
                );
              },
              2500
            );

          typingTimeouts.current.set(
            numericUserId,
            timeout
          );
        };
    };

    if (socket) {
      setCommunityHandlers({
        setMessages:
          (() => {
            return () => {};
          }) as any,

        setTypingUsers:
          (() => {
            return () => {};
          }) as any,

        setOnlineCount:
          (() => {
            return () => {};
          }) as any,
      });
    }

    return () => {
      mountedRef.current =
        false;

      connectedSubscription.remove();

      disconnectedSubscription.remove();

      const cleanupSocket =
        localSocket ||
        socketRef.current;

      if (cleanupSocket) {
        if (
          cleanupSocket.connected
        ) {
          cleanupSocket.emit(
            "leave_community",
            {
              communityId: id,
            }
          );
        }

        cleanupSocket
          .__communityHandlers
          ?.delete(id);

        cleanupSocket.off(
          "community_message",
          handleMessage
        );

        cleanupSocket.off(
          "community_typing",
          handleTyping
        );

        cleanupSocket.off(
          "community_reaction",
          handleReaction
        );

        cleanupSocket.off(
          "community_delete",
          handleDelete
        );

        cleanupSocket.off(
          "community_presence_update",
          handlePresence
        );
      }

      removeDesiredCommunity(id);

      typingTimeouts.current.forEach(
        (timeout) =>
          clearTimeout(timeout)
      );

      typingTimeouts.current.clear();

      setSocketReady(false);

      console.log(
        "🧹 [COMMUNITY] CLEANED",
        id
      );
    };
  }, [
    communityId,
    currentUser?.id,
    socketRef,
  ]);

  const pinMessage = async (
    messageId: number,
    pinned: boolean
  ) => {
    console.log(
      "📌 [PIN REQUEST]",
      {
        communityId,
        messageId,
        pinned,
      }
    );

    try {
      const endpoint =
        pinned
          ? `api/chats/${messageId}/community-message-pin/`
          : `api/chats/${messageId}/community-message-unpin/`;

      const data =
        await apiRequest(
          endpoint,
          {
            method: "POST",
          }
        );

      const isPinned =
        Boolean(
          data?.is_pinned
        );

      const socket =
        socketRef.current;

      if (
        socket &&
        socket.connected
      ) {
        socket.emit(
          "community_pin",
          {
            communityId,
            messageId,
            pinned: isPinned,

            message:
              isPinned
                ? data?.message ??
                  null
                : null,

            pinnedCount:
              data?.pinned_count ??
              null,

            maxPinned:
              data?.max_pinned ??
              5,

            userId:
              currentUser?.id,
          }
        );
      }

      return {
        ok: true,
        data,
        pinned: isPinned,
      };
    } catch (err: any) {
      console.error(
        "❌ [PIN API FAILED]",
        err
      );

      const error =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        err?.message ||
        "Failed to update pinned message.";

      Alert.alert(
        "Unable to pin message",
        error
      );

      return {
        ok: false,
        error,
      };
    }
  };

  return {
    socketRef,
    pinMessage,
    socketReady,
  };
}