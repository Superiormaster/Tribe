"use client";

import {
  ArrowDown,
  ArrowUp,
  CircleDollarSign,
  Clock3,
  Wallet,
} from "lucide-react";

import { formatCurrency } from "@/utils/monetization/formatCurrency";

import type { MonetizationDashboard } from "@/utils/monetization/types/monetization";

interface MonetizationStatsProps {
  dashboard: MonetizationDashboard | null;
  loading?: boolean;
  className?: string;
}

interface StatCardProps {
  label: string;
  value: string;
  description?: string;
  growth?: number;
  icon: React.ReactNode;
  highlight?: boolean;
}

function StatCard({
  label,
  value,
  description,
  growth,
  icon,
  highlight = false,
}: StatCardProps) {
  const hasGrowth =
    growth !== undefined &&
    Number.isFinite(growth);

  const positive = hasGrowth && growth > 0;
  const negative = hasGrowth && growth < 0;

  return (
    <div
      className={[
        "relative overflow-hidden rounded-2xl",
        "border border-white/[0.08]",
        highlight
          ? "bg-[#FFD84D]/[0.08]"
          : "bg-[#121212]",
        "p-4 sm:p-5",
        "transition-all duration-200",
        "hover:border-[#FFD84D]/25",
      ].join(" ")}
    >
      {highlight && (
        <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#FFD84D]/10 blur-2xl" />
      )}

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-white/40">
              {label}
            </p>

            <p className="mt-2 text-xl font-bold tracking-tight text-white sm:text-2xl">
              {value}
            </p>
          </div>

          <div
            className={[
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              highlight
                ? "bg-[#FFD84D]/15 text-[#FFD84D]"
                : "bg-white/[0.05] text-[#FFD84D]",
            ].join(" ")}
          >
            {icon}
          </div>
        </div>

        <div className="mt-4 flex min-h-5 items-center gap-2">
          {hasGrowth ? (
            <span
              className={[
                "inline-flex items-center gap-1 rounded-md px-1.5 py-1",
                "text-[11px] font-semibold",
                positive
                  ? "bg-emerald-400/10 text-emerald-400"
                  : negative
                    ? "bg-red-400/10 text-red-400"
                    : "bg-white/[0.06] text-white/40",
              ].join(" ")}
            >
              {positive ? (
                <ArrowUp className="h-3 w-3" />
              ) : negative ? (
                <ArrowDown className="h-3 w-3" />
              ) : null}

              {Math.abs(growth).toFixed(1)}%
            </span>
          ) : null}

          {description && (
            <span className="truncate text-xs text-white/30">
              {description}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#121212] p-4 sm:p-5">
      <div className="animate-pulse">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="h-3 w-24 rounded bg-white/[0.07]" />
            <div className="mt-3 h-7 w-32 rounded bg-white/[0.07]" />
          </div>

          <div className="h-10 w-10 rounded-xl bg-white/[0.06]" />
        </div>

        <div className="mt-5 h-3 w-28 rounded bg-white/[0.05]" />
      </div>
    </div>
  );
}

export default function MonetizationStats({
  dashboard,
  loading = false,
  className = "",
}: MonetizationStatsProps) {
  if (loading) {
    return (
      <section
        className={[
          "grid grid-cols-1 gap-3",
          "sm:grid-cols-2",
          "xl:grid-cols-4",
          className,
        ].join(" ")}
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <StatSkeleton key={index} />
        ))}
      </section>
    );
  }

  if (!dashboard) {
    return null;
  }

  return (
    <section
      className={[
        "grid grid-cols-1 gap-3",
        "sm:grid-cols-2",
        "xl:grid-cols-4",
        className,
      ].join(" ")}
    >
      <StatCard
        label="Total earnings"
        value={formatCurrency(
          dashboard.totalEarnings,
          dashboard.currency
        )}
        description="All-time monetization"
        icon={
          <CircleDollarSign className="h-5 w-5" />
        }
        highlight
      />

      <StatCard
        label="Available balance"
        value={formatCurrency(
          dashboard.availableBalance,
          dashboard.currency
        )}
        description="Available to withdraw"
        icon={<Wallet className="h-5 w-5" />}
      />

      <StatCard
        label="Pending balance"
        value={formatCurrency(
          dashboard.pendingBalance,
          dashboard.currency
        )}
        description="Currently processing"
        icon={<Clock3 className="h-5 w-5" />}
      />

      <StatCard
        label="Lifetime earnings"
        value={formatCurrency(
          dashboard.lifetimeEarnings,
          dashboard.currency
        )}
        description="Since joining Tribe"
        icon={
          <CircleDollarSign className="h-5 w-5" />
        }
      />
    </section>
  );
}