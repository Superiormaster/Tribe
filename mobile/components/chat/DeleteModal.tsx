'use client';

type Props = {
  open: boolean;
  canDeleteForEveryone: boolean;

  onClose: () => void;
  onDeleteForMe: () => void;
  onDeleteForEveryone: () => void;
};

export default function DeleteModal({
  open,
  canDeleteForEveryone,
  onClose,
  onDeleteForMe,
  onDeleteForEveryone,
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
        <h3 className="text-gray-700 dark:text-white text-lg font-semibold mb-4">
          Delete message?
        </h3>

        <div className="flex flex-col">
          <button
            onClick={onDeleteForMe}
            className="
              text-left
              py-4
              text-gray-900
              dark:text-white
              border-b border-gray-700
            "
          >
            Delete for me
          </button>

          {canDeleteForEveryone && (
            <button
              onClick={onDeleteForEveryone}
              className="
                text-left
                py-4
                text-red-600
                dark:text-red-400
                border-b border-gray-700
              "
            >
              Delete for everyone
            </button>
          )}

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