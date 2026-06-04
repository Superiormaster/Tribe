import { useState } from 'react';

export function useMessageSelection() {
  const [selectedMessages, setSelectedMessages] =
    useState<Set<string>>(new Set());

  const toggleSelectMessage = (
    id: string | number
  ) => {
    setSelectedMessages(prev => {
      const next = new Set(prev);

      if (next.has(String(id))) {
        next.delete(String(id));
      } else {
        next.add(String(id));
      }

      return next;
    });
  };

  const clearSelection = () => {
    setSelectedMessages(new Set());
  };

  return {
    selectedMessages,
    toggleSelectMessage,
    clearSelection,
  };
}