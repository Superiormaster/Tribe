'use client';

import { useCallback } from "react";

import type {
  Message,
} from "@/utils/chat/messageContract";

import {
  updateStatus,
} from "@/utils/inbox/status";

type SetMessages = React.Dispatch<
  React.SetStateAction<Message[]>
>;

interface UseChatStatusProps {
  chatId: number;
  currentUser: number | null;
  setMessages: SetMessages;
}

export function useDelivered({
  chatId,
  currentUser,
  setMessages,
}: UseChatStatusProps) {

  /**
   * Socket: Seen
   */
  const handleSeen = useCallback(({
    messageIds = [],
    userId,
    chatId: eventChatId,
  }: {
    messageIds?: number[];
    userId: number;
    chatId: number;
  }) => {

    if (
      userId === currentUser ||
      eventChatId !== chatId ||
      messageIds.length === 0
    ) {
      return;
    }

    setMessages(prev =>
      prev.map(msg => {

        if (
          messageIds.includes(Number(msg.id))
        ) {
          return {
            ...msg,
            status: updateStatus(
              msg.status,
              "seen"
            ),
          };
        }

        return msg;

      })
    );

  }, [
    chatId,
    currentUser,
    setMessages,
  ]);

  /**
   * Socket: Delivered
   */
  const handleDelivered = useCallback(({
    messageIds = [],
    userId,
    chatId: eventChatId,
  }: {
    messageIds?: number[];
    userId: number;
    chatId: number;
  }) => {

    if (
      userId === currentUser ||
      eventChatId !== chatId ||
      messageIds.length === 0
    ) {
      return;
    }

    setMessages(prev =>
      prev.map(msg => {

        if (
          messageIds.includes(Number(msg.id))
        ) {
          return {
            ...msg,
            status: updateStatus(
              msg.status,
              "delivered"
            ),
          };
        }

        return msg;

      })
    );

  }, [
    chatId,
    currentUser,
    setMessages,
  ]);

  return {
    handleSeen,
    handleDelivered,
  };

}