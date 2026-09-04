"use client";

import {
  ArrowDownToLine,
  ArrowUpRight,
  Eye,
  EyeOff,
  History,
  LockKeyhole,
  Plus,
  Wallet,
} from "lucide-react";
import { useState } from "react";

import { formatCurrency } from "@/utils/monetization/formatCurrency";

import type { MonetizationCurrency } from "@/utils/monetization/types/monetization";

interface WalletCardProps {
  availableBalance: number;
  pendingBalance?: number;
  totalEarnings?: number;
  currency?: MonetizationCurrency;

  loading?: boolean;

  onWithdraw?: () => void;
  onViewTransactions?: () => void;
  onAddFunds?: () => void;

  showActions?: boolean;
  className?: string;
}

export default function WalletCard({
  availableBalance,
  pendingBalance = 0,
  totalEarnings = 0,
  currency = "NGN",
  loading = false,
  onWithdraw,
  onViewTransactions,
  onAddFunds,
  showActions = true,
  className = "",
}: WalletCardProps) {
  const [visible, setVisible] = useState(true);

  if (loading) {
    return (
      <section
        className={[
          "relative overflow-hidden rounded-2xl",
          "border border-white/[0.08]",
          "bg-[#121212]",
          "p-5",
          className,
        ].join(" ")}
      >
        <div className="animate-pulse">
          <div className="flex items-center justify-between">
            <div className="h-3 w-24 rounded bg-white/[0.07]" />
            <div className="h-9 w-9 rounded-xl bg-white/[0.06]" />
          </div>

          <div className="mt-5 h-9 w-44 rounded bg-white/[0.07]" />

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="h-16 rounded-xl bg-white/[0.05]" />
            <div className="h-16 rounded-xl bg-white/[0.05]" />
          </div>

          <div className="mt-5 h-11 rounded-xl bg-white/[0.06]" />
        </div>
      </section>
    );
  }

  const formattedAvailable = formatCurrency(
    availableBalance,
    currency
  );

  const formattedPending = formatCurrency(
    pendingBalance,
    currency
  );

  const formattedTotal = formatCurrency(
    totalEarnings,
    currency
  );

  return (
    <section
      className={[
        "relative overflow-hidden rounded-2xl",
        "border border-[#FFD84D]/15",
        "bg-[#121212]",
        className,
      ].join(" ")}
    >
      {/* Tribe glow */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[#FFD84D]/10 blur-3xl" />

      <div className="pointer-events-none absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-[#FFD84D]/[0.04] blur-3xl" />

      <div className="relative p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFD84D]/10">
              <Wallet className="h-5 w-5 text-[#FFD84D]" />
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-white/35">
                Tribe wallet
              </p>

              <p className="mt-1 text-sm font-medium text-white">
                Creator earnings
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setVisible((value) => !value)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white/35 transition hover:bg-white/[0.05] hover:text-white"
            aria-label={
              visible
                ? "Hide wallet balance"
                : "Show wallet balance"
            }
          >
            {visible ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Main balance */}
        <div className="mt-6">
          <div className="flex items-center gap-2">
            <p className="text-xs text-white/35">
              Available balance
            </p>

            <LockKeyhole className="h-3 w-3 text-white/20" />
          </div>

          <p className="mt-1.5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {visible ? formattedAvailable : "••••••"}
          </p>
        </div>

        {/* Secondary balances */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400/10">
                <History className="h-3.5 w-3.5 text-amber-400" />
              </div>

              <span className="text-[10px] font-medium uppercase tracking-wide text-white/30">
                Pending
              </span>
            </div>

            <p className="mt-3 truncate text-sm font-semibold text-white/80">
              {visible
                ? formattedPending
                : "••••••"}
            </p>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-400/10">
                <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
              </div>

              <span className="text-[10px] font-medium uppercase tracking-wide text-white/30">
                Total earned
              </span>
            </div>

            <p className="mt-3 truncate text-sm font-semibold text-white/80">
              {visible
                ? formattedTotal
                : "••••••"}
            </p>
          </div>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={onWithdraw}
              disabled={
                !onWithdraw ||
                availableBalance <= 0
              }
              className={[
                "flex h-11 items-center justify-center gap-2 rounded-xl",
                "text-xs font-semibold",
                "transition-all",
                availableBalance > 0 && onWithdraw
                  ? "bg-[#FFD84D] text-black hover:bg-[#FFE066] active:scale-[0.99]"
                  : "cursor-not-allowed bg-white/[0.06] text-white/25",
              ].join(" ")}
            >
              <ArrowDownToLine className="h-4 w-4" />
              Withdraw
            </button>

            <button
              type="button"
              onClick={onViewTransactions}
              disabled={!onViewTransactions}
              className={[
                "flex h-11 items-center justify-center gap-2 rounded-xl",
                "border border-white/[0.08]",
                "bg-white/[0.025]",
                "text-xs font-semibold text-white/65",
                "transition",
                onViewTransactions
                  ? "hover:border-[#FFD84D]/25 hover:bg-white/[0.04] hover:text-white"
                  : "cursor-not-allowed opacity-40",
              ].join(" ")}
            >
              <History className="h-4 w-4" />
              Transactions
            </button>
          </div>
        )}

        {/* Optional add funds */}
        {onAddFunds && (
          <button
            type="button"
            onClick={onAddFunds}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-[11px] font-semibold text-white/30 transition hover:bg-white/[0.03] hover:text-[#FFD84D]"
          >
            <Plus className="h-3.5 w-3.5" />
            Add funds
          </button>
        )}
      </div>
    </section>
  );
}