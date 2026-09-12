"use client";

interface Props {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function PermanentMediaTypeModal({
  open,
  onCancel,
  onConfirm,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] bg-black/70 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Permanent Change
        </h2>

        <p className="mt-4 text-gray-600 dark:text-gray-300">
          You are about to permanently change this community from
          <strong> Reels </strong>
          to
          <strong> Videos</strong>.
        </p>

        <p className="mt-3 text-sm text-red-500">
          This change cannot be reversed by community owners or moderators.
          Only the Tribe team can restore the previous media format upon
          request.
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg border px-4 py-2"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-white"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}