'use client';

type Props = {
  open: boolean;
  count: number;
  onClose: () => void;
  onDeleteChat: () => void;
};

export default function InboxDeleteModal({
  open,
  count,
  onClose,
  onDeleteChat,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="
          w-full
          max-w-md
          dark:bg-[#202c33]
          bg-gray-400
          rounded-2xl
          p-4
        "
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
          {count === 1
            ? "Delete this chat?"
            : `Delete ${count} chats?`}
        </h3>

        <div className="flex flex-col">
          <button
            onClick={onDeleteChat}
            className="
              text-left
              py-4
              text-gray-900
              dark:text-white
              border-b border-gray-700
            "
          >
            Delete
          </button>

          <button
            onClick={onClose}
            className="
              text-left
              py-4
              text-gray-800
              dark:text-gray-400
            "
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}