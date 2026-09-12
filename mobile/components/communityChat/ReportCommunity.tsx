'use client';

import { useState } from "react";

interface ReportCommunityProps {
  open: boolean;
  communityName?: string;
  onClose: () => void;
  onSubmit: (
    reason: string,
    details: string
  ) => Promise<void> | void;
}

export default function ReportCommunity({
  open,
  communityName,
  onClose,
  onSubmit,
}: ReportCommunityProps) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const submit = async () => {
    if (!reason) {
      alert("Please select a reason");
      return;
    }

    try {
      setLoading(true);

      await onSubmit(reason, details);

      setReason("");
      setDetails("");

      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/50 flex items-center justify-center">

      <div className="w-[90%] max-w-md rounded-xl bg-gray-200 dark:bg-gray-900 p-5">

        <h2 className="font-bold text-lg mb-2 text-gray-800 dark:text-gray-100">
          Report Community
        </h2>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Report{" "}
          <span className="font-semibold text-gray-800 dark:text-gray-200">
            {communityName || "this community"}
          </span>{" "}
          to Tribe for review.
        </p>

        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={loading}
          className="
            w-full
            rounded-md
            border
            p-2
            mb-3
            bg-gray-100
            dark:bg-gray-800
            text-gray-800
            dark:text-gray-100
          "
        >
          <option value="">Select reason</option>
          <option value="spam">Spam</option>
          <option value="harassment">Harassment</option>
          <option value="hate_speech">Hate Speech</option>
          <option value="violence">Violence</option>
          <option value="nudity">Nudity</option>
          <option value="misinformation">Misinformation</option>
          <option value="copyright">Copyright</option>
          <option value="illegal_content">Illegal Content</option>
          <option value="other">Other</option>
        </select>

        <textarea
          rows={4}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          disabled={loading}
          placeholder="Additional details (optional)"
          className="
            w-full
            rounded-md
            border
            p-2
            bg-gray-100
            dark:bg-gray-800
            text-gray-800
            dark:text-gray-100
          "
        />

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Reports are reviewed by Tribe. Community owners do not receive
          control over platform reports.
        </p>

        <div className="flex justify-end gap-3 mt-4">

          <button
            onClick={onClose}
            disabled={loading}
            className="
              px-4
              py-2
              rounded-md
              bg-gray-300
              text-gray-700
              dark:bg-gray-700
              dark:text-gray-100
            "
          >
            Cancel
          </button>

          <button
            onClick={submit}
            disabled={loading}
            className="
              px-4
              py-2
              rounded-md
              bg-red-600
              text-white
              disabled:opacity-50
            "
          >
            {loading ? "Submitting..." : "Submit Report"}
          </button>

        </div>

      </div>
    </div>
  );
}