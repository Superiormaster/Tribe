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
    console.error("App Error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-2xl text-gray-700 dark:text-gray-200 font-bold">
          Something went wrong
        </h1>

        <p className="mt-2 text-gray-500">
          An unexpected error occurred.
        </p>

        <button
          onClick={() => reset()}
          className="mt-5 rounded bg-indigo-600 px-4 py-2 text-white"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}