"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Coins,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { formatCurrency, CurrencyCode } from "@/utils/monetization/formatCurrency";

interface EarningsOverviewProps {
  totalEarnings: number;
  availableBalance: number;
  pendingBalance?: number;
  withdrawnAmount?: number;

  currency?: CurrencyCode;

  periodLabel?: string;
  previousPeriodEarnings?: number;

  completedTransactions?: number;
  pendingTransactions?: number;

  loading?: boolean;
  error?: string | null;

  onViewTransactions?: () => void;
  onWithdraw?: () => void;

  className?: string;
}

function formatPercentage(value: number) {
  if (!Number.isFinite(value)) {
    return "0.0%";
  }

  return `${Math.abs(value).toFixed(1)}%`;
}

function StatSkeleton() {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
      <div className="h-8 w-8 animate-pulse rounded-lg bg-white/[0.06]" />

      <div className="mt-4 h-2.5 w-20 animate-pulse rounded bg-white/[0.06]" />

      <div className="mt-2 h-5 w-28 animate-pulse rounded bg-white/[0.07]" />
    </div>
  );
}

export default function EarningsOverview({
  totalEarnings,
  availableBalance,
  pendingBalance = 0,
  withdrawnAmount = 0,
  currency = "NGN",
  periodLabel = "This period",
  previousPeriodEarnings,
  completedTransactions = 0,
  pendingTransactions = 0,
  loading = false,
  error = null,
  onViewTransactions,
  onWithdraw,
  className = "",
}: EarningsOverviewProps) {
  const hasPreviousPeriod =
    previousPeriodEarnings !==
      undefined &&
    previousPeriodEarnings !== null;

  const earningsChange =
    hasPreviousPeriod &&
    previousPeriodEarnings !== 0
      ? ((totalEarnings -
          previousPeriodEarnings) /
          Math.abs(
            previousPeriodEarnings
          )) *
        100
      : hasPreviousPeriod &&
          totalEarnings > 0
        ? 100
        : 0;

  const earningsGrowing =
    earningsChange >= 0;

  const totalFlow =
    availableBalance +
    pendingBalance +
    withdrawnAmount;

  const availablePercentage =
    totalFlow > 0
      ? (availableBalance / totalFlow) * 100
      : 0;

  const pendingPercentage =
    totalFlow > 0
      ? (pendingBalance / totalFlow) * 100
      : 0;

  if (loading) {
    return (
      <section
        className={[
          "w-full overflow-hidden rounded-2xl",
          "border border-white/[0.08]",
          "bg-[#121212]",
          className,
        ].join(" ")}
      >
        <div className="border-b border-white/[0.07] p-4 sm:p-5">
          <div className="h-4 w-36 animate-pulse rounded bg-white/[0.07]" />

          <div className="mt-2 h-3 w-48 animate-pulse rounded bg-white/[0.05]" />
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
          {Array.from({ length: 4 }).map(
            (_, index) => (
              <StatSkeleton key={index} />
            )
          )}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section
        className={[
          "w-full overflow-hidden rounded-2xl",
          "border border-white/[0.08]",
          "bg-[#121212]",
          className,
        ].join(" ")}
      >
        <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-400/10">
            <TrendingDown className="h-5 w-5 text-red-400" />
          </div>

          <h3 className="mt-4 text-sm font-semibold text-white">
            Unable to load earnings
          </h3>

          <p className="mt-1.5 max-w-sm text-xs leading-5 text-white/40">
            {error}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      className={[
        "relative w-full overflow-hidden rounded-2xl",
        "border border-white/[0.08]",
        "bg-[#121212]",
        className,
      ].join(" ")}
    >
      {/* Tribe glow */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-[#FFD84D]/[0.07] blur-3xl" />

      <div className="relative">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-white/[0.07] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFD84D]/10">
                <Coins className="h-4 w-4 text-[#FFD84D]" />
              </div>

              <div>
                <h2 className="text-base font-semibold text-white">
                  Earnings overview
                </h2>

                <p className="mt-1 text-xs text-white/40">
                  Track your Tribe monetization performance
                </p>
              </div>
            </div>
          </div>

          <div className="flex w-fit items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2">
            <CalendarDays className="h-3.5 w-3.5 text-white/30" />

            <span className="text-xs font-medium text-white/50">
              {periodLabel}
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {/* Main earnings */}
          <div className="rounded-2xl border border-[#FFD84D]/10 bg-[#FFD84D]/[0.035] p-4 sm:p-5">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs text-white/40">
                  Total earnings
                </p>

                <div className="mt-1.5 flex flex-wrap items-center gap-3">
                  <p className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                    {formatCurrency(
                      totalEarnings,
                      currency
                    )}
                  </p>

                  {hasPreviousPeriod && (
                    <span
                      className={[
                        "inline-flex items-center gap-1 rounded-lg px-2 py-1",
                        "text-[10px] font-semibold",
                        earningsGrowing
                          ? "bg-emerald-400/10 text-emerald-400"
                          : "bg-red-400/10 text-red-400",
                      ].join(" ")}
                    >
                      {earningsGrowing ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3" />
                      )}

                      {formatPercentage(
                        earningsChange
                      )}
                    </span>
                  )}
                </div>

                {hasPreviousPeriod && (
                  <p className="mt-2 text-[11px] text-white/30">
                    Compared with{" "}
                    {formatCurrency(
                      previousPeriodEarnings ?? 0,
                      currency
                    )}{" "}
                    in the previous period
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-white/30">
                <TrendingUp className="h-4 w-4 text-[#FFD84D]" />
                <span>
                  {earningsGrowing
                    ? "Earnings are growing"
                    : "Earnings are down"}
                </span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Available */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/10">
                  <Wallet className="h-4 w-4 text-emerald-400" />
                </div>

                <span className="text-[10px] font-medium text-white/25">
                  {availablePercentage.toFixed(
                    0
                  )}
                  %
                </span>
              </div>

              <p className="mt-4 text-[10px] font-medium uppercase tracking-wide text-white/30">
                Available
              </p>

              <p className="mt-1 text-base font-semibold text-white">
                {formatCurrency(
                  availableBalance,
                  currency
                )}
              </p>
            </div>

            {/* Pending */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/10">
                  <Clock3 className="h-4 w-4 text-amber-400" />
                </div>

                <span className="text-[10px] font-medium text-white/25">
                  {pendingPercentage.toFixed(
                    0
                  )}
                  %
                </span>
              </div>

              <p className="mt-4 text-[10px] font-medium uppercase tracking-wide text-white/30">
                Pending
              </p>

              <p className="mt-1 text-base font-semibold text-white">
                {formatCurrency(
                  pendingBalance,
                  currency
                )}
              </p>
            </div>

            {/* Withdrawn */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-400/10">
                  <ArrowUpRight className="h-4 w-4 text-blue-400" />
                </div>
              </div>

              <p className="mt-4 text-[10px] font-medium uppercase tracking-wide text-white/30">
                Withdrawn
              </p>

              <p className="mt-1 text-base font-semibold text-white">
                {formatCurrency(
                  withdrawnAmount,
                  currency
                )}
              </p>
            </div>

            {/* Transactions */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFD84D]/10">
                  <CheckCircle2 className="h-4 w-4 text-[#FFD84D]" />
                </div>
              </div>

              <p className="mt-4 text-[10px] font-medium uppercase tracking-wide text-white/30">
                Transactions
              </p>

              <p className="mt-1 text-base font-semibold text-white">
                {completedTransactions}
              </p>

              {pendingTransactions > 0 && (
                <p className="mt-1 text-[10px] text-amber-400">
                  {pendingTransactions} pending
                </p>
              )}
            </div>
          </div>

          {/* Balance distribution */}
          {totalFlow > 0 && (
            <div className="mt-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium text-white/50">
                  Earnings distribution
                </p>

                <p className="text-[10px] text-white/25">
                  Available + pending + withdrawn
                </p>
              </div>

              <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-white/[0.05]">
                {availablePercentage >
                  0 && (
                  <div
                    className="bg-emerald-400 transition-all"
                    style={{
                      width: `${availablePercentage}%`,
                    }}
                  />
                )}

                {pendingPercentage >
                  0 && (
                  <div
                    className="bg-amber-400 transition-all"
                    style={{
                      width: `${pendingPercentage}%`,
                    }}
                  />
                )}

                {withdrawnAmount >
                  0 && (
                  <div
                    className="bg-white/20 transition-all"
                    style={{
                      width: `${Math.max(
                        0,
                        100 -
                          availablePercentage -
                          pendingPercentage
                      )}%`,
                    }}
                  />
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[10px] text-white/35">
                    Available
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  <span className="text-[10px] text-white/35">
                    Pending
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
                  <span className="text-[10px] text-white/35">
                    Withdrawn
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          {(onWithdraw ||
            onViewTransactions) && (
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              {onWithdraw && (
                <button
                  type="button"
                  onClick={onWithdraw}
                  disabled={
                    availableBalance <= 0
                  }
                  className={[
                    "flex h-10 flex-1 items-center justify-center gap-2 rounded-xl",
                    "text-xs font-semibold transition",
                    availableBalance > 0
                      ? "bg-[#FFD84D] text-black hover:bg-[#FFE066]"
                      : "cursor-not-allowed bg-white/[0.06] text-white/25",
                  ].join(" ")}
                >
                  <ArrowUpRight className="h-4 w-4" />
                  Withdraw earnings
                </button>
              )}

              {onViewTransactions && (
                <button
                  type="button"
                  onClick={
                    onViewTransactions
                  }
                  className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] text-xs font-semibold text-white/60 transition hover:border-[#FFD84D]/25 hover:text-white"
                >
                  <Wallet className="h-4 w-4" />
                  View transactions
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}