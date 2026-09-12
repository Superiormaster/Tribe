'use client';

import { useState } from "react";

interface ReportMessageProps {
    open: boolean;
    username?: string;
    onClose: () => void;
    onSubmit: (
        reason: string,
        details: string
    ) => Promise<void> | void;
}

export default function ReportMessage({
    open,
    username,
    onClose,
    onSubmit,
}: ReportMessageProps) {

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
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">

            <div className="w-[90%] max-w-md rounded-xl bg-gray-200 dark:bg-gray-900 p-5">

                <h2 className="font-bold text-lg mb-2 text-gray-800 dark:text-gray-100">
                    Report User
                </h2>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Report <span className="font-semibold text-gray-800 dark:text-gray-200">
                        @{username || "this user"}
                    </span>
                </p>

                <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full rounded-md border p-2 mb-3 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                >
                    <option value="">Select reason</option>
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
                    className="w-full rounded-md border p-2 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                />

                <div className="flex justify-end gap-3 mt-4">

                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 rounded-md bg-gray-300 text-gray-700 dark:bg-gray-700 dark:text-gray-100"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={submit}
                        disabled={loading}
                        className="px-4 py-2 rounded-md bg-red-600 text-white"
                    >
                        {loading ? "Submitting..." : "Submit"}
                    </button>

                </div>

            </div>

        </div>
    );
}