'use client';

import {
  X,
  Reply,
  Forward,
  Trash2,
  Pin,
  PinOff,
} from 'lucide-react';

type Props = {
  selectedCount: number;
  hasMultiple: boolean;
  
  canReply: boolean;
  canForward: boolean;

  // Pin permissions/state
  canPin?: boolean;
  isPinned?: boolean;

  onPin?: () => void;
  onUnpin?: () => void;

  onClose: () => void;
  onReply: () => void;
  onForward: () => void;
  onDelete: () => void;
};

export default function ChatSelectionBar({
  selectedCount,
  hasMultiple,

  canPin,
  isPinned,
  
  canReply,
  canForward,

  onPin,
  onUnpin,

  onClose,
  onReply,
  onForward,
  onDelete,
}: Props) {
  if (selectedCount === 0) {
    return null;
  }

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
        shadow-md
      "
    >
      {/* LEFT */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onClose}
          className="
            p-1
            rounded-full
            hover:bg-gray-300
            dark:hover:bg-gray-700
          "
        >
          <X size={22} />
        </button>

        <span className="font-semibold">
          {selectedCount}
        </span>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-5">

        {/* Reply only for one message */}
        {canReply && !hasMultiple && (
          <button
            type="button"
            onClick={onReply}
            title="Reply"
            className="
              hover:text-blue-500
              transition
            "
          >
            <Reply size={20} />
          </button>
        )}

        {/* Forward */}
        {canForward && (
          <button
            type="button"
            onClick={onForward}
            title="Forward"
            className="
              hover:text-blue-500
              transition
            "
          >
            <Forward size={20} />
          </button>
        )}

        {/* PIN / UNPIN */}
        {canPin && !hasMultiple && (
          isPinned ? (
            <button
              type="button"
              onClick={onUnpin}
              title="Unpin message"
              className="
                hover:text-yellow-500
                transition
              "
            >
              <PinOff size={20} />
            </button>
          ) : (
            <button
              type="button"
              onClick={onPin}
              title="Pin message"
              className="
                hover:text-yellow-500
                transition
              "
            >
              <Pin size={20} />
            </button>
          )
        )}

        {/* Delete */}
        <button
          type="button"
          onClick={onDelete}
          title="Delete"
          className="
            hover:text-red-500
            transition
          "
        >
          <Trash2 size={20} />
        </button>

      </div>
    </div>
  );
}