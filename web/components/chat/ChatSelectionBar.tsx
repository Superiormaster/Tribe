'use client';

import {
  X,
  Reply,
  Forward,
  Trash2,
} from 'lucide-react';

type Props = {
  selectedCount: number;
  hasMultiple: boolean;

  onClose: () => void;
  onReply: () => void;
  onForward: () => void;
  onDelete: () => void;
};

export default function ChatSelectionBar({
  selectedCount,
  hasMultiple,

  onClose,
  onReply,
  onForward,
  onDelete,
}: Props) {
  if (selectedCount === 0) return null;

  return (
    <div
      className="
        fixed
        top-0
        left-0
        right-0
        md:left-64
        z-50
        h-14
        text-gray-700
        dark:text-white
        dark:bg-[#202c33]
        bg-gray-200
        flex
        items-center
        justify-between
        px-4
      "
    >
      <div className="flex items-center gap-4">
        <button onClick={onClose}>
          <X size={22} />
        </button>

        <span className="font-semibold">
          {selectedCount}
        </span>
      </div>

      <div className="flex items-center gap-5">
        {!hasMultiple && (
          <button onClick={onReply}>
            <Reply size={20} />
          </button>
        )}

        <button
          onClick={onForward}
          className="
            flex
            items-center
            gap-2
            hover:text-blue-400
          "
        >
          <Forward size={20} />
        </button>

        <button
          onClick={onDelete}
          className="
            flex
            items-center
            gap-2
            hover:text-red-400
          "
        >
          <Trash2 size={20} />
        </button>
      </div>
    </div>
  );
}