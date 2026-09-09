import { useCallback } from "react";

import type { Message } from "@/utils/chat/messageContract";
import { updateStatus } from "@/utils/inbox/status";
import { updateMessage } from "@/lib/messageDB";
import { updateCommunityMessage } from "@/lib/communityMessageDB";

type SetMessages =
  React.Dispatch<React.SetStateAction<Message[]>>;

interface UseChatStatusProps {
  chatId: number;
  currentUser: number | null;
  setMessages: SetMessages;
  chatType: "private" | "community";
}

interface StatusEvent {
  messageIds?: number[];
  userId: number;
  chatId: number;
}

export function useDelivered({
  chatId,
  currentUser,
  setMessages,
  chatType,
}: UseChatStatusProps) {

  const updateLocalMessage = useCallback(
    async (
      clientId: string,
      patch: Partial<Message>
    ) => {
      if (!currentUser || !clientId) {
        return;
      }

      try {
        if (chatType === "community") {
          await updateCommunityMessage(
            clientId,
            Number(currentUser),
            patch
          );
        } else {
          await updateMessage(
            clientId,
            Number(currentUser),
            patch
          );
        }
      } catch (error) {
        console.error(
          `[IDB STATUS] Failed to update ${chatType} message`,
          {
            client_id: clientId,
            patch,
            error,
          }
        );
      }
    },
    [chatType, currentUser]
  );

  const applyStatus = useCallback(
    (
      messageIds: number[],
      nextStatus: "delivered" | "seen"
    ) => {
      if (
        !currentUser ||
        !messageIds.length
      ) {
        return;
      }

      const idSet = new Set(
        messageIds.map(Number)
      );

      let messagesToPersist: Array<{
        clientId: string;
        status: Message["status"];
      }> = [];

      setMessages((prev) => {
        const next = prev.map((msg) => {
          const serverId = Number(
            msg.server_id ?? msg.id
          );

          if (
            Number(msg.sender) !== Number(currentUser) ||
            !idSet.has(serverId) ||
            !msg.client_id
          ) {
            return msg;
          }

          const updatedStatus = updateStatus(
            msg.status,
            nextStatus
          );

          messagesToPersist.push({
            clientId: msg.client_id,
            status: updatedStatus,
          });

          if (updatedStatus === msg.status) {
            return msg;
          }

          return {
            ...msg,
            status: updatedStatus,
          };
        });

        return next;
      });

      if (messagesToPersist.length > 0) {
        const updates = messagesToPersist;

        void Promise.all(
          updates.map(({ clientId, status }) =>
            updateLocalMessage(clientId, {
              status,
            })
          )
        );
      }
    },
    [
      currentUser,
      setMessages,
      updateLocalMessage,
    ]
  );

  const handleDelivered = useCallback(
    ({
      messageIds = [],
      userId,
      chatId: eventChatId,
    }: StatusEvent) => {
      if (
        !currentUser ||
        Number(userId) === Number(currentUser) ||
        Number(eventChatId) !== Number(chatId) ||
        messageIds.length === 0
      ) {
        return;
      }

      applyStatus(
        messageIds,
        "delivered"
      );
    },
    [
      chatId,
      currentUser,
      applyStatus,
    ]
  );

  const handleSeen = useCallback(
    ({
      messageIds = [],
      userId,
      chatId: eventChatId,
    }: StatusEvent) => {
      if (
        !currentUser ||
        Number(eventChatId) !== Number(chatId)
      ) {
        return;
      }
  
      if (
        Number(userId) === Number(currentUser)
      ) {
        window.dispatchEvent(
          new CustomEvent(
            "chat-unread-update",
            {
              detail: {
                chatId: Number(chatId),
                chatType: "private",
              },
            }
          )
        );
  
        return;
      }
  
      if (messageIds.length === 0) {
        return;
      }
  
      applyStatus(
        messageIds,
        "seen"
      );
    },
    [
      currentUser,
      chatId,
      applyStatus,
    ]
  );

  return {
    handleDelivered,
    handleSeen,
  };
}