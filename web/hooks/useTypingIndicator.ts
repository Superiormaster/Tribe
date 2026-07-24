'use client';

import { useRef } from 'react';

type Props = {
  chatId: number | null;
  socketRef: any;
  setInput: (value: string) => void;
  saveDraft?: (value: string) => void;
};

export function useTypingIndicator({
  chatId,
  socketRef,
  setInput,
  saveDraft,
}: Props) {
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleTyping = (value: string) => {
    setInput(value);

    saveDraft?.(value);

    socketRef.current?.emit(
      'typing_start',
      {
        chatId,
      }
    );

    if (typingTimeout.current) {
      clearTimeout(
        typingTimeout.current
      );
    }

    typingTimeout.current =
      setTimeout(() => {
        socketRef.current?.emit(
          'typing_stop',
          {
            chatId,
          }
        );
      }, 2500);
  };

  const stopTyping = () => {
    socketRef.current?.emit(
      'typing_stop',
      {
        chatId,
      }
    );

    if (typingTimeout.current) {
      clearTimeout(
        typingTimeout.current
      );
    }
  };

  return {
    handleTyping,
    stopTyping,
  };
}