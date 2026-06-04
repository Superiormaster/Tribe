'use client';

import { useState } from 'react';
import { apiRequest } from '@/utils/api';
import { getConnectedUsers } from '@/lib/api';

type Props = {
  socketRef: any;
  chatUser?: any;
  clearSelection?: () => void;
};

export function useForwardMessages({
  socketRef,
  chatUser,
  clearSelection,
}: Props) {
  const [forwardMode, setForwardMode] = useState(false);

  const [selectedForwardUsers, setSelectedForwardUsers] =
    useState<Set<number>>(new Set());

  const [connectedUsers, setConnectedUsers] =
    useState<any[]>([]);

  const [forwardMessages, setForwardMessages] =
    useState<any[]>([]);

  const fetchConnectedUsers = async () => {
    try {
      const res = await getConnectedUsers();
      setConnectedUsers(res || []);
    } catch (err) {
      console.error('Failed to load users', err);
    }
  };

  const openForward = async (messages: any[]) => {
    try {
      setForwardMessages(messages);

      await fetchConnectedUsers();

      setForwardMode(true);
    } catch (err) {
      console.error('Forward open failed', err);
    }
  };

  const closeForward = () => {
    setForwardMode(false);
    setSelectedForwardUsers(new Set());
    setForwardMessages([]);
  };

  const sendForward = async () => {
    if (
      forwardMessages.length === 0 ||
      selectedForwardUsers.size === 0
    ) {
      return;
    }

    try {
      for (const userId of selectedForwardUsers) {
        const chat = await apiRequest(
          'api/chats/get-or-create/',
          {
            method: 'POST',
            data: {
              user_id: userId,
            },
          }
        );

        for (const msg of forwardMessages) {
          socketRef.current?.emit('send_message', {
            chatId: chat.chat_id,
            text: msg.text,
            media_url: msg.media_url,
            media_type: msg.media_type,
          });
        }
      }

      closeForward();
      clearSelection?.();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredUsers = connectedUsers.filter(
    (u) => u.id !== chatUser?.id
  );

  return {
    forwardMode,
    selectedForwardUsers,
    setSelectedForwardUsers,

    forwardMessages,

    users: filteredUsers,

    openForward,
    closeForward,
    sendForward,
  };
}