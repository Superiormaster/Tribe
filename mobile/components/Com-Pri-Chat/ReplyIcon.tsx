'use client';

import { Reply } from "lucide-react";

type Props = {
  dragging: boolean;
  dragX: number;
  trigger: number;
  isCurrentUser: boolean;
};

export default function ReplyIcon({
  dragging,
  dragX,
  trigger,
  isCurrentUser,
}: Props) {
  if (!dragging || dragX <= 8) return null;

  return (
    <div
      className={`
        absolute top-1/2 -translate-y-1/2
        ${isCurrentUser ? "-left-8" : "-right-8"}
        pointer-events-none
        dark:text-white text-gray-700 text-xs
      `}
      style={{
        opacity: Math.min(1, dragX / trigger),
        transform: `
          translateY(-50%)
          scale(${Math.min(1, 0.7 + dragX / 300)})
        `,
      }}
    >
      <Reply />
    </div>
  );
}