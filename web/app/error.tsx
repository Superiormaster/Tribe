"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global Error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6 text-center dark:bg-gray-950">
      <h1 className="mb-4 text-gray-700 dark:text-gray-200 text-2xl font-bold">
        Something went wrong
      </h1>

      <p className="mb-6 text-gray-500">
        An unexpected error occurred. Please try again.
      </p>

      <button
        onClick={() => reset()}
        className="rounded-lg bg-indigo-600 px-5 py-3 text-white"
      >
        Try Again
      </button>
    </div>
  );
}