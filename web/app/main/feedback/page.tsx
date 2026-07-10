"use client";

import { useState } from "react";
import { apiRequest } from "@/utils/api";

export default function FeedbackPage() {
  const [rating, setRating] = useState("");
  const [message, setMessage] = useState("");
  
  const handleRating = (value: string) => {
    setRating(prev =>
      prev === value ? "" : value
    );
  };

  const submitFeedback = async () => {
    if (!rating) {
      alert("Please select a rating");
      return;
    }

    try {
      await apiRequest(
        "api/feedback/feedback/",
        {
          method: "POST",
          data: {
            rating,
            message,
          },
        }
      );

      alert("Thank you for your feedback!");

      setRating("");
      setMessage("");
    } catch (err) {
      console.error(err);
      alert("Failed to submit feedback");
    }
  };

  return (
    <div className="mx-auto mt-20 max-w-2xl p-4">
      <h1 className="text-2xl font-bold text-gray-700 dark:text-gray-300">
        Feedback
      </h1>

      <p className="mt-2 text-gray-500">
        Tell us how your experience with Tribe has been.
      </p>

      <div className="mt-6 space-y-3">
        <button
          onClick={() =>
            handleRating("very_satisfied")
          }
          className={`w-full rounded-xl text-gray-700 dark:text-gray-300 border p-4 ${
            rating === "very_satisfied"
              ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950"
              : "border-gray-300"
          }`}
        >
          <div className="flex items-center gap-3">
            😊
            <span>Very Satisfied</span>
          </div>
        </button>

        <button
          onClick={() =>
            handleRating("satisfied")
          }
          className={`w-full rounded-xl border text-gray-700 dark:text-gray-300 p-4 ${
            rating === "satisfied"
              ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950"
              : "border-gray-300"
          }`}
        >
          <div className="flex items-center gap-3">
            🙂 
            <span>Satisfied</span>
          </div>
        </button>

        <button
          onClick={() =>
            handleRating("not_satisfied")
          }
          className={`w-full rounded-xl border text-gray-700 dark:text-gray-300 p-4 ${
            rating === "not_satisfied"
              ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950"
              : "border-gray-300"
          }`}
        >
          <div className="flex items-center gap-3">
            😐 
            <span>Not Satisfied</span>
          </div>
        </button>
      </div>

      <textarea
        value={message}
        onChange={(e) =>
          setMessage(e.target.value)
        }
        placeholder="Tell us more..."
        className="mt-5 h-40 w-full rounded-xl border border-indigo-600 p-4 bg-gray-200 dark:bg-gray-900 resize-none focus:outline-none"
      />

      <button
        onClick={submitFeedback}
        disabled={!rating}
        className={`mt-5 w-full rounded-xl py-3 font-semibold text-white ${
          !rating
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-indigo-600"
        }`}
      >
        Submit Feedback
      </button>
    </div>
  );
}