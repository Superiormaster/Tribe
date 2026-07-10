'use client';

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (
    duration:
      | "8h"
      | "1w"
      | "forever"
  ) => void;
};

export default function MuteModal({
  open,
  onClose,
  onSelect,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="
        fixed inset-0 z-[110]
        bg-black/40
        flex items-center justify-center
      "
      onClick={onClose}
    >
      <div
        className="
          bg-white
          dark:bg-[#111b21]
          text-gray-700
          dark:text-gray-300
          rounded-2xl
          w-[90%]
          max-w-sm
          p-3
        "
        onClick={(e) =>
          e.stopPropagation()
        }
      >
        <h2
          className="
            p-2
            text-lg
            font-semibold
            border-b
          "
        >
          Mute notifications
        </h2>

        <button
          onClick={() =>
            onSelect("8h")
          }
          className="
            w-full
            text-left
            p-4
          "
        >
          8 hours
        </button>

        <button
          onClick={() =>
            onSelect("1w")
          }
          className="
            w-full
            text-left
            p-4
          "
        >
          1 week
        </button>

        <button
          onClick={() =>
            onSelect("forever")
          }
          className="
            w-full
            text-left
            p-4
          "
        >
          Always
        </button>
      </div>
    </div>
  );
}