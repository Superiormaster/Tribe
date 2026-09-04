"use client";

import {
  BarChart3,
  CircleHelp,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

import { useNavigation } from "@/utils/useNavigation";

import MonetizationHeader from "@/components/monetization/MonetizationHeader";
import EarningsOverview from "@/components/monetization/EarningsOverview";
import RevenueChart from "@/components/monetization/RevenueChart";
import RevenueSources from "@/components/monetization/RevenueSources";
import WalletCard from "@/components/monetization/WalletCard";
import WithdrawCard from "@/components/monetization/WithdrawCard";
import GoalProgress from "@/components/monetization/GoalProgress";
import MonetizationStats from "@/components/monetization/MonetizationStats";
import AudienceRewards from "@/components/monetization/AudienceRewards";
import TopContentCard from "@/components/monetization/TopContentCard";
import TransactionsTable from "@/components/monetization/TransactionsTable";
import PayoutHistory from "@/components/monetization/PayoutHistory";
import QuickActions from "@/components/monetization/QuickActions";
import EmptyState from "@/components/monetization/EmptyState";
import CurrencySelector from "@/components/monetization/CurrencySelector";
import InsightCard from "@/components/monetization/InsightsCard";

import Loading from "@/components/monetization/loading";
import ErrorState from "@/components/monetization/error";

import { useMonetization } from "@/hooks/monetization/useMonetization";
import { useWallet } from "@/hooks/monetization/useWallet";
import { useWithdraw } from "@/hooks/monetization/useWithdraw";
import { useTransactions } from "@/hooks/monetization/useTransactions";
import { useRevenueChart } from "@/hooks/monetization/useRevenueChart";

import type {
  RevenueSource,
} from "@/utils/monetization/types/monetization";

export default function MonetizationPage() {
  const { push, back } = useNavigation();

  const {
    dashboard,
    revenueSources,
    topContent,
    audienceRewards,
    goal,
    insights,
    loading: dashboardLoading,
    error: dashboardError,
    refresh: refreshDashboard,
  } = useMonetization();

  const {
    wallet,
    bankAccounts,
    loading: walletLoading,
    withdrawing: walletWithdrawing,
    error: walletError,
    withdrawalError,
    withdrawFunds,
  } = useWallet();

  const {
    withdrawing,
    success: withdrawalSuccess,
    error: withdrawalSubmitError,
    response: withdrawalResponse,
    submitWithdrawal,
    reset: resetWithdrawal,
  } = useWithdraw();

  const {
    transactions,
    count: transactionCount,
    page: transactionPage,
    pageSize: transactionPageSize,
    loading: transactionsLoading,
    error: transactionsError,
    hasNext,
    hasPrevious,
    nextPage,
    previousPage,
    refresh: refreshTransactions,
  } = useTransactions();

  const {
    data: revenueData,
    period: revenuePeriod,
    metric: revenueMetric,
    loading: revenueLoading,
    error: revenueError,
    setPeriod: setRevenuePeriod,
    setMetric: setRevenueMetric,
    refresh: refreshRevenue,
  } = useRevenueChart();

  const [currency, setCurrency] =
    useState(
      dashboard?.currency ?? "NGN"
    );

  const [withdrawOpen, setWithdrawOpen] =
    useState(false);

  const [helpOpen, setHelpOpen] =
    useState(false);

  const [selectedBankId, setSelectedBankId] =
    useState<string | null>(null);

  const [amount, setAmount] =
    useState("");

  const [selectedRevenueSource, setSelectedRevenueSource] =
    useState<RevenueSource | null>(null);

  const [selectedPayout, setSelectedPayout] =
    useState<any>(null);

  const [payoutDetailsOpen, setPayoutDetailsOpen] =
    useState(false);

  const [goalModalOpen, setGoalModalOpen] =
    useState(false);

  const loading =
    dashboardLoading ||
    walletLoading;

  const error =
    dashboardError ||
    walletError ||
    withdrawalError ||
    transactionsError ||
    revenueError;

  const availableBalance =
    wallet?.availableBalance ??
    dashboard?.availableBalance ??
    0;

  const pendingBalance =
    wallet?.pendingBalance ??
    dashboard?.pendingBalance ??
    0;

  const totalEarnings =
    dashboard?.totalEarnings ?? 0;

  const withdrawnAmount =
    dashboard?.withdrawnAmount ?? 0;

  const currentCurrency =
    currency ||
    dashboard?.currency ||
    "NGN";
  
  const payouts =
    dashboard?.payouts ?? [];

  const refresh = async () => {
    await Promise.allSettled([
      refreshDashboard(),
      refreshTransactions(),
      refreshRevenue(),
    ]);
  };

  const handleWithdraw = () => {
    if (availableBalance <= 0) {
      return;
    }

    setWithdrawOpen(true);
  };

  const closeWithdraw = () => {
    setWithdrawOpen(false);
    setAmount("");
    setSelectedBankId(null);
    resetWithdrawal();
  };

  const handleSubmitWithdrawal = async () => {
    const numericAmount =
      Number(amount);

    if (
      !numericAmount ||
      numericAmount <= 0 ||
      !selectedBankId
    ) {
      return;
    }

    const result =
      await submitWithdrawal({
        amount: numericAmount,
        bankAccountId: selectedBankId,
      });

    if (result) {
      await refresh();
    }
  };

  const handleQuickAction = (
    action: string
  ) => {
    switch (action) {
      case "withdraw":
        handleWithdraw();
        break;

      case "transactions":
        push(
          "/main/monetization/transactions"
        );
        break;

      case "wallet":
        push(
          "/main/monetization/wallet"
        );
        break;

      case "rewards":
        push(
          "/main/monetization/rewards"
        );
        break;

      case "settings":
        push(
          "/main/monetization/settings"
        );
        break;

      default:
        break;
    }
  };

  return (
    <main className="min-h-screen bg-[#0D0D0D] text-white">
      <MonetizationHeader
        title="Tribe Monetization"
        subtitle="Manage your earnings, rewards and creator revenue."
        availableBalance={
          availableBalance
        }
        currency={currentCurrency}
        loading={loading}
        onWithdraw={handleWithdraw}
        onWalletClick={() =>
          push(
            "/main/monetization/wallet"
          )
        }
        onSettings={() =>
          push(
            "/main/monetization/settings"
          )
        }
        onHelp={() =>
          setHelpOpen(true)
        }
      />

      <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8">

        {loading && !dashboard && (
          <Loading />
        )}

        {!loading &&
          !dashboard &&
          error && (
            <ErrorState
              error={error}
              onRetry={refresh}
            />
          )}

        {!loading &&
          dashboard &&
          dashboard.totalEarnings === 0 &&
          transactions.length === 0 &&
          revenueSources.length === 0 && (
            <div className="mb-5">
              <EmptyState
                title="Your monetization dashboard is ready"
                description="Once your Tribe monetization features start generating activity, your earnings, revenue sources and transactions will appear here."
                icon={
                  <BarChart3 className="h-6 w-6 text-[#FFD84D]" />
                }
              />
            </div>
          )}

        {dashboard && (
          <>
            <div className="mb-5 flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400" />

                  <span className="text-[11px] text-white/35">
                    Monetization is active
                  </span>
                </div>

                <button
                  type="button"
                  onClick={refresh}
                  disabled={loading}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-medium text-white/35 transition hover:bg-white/[0.04] hover:text-white disabled:opacity-40"
                >
                  <RefreshCw
                    className={[
                      "h-3 w-3",
                      loading
                        ? "animate-spin"
                        : "",
                    ].join(" ")}
                  />

                  Refresh
                </button>
              </div>

              <QuickActions
                onAction={
                  handleQuickAction
                }
              />
            </div>

            {error && (
              <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-red-400/10 bg-red-400/[0.04] px-4 py-3">
                <div className="flex items-center gap-2">
                  <CircleHelp className="h-4 w-4 shrink-0 text-red-400" />

                  <p className="text-xs text-white/50">
                    {error}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={refresh}
                  className="shrink-0 text-[10px] font-semibold text-red-400 hover:text-red-300"
                >
                  Retry
                </button>
              </div>
            )}

            <div className="mb-5 flex justify-end">
              <CurrencySelector
                value={
                  currentCurrency
                }
                onChange={
                  setCurrency
                }
              />
            </div>

            <EarningsOverview
              totalEarnings={
                totalEarnings
              }
              availableBalance={
                availableBalance
              }
              pendingBalance={
                pendingBalance
              }
              withdrawnAmount={
                withdrawnAmount
              }
              currency={
                currentCurrency
              }
              periodLabel={
                dashboard.periodLabel ??
                "This period"
              }
              previousPeriodEarnings={
                dashboard.previousPeriodEarnings
              }
              completedTransactions={
                dashboard.completedTransactions ??
                transactionCount
              }
              pendingTransactions={
                dashboard.pendingTransactions ??
                0
              }
              loading={
                dashboardLoading
              }
              error={
                dashboardError
              }
              onWithdraw={
                handleWithdraw
              }
              onViewTransactions={() =>
                push(
                  "/monetization/transactions"
                )
              }
            />

            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.85fr)]">
              <RevenueChart
                data={
                  revenueData?.data ??
                  []
                }
                currency={
                  currentCurrency
                }
                period={
                  revenuePeriod
                }
                metric={
                  revenueMetric
                }
                loading={
                  revenueLoading
                }
                error={
                  revenueError
                }
                onPeriodChange={
                  setRevenuePeriod
                }
                onMetricChange={
                  setRevenueMetric
                }
                onRetry={
                  refreshRevenue
                }
              />

              <div className="space-y-5">
                <WalletCard
                  availableBalance={
                    availableBalance
                  }
                  pendingBalance={
                    pendingBalance
                  }
                  totalEarnings={
                    totalEarnings
                  }
                  currency={
                    currentCurrency
                  }
                  loading={
                    walletLoading
                  }
                  onWithdraw={
                    handleWithdraw
                  }
                  onViewTransactions={() =>
                    push(
                      "/monetization/transactions"
                    )
                  }
                />

                {goal && (
                  <GoalProgress
                    goal={goal}
                    loading={
                      dashboardLoading
                    }
                    onCreateGoal={() =>
                      setGoalModalOpen(
                        true
                      )
                    }
                  />
                )}
              </div>
            </div>

            <div className="mt-5">
              <MonetizationStats
                dashboard={
                  dashboard
                }
                loading={
                  dashboardLoading
                }
              />
            </div>

            {insights.length > 0 && (
              <div className="mt-5">
                <div className="mb-3">
                  <h2 className="text-sm font-semibold text-white">
                    Insights
                  </h2>

                  <p className="mt-1 text-xs text-white/35">
                    Understand what's driving
                    your earnings.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {insights.map(
                    (insight: any) => (
                      <InsightCard
                        key={
                          insight.id
                        }
                        insight={
                          insight
                        }
                      />
                    )
                  )}
                </div>
              </div>
            )}

            <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
              <RevenueSources
                sources={
                  revenueSources
                }
                currency={
                  currentCurrency
                }
                loading={
                  dashboardLoading
                }
                error={
                  dashboardError
                }
                onViewSource={(
                  source
                ) => {
                  setSelectedRevenueSource(
                    source
                  );
                }}
              />

              <div>
                {topContent.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
                    {topContent.map(
                      (
                        content: any,
                        index: number
                      ) => (
                        <TopContentCard
                          key={
                            content.id
                          }
                          content={
                            content
                          }
                          rank={
                            index + 1
                          }
                          onClick={(
                            item
                          ) => {
                            push(
                              `/posts/${item.id}`
                            );
                          }}
                        />
                      )
                    )}
                  </div>
                ) : (
                  <EmptyState
                    title="No top content yet"
                    description="Your best-performing monetized content will appear here."
                    icon={
                      <Sparkles className="h-6 w-6 text-[#FFD84D]" />
                    }
                  />
                )}
              </div>
            </div>

            <div className="mt-5">
              <AudienceRewards
                rewards={
                  audienceRewards
                }
                loading={
                  dashboardLoading
                }
                currency={
                  currentCurrency
                }
                onViewAll={() =>
                  push(
                    "/monetization/rewards"
                  )
                }
              />
            </div>

            <div className="mt-5">
              <TransactionsTable
                transactions={
                  transactions
                }
                count={
                  transactionCount
                }
                page={
                  transactionPage
                }
                pageSize={
                  transactionPageSize
                }
                loading={
                  transactionsLoading
                }
                error={
                  transactionsError
                }
                hasNext={
                  hasNext
                }
                hasPrevious={
                  hasPrevious
                }
                onNextPage={
                  nextPage
                }
                onPreviousPage={
                  previousPage
                }
                onRetry={
                  refreshTransactions
                }
                onViewTransaction={(
                  transaction
                ) => {
                  console.log(
                    "Transaction:",
                    transaction
                  );
                }}
              />
            </div>

            <div className="mt-5">
              <PayoutHistory
                payouts={
                  payouts
                }
                loading={
                  dashboardLoading
                }
                error={
                  dashboardError
                }
                onRetry={
                  refreshDashboard
                }
                onViewPayout={(
                  payout
                ) => {
                  setSelectedPayout(
                    payout
                  );

                  setPayoutDetailsOpen(
                    true
                  );
                }}
              />
            </div>

            <div className="mt-5">
              <WithdrawCard
                availableBalance={
                  availableBalance
                }
                currency={
                  currentCurrency
                }
                loading={
                  walletLoading ||
                  withdrawing
                }
                onWithdraw={
                  handleWithdraw
                }
              />
            </div>

            <div className="relative mt-5 overflow-hidden rounded-2xl border border-[#FFD84D]/10 bg-[#FFD84D]/[0.035]">
              <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[#FFD84D]/10 blur-3xl" />

              <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFD84D]/10">
                    <Sparkles className="h-5 w-5 text-[#FFD84D]" />
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      Grow your Tribe
                      earnings
                    </h3>

                    <p className="mt-1 max-w-xl text-xs leading-5 text-white/40">
                      Keep creating engaging
                      content, build your
                      audience and unlock more
                      opportunities to earn.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    push(
                      "/create"
                    )
                  }
                  className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#FFD84D] px-4 text-xs font-semibold text-black transition hover:bg-[#FFE066]"
                >
                  Create content
                </button>
              </div>
            </div>
          </>
        )}

        {helpOpen && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
            onMouseDown={(event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                setHelpOpen(false);
              }
            }}
          >
            <div className="w-full max-w-md rounded-t-2xl border border-white/[0.08] bg-[#151515] p-5 sm:rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFD84D]/10">
                  <CircleHelp className="h-5 w-5 text-[#FFD84D]" />
                </div>

                <div>
                  <h2 className="text-sm font-semibold text-white">
                    Monetization help
                  </h2>

                  <p className="mt-1 text-xs text-white/35">
                    Learn how Tribe creator
                    earnings work.
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3 text-xs leading-5 text-white/45">
                <p>
                  Your monetization dashboard
                  shows earnings, available
                  balance, pending earnings,
                  revenue sources and payouts.
                </p>

                <p>
                  Available earnings can be
                  withdrawn once your payout
                  account meets the requirements.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setHelpOpen(false)
                }
                className="mt-5 h-10 w-full rounded-xl bg-[#FFD84D] text-xs font-semibold text-black"
              >
                Got it
              </button>
            </div>
          </div>
        )}

        {withdrawOpen && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
            onMouseDown={(event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                closeWithdraw();
              }
            }}
          >
            <div className="w-full max-w-lg rounded-t-2xl border border-white/[0.08] bg-[#151515] p-5 sm:rounded-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-white">
                    Withdraw earnings
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-white/40">
                    Withdraw your available
                    Tribe earnings.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    closeWithdraw
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-white/30 hover:bg-white/[0.05] hover:text-white"
                >
                  ×
                </button>
              </div>

              <div className="mt-5 rounded-xl border border-[#FFD84D]/10 bg-[#FFD84D]/[0.035] p-4">
                <p className="text-[10px] uppercase tracking-wide text-white/30">
                  Available
                </p>

                <p className="mt-1 text-2xl font-bold text-white">
                  {new Intl.NumberFormat(
                    "en-NG",
                    {
                      style: "currency",
                      currency:
                        currentCurrency,
                      maximumFractionDigits: 0,
                    }
                  ).format(
                    availableBalance
                  )}
                </p>
              </div>

              <div className="mt-5">
                <label className="text-xs font-medium text-white/50">
                  Amount
                </label>

                <input
                  type="number"
                  min="0"
                  max={
                    availableBalance
                  }
                  value={amount}
                  onChange={(event) =>
                    setAmount(
                      event.target.value
                    )
                  }
                  placeholder="Enter amount"
                  className="mt-2 h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-[#FFD84D]/30"
                />
              </div>

              <div className="mt-4">
                <label className="text-xs font-medium text-white/50">
                  Payout account
                </label>

                <select
                  value={
                    selectedBankId ??
                    ""
                  }
                  onChange={(event) =>
                    setSelectedBankId(
                      event.target
                        .value || null
                    )
                  }
                  className="mt-2 h-11 w-full rounded-xl border border-white/[0.08] bg-[#1A1A1A] px-3 text-sm text-white outline-none focus:border-[#FFD84D]/30"
                >
                  <option value="">
                    Select payout account
                  </option>

                  {bankAccounts?.map(
                    (
                      account: any
                    ) => (
                      <option
                        key={
                          account.id
                        }
                        value={
                          account.id
                        }
                      >
                        {account.bankName ??
                          account.bank_name ??
                          "Bank"}{" "}
                        ••••
                        {account.last4 ??
                          account.accountNumber?.slice(
                            -4
                          )}
                      </option>
                    )
                  )}
                </select>
              </div>

              {(withdrawalSubmitError ||
                withdrawalResponse?.message) && (
                <p className="mt-3 text-xs text-red-400">
                  {withdrawalSubmitError ??
                    withdrawalResponse?.message}
                </p>
              )}

              {withdrawalSuccess && (
                <p className="mt-3 text-xs text-emerald-400">
                  Withdrawal submitted
                  successfully.
                </p>
              )}

              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={
                    closeWithdraw
                  }
                  className="h-11 flex-1 rounded-xl border border-white/[0.08] bg-white/[0.025] text-xs font-semibold text-white/60"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={
                    withdrawing ||
                    walletWithdrawing ||
                    !Number(amount) ||
                    !selectedBankId
                  }
                  onClick={
                    handleSubmitWithdrawal
                  }
                  className="h-11 flex-1 rounded-xl bg-[#FFD84D] text-xs font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {withdrawing ||
                  walletWithdrawing
                    ? "Processing..."
                    : "Withdraw"}
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedRevenueSource && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
            onMouseDown={(event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                setSelectedRevenueSource(
                  null
                );
              }
            }}
          >
            <div className="w-full max-w-md rounded-t-2xl border border-white/[0.08] bg-[#151515] p-5 sm:rounded-2xl">
              <h2 className="text-base font-semibold text-white">
                {selectedRevenueSource.name}
              </h2>

              <p className="mt-2 text-xs leading-5 text-white/40">
                Revenue source details and
                performance will appear here.
              </p>

              <button
                type="button"
                onClick={() =>
                  setSelectedRevenueSource(
                    null
                  )
                }
                className="mt-5 h-10 w-full rounded-xl bg-[#FFD84D] text-xs font-semibold text-black"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {payoutDetailsOpen &&
          selectedPayout && (
            <div
              className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
              onMouseDown={(
                event
              ) => {
                if (
                  event.target ===
                  event.currentTarget
                ) {
                  setPayoutDetailsOpen(
                    false
                  );
                }
              }}
            >
              <div className="w-full max-w-md rounded-t-2xl border border-white/[0.08] bg-[#151515] p-5 sm:rounded-2xl">
                <h2 className="text-base font-semibold text-white">
                  Payout details
                </h2>

                <pre className="mt-4 max-h-64 overflow-auto rounded-xl bg-black/30 p-3 text-[10px] text-white/40">
                  {JSON.stringify(
                    selectedPayout,
                    null,
                    2
                  )}
                </pre>

                <button
                  type="button"
                  onClick={() =>
                    setPayoutDetailsOpen(
                      false
                    )
                  }
                  className="mt-5 h-10 w-full rounded-xl bg-[#FFD84D] text-xs font-semibold text-black"
                >
                  Close
                </button>
              </div>
            </div>
          )}

        {goalModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                setGoalModalOpen(false);
              }
            }}
          >
            <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#151515] p-5">
              <h2 className="text-base font-semibold text-white">
                Create earnings goal
              </h2>

              <p className="mt-2 text-xs leading-5 text-white/40">
                Set a target for your Tribe
                monetization earnings.
              </p>

              <button
                type="button"
                onClick={() =>
                  setGoalModalOpen(false)
                }
                className="mt-5 h-10 w-full rounded-xl bg-[#FFD84D] text-xs font-semibold text-black"
              >
                Close
              </button>
            </div>
          </div>
        )}

        <div className="h-8" />
      </div>
    </main>
  );
}