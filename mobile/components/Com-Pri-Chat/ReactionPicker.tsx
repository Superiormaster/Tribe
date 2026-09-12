// components/chat/ReactionPicker.tsx

"use client";

import { REACTION_EMOJIS } from "@/utils/chat/reactions";

type Props = {
  visible: boolean;
  top: number;
  left: number;
  isCurrentUser: boolean;
  messageId: string | null;
  onReact: (messageId: string, emoji: string) => void;
  onClose: () => void;
  onOpenEmojiDrawer?: () => void;
  onClearSelection?: () => void;
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
  onClearSelection,
}: Props) {
  if (!visible) return null;

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
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
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
          
              if (!messageId) return;
          
              onReact(messageId, emoji);
              onClearSelection?.();
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
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
        
            onClearSelection?.();
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