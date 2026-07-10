'use client';

type Props = {
  open: boolean;
  onClose: () => void;
  blocked: boolean;
  muted: boolean;
  onBlock: () => void;
  onMute: () => void;
};

export default function ChatOptionsModal({
  open,
  onClose,
  blocked,
  muted,
  onBlock,
  onMute,
}: Props) {
  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[90]"
        onClick={onClose}
      />

      <div
        className="
          absolute
          right-2
          top-9
          mt-2
          w-20
          bg-white
          dark:bg-[#111b21]
          text-gray-700
          dark:text-gray-300
          border
          border-gray-200
          dark:border-gray-700
          rounded-xl
          shadow-xl
          z-[100]
          overflow-hidden
        "
      >
        <button
          onClick={onBlock}
          className="
            w-full
            text-left
            px-4
            py-3
            hover:bg-gray-100
            dark:hover:bg-gray-800
          "
        >
          {blocked
            ? "Unblock"
            : "Block"}
        </button>

        <button
          onClick={onMute}
          className="
            w-full
            text-left
            px-4
            py-3
            hover:bg-gray-100
            dark:hover:bg-gray-800
          "
        >
          {muted
            ? "Unmute"
            : "Mute"}
        </button>
      </div>
    </>
  );
}