'use client';

import { useState } from 'react';

export function useChatSelection() {
  const [selectedChat, setSelectedChat] =
    useState<Set<number>>(new Set());

  const toggleSelectChat = (
    chatId: number
  ) => {
    setSelectedChat(prev => {
      const next = new Set(prev);

      if (next.has(chatId)) {
        next.delete(chatId);
      } else {
        next.add(chatId);
      }

      return next;
    });
  };

  const clearChatSelection = () => {
    setSelectedChat(new Set());
  };
  
  const selectionMode = selectedChat.size > 0;

  return {
    selectedChat,
    toggleSelectChat,
    clearChatSelection,
    selectionMode,
  };
}