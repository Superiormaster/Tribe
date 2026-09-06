import { useRef } from "react";

type Props = {
  chatId: number | null;
  socketRef: any;
  setInput: (value: string) => void;
  saveDraft?: (value: string) => void;

  startEvent?: string;
  stopEvent?: string;

  payloadKey?: string;
};

export function useTypingIndicator({
  chatId,
  socketRef,
  setInput,
  saveDraft,

  startEvent = "typing_start",
  stopEvent = "typing_stop",

  payloadKey = "chatId",
}: Props) {
  const typingTimeout =
    useRef<ReturnType<
      typeof setTimeout
    > | null>(null);

  const handleTyping = (
    value: string
  ) => {
    setInput(value);

    saveDraft?.(value);

    if (!socketRef.current) {
      return;
    }

    socketRef.current.emit(
      startEvent,
      {
        [payloadKey]: chatId,
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
          stopEvent,
          {
            [payloadKey]: chatId,
          }
        );

        typingTimeout.current =
          null;
      }, 2500);
  };

  const stopTyping = () => {
    socketRef.current?.emit(
      stopEvent,
      {
        [payloadKey]: chatId,
      }
    );

    if (typingTimeout.current) {
      clearTimeout(
        typingTimeout.current
      );

      typingTimeout.current =
        null;
    }
  };

  return {
    handleTyping,
    stopTyping,
  };
}