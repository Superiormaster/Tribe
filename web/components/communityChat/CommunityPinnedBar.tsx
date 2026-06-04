'use client';

import { Pin } from 'lucide-react';

type Props = {
  pinnedMessages: any[];
  onJumpToMessage?: (id: number) => void;
};

export default function CommunityPinnedBar({
  pinnedMessages,
  onJumpToMessage,
}: Props) {
  if (!pinnedMessages?.length) return null;

  return (
    <div className="border-b p-2 bg-yellow-50 dark:bg-yellow-900/20">
      <div className="flex items-center gap-2 mb-1">
        <Pin size={16} />
        <span className="font-semibold text-sm">Pinned Messages</span>
      </div>

      <div className="space-y-1">
        {pinnedMessages.map((msg) => (
          <div
            key={msg.id}
            onClick={() => onJumpToMessage?.(msg.id)}
            className="text-sm cursor-pointer hover:underline truncate"
          >
            <span className="font-medium">{msg.username}: </span>
            <span>{msg.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}