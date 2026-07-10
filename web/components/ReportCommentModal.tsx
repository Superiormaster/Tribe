'use client';

type Props = {
  open: boolean;
  reason: string;
  details: string;
  setReason: (value: string) => void;
  setDetails: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export default function ReportCommentModal({
  open,
  reason,
  details,
  setReason,
  setDetails,
  onClose,
  onSubmit,
}: Props) {

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-5 shadow-xl"
      >
        <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-gray-100">
          Report Comment / Reply
        </h2>

        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mb-3 w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
        >
          <option value="">Select a reason</option>
          <option value="spam">Spam</option>
          <option value="harassment">Harassment</option>
          <option value="hate_speech">Hate Speech</option>
          <option value="violence">Violence</option>
          <option value="nudity">Nudity</option>
          <option value="misinformation">Misinformation</option>
          <option value="copyright">Copyright</option>
          <option value="other">Other</option>
        </select>

        <textarea
          rows={4}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Additional details (optional)"
          className="w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
        />

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancel
          </button>

          <button
            onClick={onSubmit}
            className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
          >
            Submit Report
          </button>
        </div>
      </div>
    </div>
  );
}