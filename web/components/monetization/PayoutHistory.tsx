"use client";

import {
  ArrowDownToLine,
  CheckCircle2,
  Clock3,
  Loader2,
  MoreHorizontal,
  XCircle,
} from "lucide-react";

import { formatCurrency } from "@/utils/monetization/formatCurrency";

import type {
  Payout,
  PayoutStatus,
} from "@/utils/monetization/types/monetization";

interface PayoutHistoryProps {
  payouts: Payout[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onViewPayout?: (payout: Payout) => void;
  className?: string;
}

const STATUS_CONFIG: Record<
  PayoutStatus,
  {
    label: string;
    icon: typeof CheckCircle2;
    className: string;
  }
> = {
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    className:
      "bg-emerald-400/10 text-emerald-400",
  },

  pending: {
    label: "Pending",
    icon: Clock3,
    className:
      "bg-amber-400/10 text-amber-400",
  },

  processing: {
    label: "Processing",
    icon: Loader2,
    className:
      "bg-blue-400/10 text-blue-400",
  },

  failed: {
    label: "Failed",
    icon: XCircle,
    className:
      "bg-red-400/10 text-red-400",
  },
};

function formatDate(date: string) {
  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function formatTime(date: string) {
  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-NG", {
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function StatusBadge({
  status,
}: {
  status: PayoutStatus;
}) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5",
        "rounded-lg px-2.5 py-1",
        "text-xs font-medium",
        config.className,
      ].join(" ")}
    >
      <Icon
        className={[
          "h-3.5 w-3.5",
          status === "processing"
            ? "animate-spin"
            : "",
        ].join(" ")}
      />

      {config.label}
    </span>
  );
}

export default function PayoutHistory({
  payouts,
  loading = false,
  error = null,
  onRetry,
  onViewPayout,
  className = "",
}: PayoutHistoryProps) {
  return (
    <section
      className={[
        "w-full overflow-hidden",
        "rounded-2xl border border-white/[0.08]",
        "bg-[#121212]",
        className,
      ].join(" ")}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b border-white/[0.07] px-4 py-4 sm:px-5">
        <div>
          <h2 className="text-base font-semibold text-white">
            Payout history
          </h2>

          <p className="mt-1 text-xs text-white/40">
            Track your Tribe withdrawals
          </p>
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFD84D]/10">
          <ArrowDownToLine className="h-4 w-4 text-[#FFD84D]" />
        </div>
      </div>

      {/* Error */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-400/10">
            <XCircle className="h-5 w-5 text-red-400" />
          </div>

          <p className="mt-3 text-sm font-medium text-white">
            Unable to load payouts
          </p>

          <p className="mt-1 max-w-sm text-xs text-white/40">
            {error}
          </p>

          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 rounded-xl bg-[#FFD84D] px-4 py-2 text-xs font-semibold text-black transition hover:bg-[#FFE066]"
            >
              Try again
            </button>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="divide-y divide-white/[0.05]">
          {Array.from({ length: 4 }).map(
            (_, index) => (
              <div
                key={index}
                className="flex items-center gap-4 px-4 py-4 sm:px-5"
              >
                <div className="h-10 w-10 animate-pulse rounded-xl bg-white/[0.06]" />

                <div className="min-w-0 flex-1">
                  <div className="h-3 w-28 animate-pulse rounded bg-white/[0.07]" />
                  <div className="mt-2 h-2.5 w-40 animate-pulse rounded bg-white/[0.05]" />
                </div>

                <div className="hidden sm:block">
                  <div className="h-3 w-20 animate-pulse rounded bg-white/[0.07]" />
                  <div className="mt-2 h-2.5 w-14 animate-pulse rounded bg-white/[0.05]" />
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* Empty */}
      {!loading &&
        !error &&
        payouts.length === 0 && (
          <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFD84D]/10">
              <ArrowDownToLine className="h-6 w-6 text-[#FFD84D]" />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-white">
              No payouts yet
            </h3>

            <p className="mt-1.5 max-w-sm text-xs leading-5 text-white/40">
              Your withdrawal history will appear here
              after you make your first payout.
            </p>
          </div>
        )}

      {/* Desktop table */}
      {!loading &&
        !error &&
        payouts.length > 0 && (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.05] text-left">
                    <th className="px-5 py-3 text-[11px] font-medium uppercase tracking-wide text-white/30">
                      Payout
                    </th>

                    <th className="px-5 py-3 text-[11px] font-medium uppercase tracking-wide text-white/30">
                      Date
                    </th>

                    <th className="px-5 py-3 text-[11px] font-medium uppercase tracking-wide text-white/30">
                      Account
                    </th>

                    <th className="px-5 py-3 text-[11px] font-medium uppercase tracking-wide text-white/30">
                      Status
                    </th>

                    <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wide text-white/30">
                      Amount
                    </th>

                    {onViewPayout && (
                      <th className="w-12 px-3" />
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/[0.05]">
                  {payouts.map((payout) => (
                    <tr
                      key={payout.id}
                      className="group transition-colors hover:bg-white/[0.025]"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.05]">
                            <ArrowDownToLine className="h-4 w-4 text-[#FFD84D]" />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-white">
                              Withdrawal
                            </p>

                            <p className="mt-0.5 truncate text-xs text-white/30">
                              {payout.reference}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm text-white/70">
                          {formatDate(payout.createdAt)}
                        </p>

                        <p className="mt-0.5 text-xs text-white/30">
                          {formatTime(payout.createdAt)}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        {payout.bankAccount ? (
                          <div>
                            <p className="text-sm text-white/70">
                              {payout.bankAccount.bankName}
                            </p>

                            <p className="mt-0.5 text-xs text-white/30">
                              {payout.bankAccount.accountNumber}
                            </p>
                          </div>
                        ) : (
                          <span className="text-sm text-white/30">
                            —
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge
                          status={payout.status}
                        />
                      </td>

                      <td className="px-5 py-4 text-right">
                        <p className="text-sm font-semibold text-white">
                          {formatCurrency(
                            payout.netAmount ??
                              payout.amount,
                            payout.currency
                          )}
                        </p>

                        {payout.fee ? (
                          <p className="mt-0.5 text-xs text-white/30">
                            Fee{" "}
                            {formatCurrency(
                              payout.fee,
                              payout.currency
                            )}
                          </p>
                        ) : null}
                      </td>

                      {onViewPayout && (
                        <td className="px-3 py-4">
                          <button
                            type="button"
                            onClick={() =>
                              onViewPayout(payout)
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/30 transition hover:bg-white/[0.06] hover:text-white"
                            aria-label={`View payout ${payout.reference}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="divide-y divide-white/[0.05] md:hidden">
              {payouts.map((payout) => (
                <button
                  key={payout.id}
                  type="button"
                  onClick={() =>
                    onViewPayout?.(payout)
                  }
                  disabled={!onViewPayout}
                  className={[
                    "flex w-full items-start gap-3 p-4 text-left",
                    "transition-colors",
                    onViewPayout
                      ? "hover:bg-white/[0.025]"
                      : "",
                  ].join(" ")}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFD84D]/10">
                    <ArrowDownToLine className="h-4 w-4 text-[#FFD84D]" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">
                          Withdrawal
                        </p>

                        <p className="mt-0.5 truncate text-xs text-white/30">
                          {payout.reference}
                        </p>
                      </div>

                      <p className="shrink-0 text-sm font-semibold text-white">
                        {formatCurrency(
                          payout.netAmount ??
                            payout.amount,
                          payout.currency
                        )}
                      </p>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <StatusBadge
                        status={payout.status}
                      />

                      <span className="text-xs text-white/30">
                        {formatDate(payout.createdAt)}
                      </span>

                      {payout.bankAccount && (
                        <span className="text-xs text-white/30">
                          •{" "}
                          {payout.bankAccount.accountNumber}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
    </section>
  );
}