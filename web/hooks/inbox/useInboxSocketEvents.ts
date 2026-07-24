'use client';

import { useCallback } from 'react';
import { updateStatus } from '@/utils/inbox/status';
import type { Chat } from "@/hooks/inbox/useRecentChats";

type MessageStatus =
  | 'sending'
  | 'pending'
  | 'uploading'
  | 'sent'
  | 'delivered'
  | 'seen'
  | 'failed';

interface UseInboxSocketEventsProps {
  userId: number;
  setRecentChats: React.Dispatch<React.SetStateAction<Chat[]>>;
}

export function useInboxSocketEvents({
  userId,
  setRecentChats,
}: UseInboxSocketEventsProps) {
  const handleDelivered = useCallback(
    ({
      chatId,
    }: {
      chatId: number;
      messageIds: number[];
    }) => {
      setRecentChats((prev: any) =>
        prev.map((chat: any) =>
          chat.chat_id !== chatId
            ? chat
            : {
                ...chat,
                status: updateStatus(
                  chat.status ?? 'sending',
                  'delivered'
                ),
              }
        )
      );
    },
    [setRecentChats]
  );

  const handleSeen = useCallback(
    ({
      chatId,
      userId: senderId,
    }: {
      chatId: number;
      messageIds: number[];
      userId: number;
    }) => {
      // Ignore our own seen receipt
      if (senderId === userId) return;

      setRecentChats((prev: any) =>
        prev.map((chat: any) =>
          chat.chat_id !== chatId
            ? chat
            : {
                ...chat,
                status: updateStatus(
                  chat.status ?? 'sending',
                  'seen'
                ),
              }
        )
      );
    },
    [userId, setRecentChats]
  );

  return {
    onDelivered: handleDelivered,
    onSeen: handleSeen,
  };
}