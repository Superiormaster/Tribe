"use client";

import { useEffect } from "react";
import {
  RefreshCcw,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";
import AppLink from "@/components/AppLink";

export default function ErrorState({
  error,
  onRetry,
}: {
  error: any;
  onRetry: () => void | Promise<void>;
}) {
  useEffect(() => {
    console.error(
      "Monetization page error:",
      error
    );
  }, [error]);

  return (
    <main className="min-h-screen dark:bg-gray-800 bg-gray-300 text-gray-700 dark:text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md text-center">

        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 dark:bg-[#FFD84D]/10">
          <AlertTriangle
            className="h-8 w-8 text-[#FFD84D]"
            strokeWidth={1.8}
          />
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">
          Something went wrong
        </h1>

        <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-white/50">
          We couldn&apos;t load your monetization dashboard right now.
          Your earnings and wallet data are safe. Please try again.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">

          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#FFD84D] px-5 text-sm font-semibold text-black transition hover:bg-[#FFE066] active:scale-[0.98]"
          >
            <RefreshCcw className="h-4 w-4" />
            Try again
          </button>

          <AppLink
            href="/main/home"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-gray-500 dark:bg-white/[0.03] px-5 py-2 text-sm font-medium text-gray-100 dark:text-white transition hover:bg-white/[0.07] active:scale-[0.98]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back home
          </AppLink>

        </div>

        {error?.digest && (
          <p className="mt-8 text-xs text-white/20">
            Error reference: {error.digest}
          </p>
        )}

      </div>
    </main>
  );
}