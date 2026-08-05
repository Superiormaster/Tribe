// components/chat/ReactionPicker.tsx

"use client";

import { REACTION_EMOJIS } from "@/utils/chat/reactions";

type Props = {
  visible: boolean;
  top: number;
  left: number;
  isCurrentUser: boolean;
  messageId: string;
  onReact: (messageId: string, emoji: string) => void;
  onClose: () => void;
  onOpenEmojiDrawer?: () => void;
};

export default function ReactionPicker({
  visible,
  top,
  left,
  isCurrentUser,
  messageId,
  onReact,
  onClose,
  onOpenEmojiDrawer,
}: Props) {
  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top,
        left,
        transform: "translateX(-50%)",
        zIndex: 99999,
        width: "max-content",
        maxWidth: "none",
      }}
    >
      <div className="
        bg-gray-200
        dark:bg-[#202c33]
        rounded-full
        px-2
        py-1
        flex
        items-center
        gap-4
        shadow-2xl
        border
        border-indigo-400
        dark:border-gray-700
        w-max
        whitespace-nowrap
        overflow-x-auto
        max-w-[95vw]
      ">
        {REACTION_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => {
              onReact(messageId, emoji);
              onClose();
            }}
            className="
              text-[18px]
              active:scale-125
              hover:scale-125
              transition-transform
            "
          >
            {emoji}
          </button>
        ))}

        <button
          onClick={() => {
            onClose();
            onOpenEmojiDrawer?.();
          }}
          className="
            w-10
            h-10
            rounded-full
            flex
            items-center
            justify-center
            text-xl
            text-gray-700
            dark:text-white
            hover:bg-black/10
          "
        >
          +
        </button>
      </div>
    </div>
  );
}