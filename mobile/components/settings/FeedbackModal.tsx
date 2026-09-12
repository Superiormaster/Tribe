"use client";

import { useState } from "react";
import { apiRequest } from "@/utils/api";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function FeedbackModal({ open, onClose }: Props) {
  const [rating, setRating] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const submitFeedback = async () => {
    if (!rating) {
      alert("Please select a rating");
      return;
    }

    try {
      setLoading(true);

      await apiRequest("api/feedback/feedback/", {
        method: "POST",
        data: {
          rating,
          message,
        },
      });

      setRating("");
      setMessage("");
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to send feedback");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md p-5">

        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
          Share Feedback
        </h2>

        <p className="text-gray-500 mt-1">
          How has your experience been?
        </p>

        {/* RATINGS */}
        <div className="mt-4 space-y-2">
          
          <button
            onClick={() => setRating("very_satisfied")}
            className={`w-full p-3 rounded-xl border text-left ${
              rating === "very_satisfied"
                ? "border-green-500 bg-green-50 dark:bg-green-950"
                : ""
            }`}
          >
            😊 Very Satisfied
          </button>

          <button
            onClick={() => setRating("satisfied")}
            className={`w-full p-3 rounded-xl border text-left ${
              rating === "satisfied"
                ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950"
                : ""
            }`}
          >
            🙂 Satisfied
          </button>

          <button
            onClick={() => setRating("not_satisfied")}
            className={`w-full p-3 rounded-xl border text-left ${
              rating === "not_satisfied"
                ? "border-red-500 bg-red-50 dark:bg-red-950"
                : ""
            }`}
          >
            😐 Not Satisfied
          </button>
        </div>

        {/* MESSAGE */}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us more (optional)..."
          className="w-full h-28 mt-4 border rounded-xl p-3 resize-none"
        />

        {/* ACTIONS */}
        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 border rounded-xl py-3"
          >
            Cancel
          </button>

          <button
            onClick={submitFeedback}
            disabled={loading}
            className="flex-1 bg-indigo-600 text-white rounded-xl py-3"
          >
            {loading ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}