"use client";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function InstallModal({
  open,
  onClose,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 flex items-end justify-center">

      <div className="w-full max-w-md rounded-t-3xl text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 p-6">

        <div className="mx-auto mb-5 h-1.5 w-14 rounded-full bg-gray-300" />

        <h2 className="text-xl font-bold">
          Install Tribe
        </h2>

        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Your browser hasn't enabled one-tap installation yet.
          You can still install Tribe manually.
        </p>

        <div className="mt-6 space-y-4">

          <div className="rounded-xl bg-gray-100 dark:bg-gray-800 p-4">
            <p className="font-semibold">
              Android (Chrome)
            </p>

            <p className="text-sm mt-2">
              1. Tap the ⋮ menu.
            </p>

            <p className="text-sm">
              2. Tap <b>Install app</b> or <b>Add to Home screen</b>.
            </p>

            <p className="text-sm">
              3. Tap <b>Install</b>.
            </p>
          </div>

          <div className="rounded-xl bg-gray-100 dark:bg-gray-800 p-4">
            <p className="font-semibold">
              Samsung Internet
            </p>

            <p className="text-sm mt-2">
              Menu → Add page to → Home screen.
            </p>
          </div>

          <div className="rounded-xl bg-gray-100 dark:bg-gray-800 p-4">
            <p className="font-semibold">
              iPhone (Safari)
            </p>

            <p className="text-sm mt-2">
              Share → Add to Home Screen.
            </p>
          </div>

        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-indigo-600 py-3 text-white font-semibold"
        >
          Got it
        </button>

      </div>

    </div>
  );
}