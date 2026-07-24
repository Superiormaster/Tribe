// hooks/useChatStatus.ts

'use client';

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import type {
  Message,
  MessageStatus,
} from "@/utils/chat/messageContract";

import {
  updateStatus,
} from "@/utils/inbox/status";


interface UseChatStatusProps {
  chatId: number;
  currentUser: number;
}

export function useChatStatus({
  chatId,
  currentUser,
}: UseChatStatusProps) {

  const [
    lastMessageStatus,
    setLastMessageStatus,
  ] = useState<MessageStatus | null>(null);

  /**
   * Updates conversation status
   */
  const updateConversationStatus =
    useCallback(
      (status: MessageStatus) => {
        setLastMessageStatus(prev =>
          prev
            ? updateStatus(prev, status)
            : status
        );
      },
      []
    );
  
  const updateLastStatus =
    useCallback(
      (status: MessageStatus) => {
        setLastMessageStatus(status);
      },
      []
    );

  /**
   * Browser events
   */
  useEffect(() => {

    const onDelivered: EventListener = (
      event
    ) => {
      const e = event as CustomEvent<{
        chatId: number;
      }>;

      if (e.detail.chatId !== chatId) return;

      updateConversationStatus(
        "delivered"
      );
    };

    const onSeen: EventListener = (
      event
    ) => {
      const e = event as CustomEvent<{
        chatId: number;
      }>;

      if (e.detail.chatId !== chatId) return;

      updateConversationStatus("seen");
    };

    window.addEventListener(
      "message-delivered",
      onDelivered
    );

    window.addEventListener(
      "message-seen",
      onSeen
    );

    return () => {

      window.removeEventListener(
        "message-delivered",
        onDelivered
      );

      window.removeEventListener(
        "message-seen",
        onSeen
      );

    };

  }, [
    chatId,
    updateConversationStatus,
  ]);

  return {

    lastMessageStatus,
    setLastMessageStatus: updateLastStatus,
    updateConversationStatus,

  };

}