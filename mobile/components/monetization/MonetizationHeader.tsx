"use client";

import {
  ArrowDownToLine,
  BarChart3,
  ChevronLeft,
  CircleHelp,
  Coins,
  Settings,
  Sparkles,
  Wallet,
} from "lucide-react";

interface MonetizationHeaderProps {
  title?: string;
  subtitle?: string;

  availableBalance?: number;
  currency?: string;

  showBackButton?: boolean;
  showWallet?: boolean;
  showSettings?: boolean;
  showHelp?: boolean;

  onBack?: () => void;
  onWithdraw?: () => void;
  onWalletClick?: () => void;
  onSettings?: () => void;
  onHelp?: () => void;

  loading?: boolean;
  className?: string;
}

function formatBalance(
  amount: number,
  currency: string
) {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

export default function MonetizationHeader({
  title = "Monetization",
  subtitle = "Manage your earnings, rewards and creator revenue.",
  availableBalance = 0,
  currency = "NGN",
  showBackButton = false,
  showWallet = true,
  showSettings = true,
  showHelp = true,
  onBack,
  onWithdraw,
  onWalletClick,
  onSettings,
  onHelp,
  loading = false,
  className = "",
}: MonetizationHeaderProps) {
  return (
    <header
      className={[
        "relative overflow-hidden",
        "border-b border-white/[0.07]",
        "bg-gray-200 dark:bg-gray-900",
        className,
      ].join(" ")}
    >
      {/* Tribe ambient glow */}
      <div className="pointer-events-none absolute -right-24 -top-28 h-64 w-64 rounded-full bg-[#FFD84D]/[0.07] blur-3xl" />

      <div className="pointer-events-none absolute -left-20 bottom-[-100px] h-48 w-48 rounded-full bg-[#FFD84D]/[0.025] blur-3xl" />

      <div className="relative mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          {/* Left */}
          <div className="flex min-w-0 items-start gap-3">
            {showBackButton && (
              <button
                type="button"
                onClick={onBack}
                aria-label="Go back"
                className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-gray-700 dark:text-white/45 transition hover:border-white/[0.12] hover:bg-white/[0.05] hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFD84D]/10">
              <Coins className="h-5 w-5 text-[#FFD84D]" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-gray-800 dark:text-white sm:text-2xl">
                  {title}
                </h1>

                <span className="inline-flex items-center gap-1 rounded-full border border-[#FFD84D]/15 bg-[#FFD84D]/[0.06] px-2 py-1 text-[9px] font-semibold text-[#FFD84D]">
                  <Sparkles className="h-3 w-3" />
                  Creator
                </span>
              </div>

              <p className="mt-1.5 max-w-xl text-xs leading-5 text-gray-600 dark:text-white/40 sm:text-sm">
                {subtitle}
              </p>
            </div>
          </div>

          {/* Right */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Wallet balance */}
            {showWallet && (
              <button
                type="button"
                onClick={onWalletClick}
                className={[
                  "group flex min-h-11 items-center gap-2.5 rounded-xl",
                  "border border-indigo-500 dark:border-white/[0.08]",
                  "bg-white/[0.025]",
                  "px-3",
                  "text-left transition",
                  onWalletClick
                    ? "hover:border-[#FFD84D]/20 hover:bg-white/[0.04]"
                    : "cursor-default",
                ].join(" ")}
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 dark:bg-[#FFD84D]/10">
                  <Wallet className="h-3.5 w-3.5 text-[#FFD84D]" />
                </div>

                <div>
                  <p className="text-[9px] font-medium uppercase tracking-wide text-gray-600 dark:text-white/25">
                    Available
                  </p>

                  {loading ? (
                    <div className="mt-1 h-3 w-20 animate-pulse rounded bg-white/[0.08]" />
                  ) : (
                    <p className="mt-0.5 text-xs font-semibold text-gray-500 dark:text-white">
                      {formatBalance(
                        availableBalance,
                        currency
                      )}
                    </p>
                  )}
                </div>
              </button>
            )}

            {/* Withdraw */}
            {onWithdraw && (
              <button
                type="button"
                onClick={onWithdraw}
                disabled={
                  loading ||
                  availableBalance <= 0
                }
                className={[
                  "flex h-11 items-center justify-center gap-2 rounded-xl px-4",
                  "text-xs font-semibold transition-all",
                  availableBalance > 0 &&
                  !loading
                    ? "bg-[#FFD84D] text-black dark:hover:bg-[#FFE066] active:scale-[0.99]"
                    : "cursor-not-allowed bg-indigo-600/10 dark:bg-white/[0.06] text-gray-600 dark:text-white/25",
                ].join(" ")}
              >
                <ArrowDownToLine className="h-4 w-4" />
                <span className="hidden sm:inline">
                  Withdraw
                </span>
              </button>
            )}

            {/* Analytics */}
            <button
              type="button"
              onClick={onWalletClick}
              aria-label="View earnings analytics"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-500 dark:border-white/[0.08] bg-white/[0.025] text-gray-600 dark:text-white/40 transition dark:hover:border-white/[0.12] dark:hover:bg-white/[0.05] dark:hover:text-white"
            >
              <BarChart3 className="h-4 w-4" />
            </button>

            {/* Help */}
            {showHelp && (
              <button
                type="button"
                onClick={onHelp}
                aria-label="Monetization help"
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-500 dark:border-white/[0.08] bg-white/[0.025] text-gray-600 dark:text-white/40 transition dark:hover:border-white/[0.12] dark:hover:bg-white/[0.05] dark:hover:text-white"
              >
                <CircleHelp className="h-4 w-4" />
              </button>
            )}

            {/* Settings */}
            {showSettings && (
              <button
                type="button"
                onClick={onSettings}
                aria-label="Monetization settings"
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-600 dark:border-white/[0.08] bg-white/[0.025] text-gray-600 dark:text-white/40 transition dark:hover:border-white/[0.12] dark:hover:bg-white/[0.05] dark:hover:text-white"
              >
                <Settings className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile quick status */}
        <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-0.5 lg:hidden">
          <div className="flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600/10 dark:bg-white/[0.025] px-2.5 py-1.5">
            <Wallet className="h-3 w-3 text-yellow-500 dark:text-[#FFD84D]" />
            <span className="text-[10px] text-gray-500 dark:text-white/40">
              Wallet
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600/10 dark:bg-white/[0.025] px-2.5 py-1.5">
            <BarChart3 className="h-3 w-3 text-gray-500 dark:text-white/35" />
            <span className="text-[10px] text-gray-600 dark:text-white/40">
              Analytics
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 dark:bg-[#FFD84D]/[0.06] px-2.5 py-1.5">
            <Coins className="h-3 w-3 text-yellow-500 text-[#FFD84D]" />
            <span className="text-[10px] text-[#FFD84D]/80">
              Monetized
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}