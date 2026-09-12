"use client";

import {
  ArrowDownLeft,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  Loader2,
  MoreHorizontal,
  Search,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";

import { formatCurrency } from "@/utils/monetization/formatCurrency";

import type {
  Transaction,
  TransactionStatus,
  TransactionType,
} from "@/utils/monetization/types/monetization";

interface TransactionsTableProps {
  transactions: Transaction[];
  count?: number;
  page?: number;
  pageSize?: number;

  loading?: boolean;
  error?: string | null;

  hasNext?: boolean;
  hasPrevious?: boolean;

  onNextPage?: () => void;
  onPreviousPage?: () => void;
  onRetry?: () => void;

  onViewTransaction?: (
    transaction: Transaction
  ) => void;

  className?: string;
}

const STATUS_CONFIG: Record<
  TransactionStatus,
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

  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    className:
      "bg-white/[0.06] text-white/40",
  },
};

const TYPE_CONFIG: Record<
  TransactionType,
  {
    label: string;
    icon: typeof ArrowDownLeft;
  }
> = {
  earning: {
    label: "Earning",
    icon: ArrowDownLeft,
  },

  withdrawal: {
    label: "Withdrawal",
    icon: ArrowUpRight,
  },

  refund: {
    label: "Refund",
    icon: ArrowDownLeft,
  },

  adjustment: {
    label: "Adjustment",
    icon: ArrowDownRight,
  },

  bonus: {
    label: "Bonus",
    icon: ArrowDownLeft,
  },
};

function formatDate(date?: string | null) {
  if (!date) return "—";

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

function formatTime(date?: string | null) {
  if (!date) return "";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-NG", {
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function getTransactionStatus(
  status: TransactionStatus
) {
  return (
    STATUS_CONFIG[status] ??
    STATUS_CONFIG.pending
  );
}

function getTransactionType(
  type: TransactionType
) {
  return (
    TYPE_CONFIG[type] ??
    TYPE_CONFIG.earning
  );
}

function StatusBadge({
  status,
}: {
  status: TransactionStatus;
}) {
  const config = getTransactionStatus(status);
  const Icon = config.icon;

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5",
        "rounded-lg px-2.5 py-1",
        "text-[11px] font-medium",
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

function TypeIcon({
  type,
}: {
  type: TransactionType;
}) {
  const config = getTransactionType(type);
  const Icon = config.icon;

  const outgoing = type === "withdrawal";

  return (
    <div
      className={[
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
        outgoing
          ? "bg-white/[0.05] text-white/50"
          : "bg-[#FFD84D]/10 text-[#FFD84D]",
      ].join(" ")}
    >
      <Icon className="h-4 w-4" />
    </div>
  );
}

function TransactionSkeleton() {
  return (
    <div className="flex items-center gap-4 px-5 py-4">
      <div className="h-9 w-9 animate-pulse rounded-xl bg-white/[0.06]" />

      <div className="min-w-0 flex-1">
        <div className="h-3 w-28 animate-pulse rounded bg-white/[0.07]" />
        <div className="mt-2 h-2.5 w-40 animate-pulse rounded bg-white/[0.05]" />
      </div>

      <div className="hidden h-3 w-20 animate-pulse rounded bg-white/[0.06] md:block" />

      <div className="h-3 w-20 animate-pulse rounded bg-white/[0.07]" />
    </div>
  );
}

export default function TransactionsTable({
  transactions,
  count = 0,
  page = 1,
  pageSize = 10,
  loading = false,
  error = null,
  hasNext = false,
  hasPrevious = false,
  onNextPage,
  onPreviousPage,
  onRetry,
  onViewTransaction,
  className = "",
}: TransactionsTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<"all" | TransactionStatus>("all");

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return transactions.filter((transaction) => {
      const matchesSearch =
        !query ||
        transaction.reference
          ?.toLowerCase()
          .includes(query) ||
        transaction.description
          ?.toLowerCase()
          .includes(query) ||
        transaction.type
          ?.toLowerCase()
          .includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        transaction.status === statusFilter;

      return (
        matchesSearch &&
        matchesStatus
      );
    });
  }, [
    transactions,
    search,
    statusFilter,
  ]);

  const start =
    count === 0
      ? 0
      : (page - 1) * pageSize + 1;

  const end = Math.min(
    page * pageSize,
    count
  );

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
      <div className="border-b border-white/[0.07] px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">
              Transactions
            </h2>

            <p className="mt-1 text-xs text-white/40">
              Your Tribe earnings, rewards and payouts
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search transactions"
                className={[
                  "h-9 w-full rounded-xl",
                  "border border-white/[0.08]",
                  "bg-white/[0.03]",
                  "pl-9 pr-3",
                  "text-xs text-white",
                  "placeholder:text-white/25",
                  "outline-none",
                  "transition",
                  "focus:border-[#FFD84D]/30",
                  "focus:ring-2 focus:ring-[#FFD84D]/10",
                  "sm:w-52",
                ].join(" ")}
              />
            </div>

            <div className="relative">
              <Filter className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as
                      | "all"
                      | TransactionStatus
                  )
                }
                className={[
                  "h-9 w-full appearance-none rounded-xl",
                  "border border-white/[0.08]",
                  "bg-[#121212]",
                  "pl-9 pr-8",
                  "text-xs text-white/70",
                  "outline-none",
                  "focus:border-[#FFD84D]/30",
                  "sm:w-36",
                ].join(" ")}
              >
                <option value="all">
                  All statuses
                </option>
                <option value="completed">
                  Completed
                </option>
                <option value="pending">
                  Pending
                </option>
                <option value="processing">
                  Processing
                </option>
                <option value="failed">
                  Failed
                </option>
                <option value="cancelled">
                  Cancelled
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-400/10">
            <XCircle className="h-5 w-5 text-red-400" />
          </div>

          <h3 className="mt-4 text-sm font-semibold text-white">
            Unable to load transactions
          </h3>

          <p className="mt-1.5 max-w-sm text-xs leading-5 text-white/40">
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
          {Array.from({ length: 6 }).map(
            (_, index) => (
              <TransactionSkeleton
                key={index}
              />
            )
          )}
        </div>
      )}

      {/* Empty */}
      {!loading &&
        !error &&
        filteredTransactions.length === 0 && (
          <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFD84D]/10">
              <ArrowDownLeft className="h-6 w-6 text-[#FFD84D]" />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-white">
              {search || statusFilter !== "all"
                ? "No matching transactions"
                : "No transactions yet"}
            </h3>

            <p className="mt-1.5 max-w-sm text-xs leading-5 text-white/40">
              {search ||
              statusFilter !== "all"
                ? "Try changing your search or filter."
                : "Your Tribe earnings, rewards and payouts will appear here."}
            </p>
          </div>
        )}

      {/* Desktop */}
      {!loading &&
        !error &&
        filteredTransactions.length > 0 && (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.05] text-left">
                    <th className="px-5 py-3 text-[10px] font-medium uppercase tracking-wider text-white/30">
                      Transaction
                    </th>

                    <th className="px-5 py-3 text-[10px] font-medium uppercase tracking-wider text-white/30">
                      Date
                    </th>

                    <th className="px-5 py-3 text-[10px] font-medium uppercase tracking-wider text-white/30">
                      Type
                    </th>

                    <th className="px-5 py-3 text-[10px] font-medium uppercase tracking-wider text-white/30">
                      Status
                    </th>

                    <th className="px-5 py-3 text-right text-[10px] font-medium uppercase tracking-wider text-white/30">
                      Amount
                    </th>

                    {onViewTransaction && (
                      <th className="w-12 px-3" />
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/[0.05]">
                  {filteredTransactions.map(
                    (transaction) => {
                      const typeConfig =
                        getTransactionType(
                          transaction.type
                        );

                      const incoming =
                        transaction.type !== "withdrawal";

                      return (
                        <tr
                          key={transaction.id}
                          className={[
                            "group transition-colors",
                            onViewTransaction
                              ? "cursor-pointer hover:bg-white/[0.025]"
                              : "",
                          ].join(" ")}
                          onClick={() =>
                            onViewTransaction?.(
                              transaction
                            )
                          }
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <TypeIcon
                                type={
                                  transaction.type
                                }
                              />

                              <div className="min-w-0">
                                <p className="max-w-[280px] truncate text-sm font-medium text-white">
                                  {transaction.description ||
                                    typeConfig.label}
                                </p>

                                <p className="mt-0.5 max-w-[280px] truncate text-[11px] text-white/30">
                                  {transaction.reference}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-sm text-white/65">
                              {formatDate(
                                transaction.createdAt
                              )}
                            </p>

                            <p className="mt-0.5 text-[11px] text-white/25">
                              {formatTime(
                                transaction.createdAt
                              )}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <span className="text-xs text-white/50">
                              {typeConfig.label}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <StatusBadge
                              status={
                                transaction.status
                              }
                            />
                          </td>

                          <td className="px-5 py-4 text-right">
                            <p
                              className={[
                                "text-sm font-semibold",
                                incoming
                                  ? "text-emerald-400"
                                  : "text-white",
                              ].join(" ")}
                            >
                              {incoming
                                ? "+"
                                : "-"}
                              {formatCurrency(
                                Math.abs(
                                  Number(
                                    transaction.amount
                                  )
                                ),
                                transaction.currency
                              )}
                            </p>

                            {transaction.fee ? (
                              <p className="mt-0.5 text-[10px] text-white/25">
                                Fee{" "}
                                {formatCurrency(
                                  transaction.fee,
                                  transaction.currency
                                )}
                              </p>
                            ) : null}
                          </td>

                          {onViewTransaction && (
                            <td className="px-3 py-4">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();

                                  onViewTransaction(
                                    transaction
                                  );
                                }}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/25 transition hover:bg-white/[0.06] hover:text-white"
                                aria-label="View transaction"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="divide-y divide-white/[0.05] md:hidden">
              {filteredTransactions.map(
                (transaction) => {
                  const typeConfig =
                    getTransactionType(
                      transaction.type
                    );

                  const incoming =
                    transaction.type !== "withdrawal";

                  return (
                    <button
                      key={transaction.id}
                      type="button"
                      disabled={
                        !onViewTransaction
                      }
                      onClick={() =>
                        onViewTransaction?.(
                          transaction
                        )
                      }
                      className={[
                        "flex w-full items-start gap-3 p-4 text-left",
                        onViewTransaction
                          ? "transition-colors hover:bg-white/[0.025]"
                          : "",
                      ].join(" ")}
                    >
                      <TypeIcon
                        type={transaction.type}
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-white">
                              {transaction.description ||
                                typeConfig.label}
                            </p>

                            <p className="mt-0.5 truncate text-[11px] text-white/30">
                              {transaction.reference}
                            </p>
                          </div>

                          <p
                            className={[
                              "shrink-0 text-sm font-semibold",
                              incoming
                                ? "text-emerald-400"
                                : "text-white",
                            ].join(" ")}
                          >
                            {incoming ? "+" : "-"}
                            {formatCurrency(
                              Math.abs(
                                Number(
                                  transaction.amount
                                )
                              ),
                              transaction.currency
                            )}
                          </p>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <StatusBadge
                            status={
                              transaction.status
                            }
                          />

                          <span className="text-[11px] text-white/25">
                            {formatDate(
                              transaction.createdAt
                            )}
                          </span>

                          <span className="text-[11px] text-white/20">
                            •
                          </span>

                          <span className="text-[11px] text-white/30">
                            {typeConfig.label}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          </>
        )}

      {/* Pagination */}
      {!loading &&
        !error &&
        count > 0 && (
          <div className="flex flex-col gap-3 border-t border-white/[0.06] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-xs text-white/30">
              Showing{" "}
              <span className="text-white/60">
                {start}
              </span>
              {"–"}
              <span className="text-white/60">
                {end}
              </span>{" "}
              of{" "}
              <span className="text-white/60">
                {count}
              </span>{" "}
              transactions
            </p>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={
                  !hasPrevious ||
                  !onPreviousPage
                }
                onClick={onPreviousPage}
                className={[
                  "flex h-9 w-9 items-center justify-center rounded-xl",
                  "border border-white/[0.08]",
                  "bg-white/[0.02]",
                  "text-white/50",
                  "transition",
                  hasPrevious &&
                  onPreviousPage
                    ? "hover:border-[#FFD84D]/30 hover:text-white"
                    : "cursor-not-allowed opacity-30",
                ].join(" ")}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="flex h-9 min-w-9 items-center justify-center rounded-xl bg-[#FFD84D]/10 px-3 text-xs font-semibold text-[#FFD84D]">
                {page}
              </span>

              <button
                type="button"
                disabled={
                  !hasNext ||
                  !onNextPage
                }
                onClick={onNextPage}
                className={[
                  "flex h-9 w-9 items-center justify-center rounded-xl",
                  "border border-white/[0.08]",
                  "bg-white/[0.02]",
                  "text-white/50",
                  "transition",
                  hasNext && onNextPage
                    ? "hover:border-[#FFD84D]/30 hover:text-white"
                    : "cursor-not-allowed opacity-30",
                ].join(" ")}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
    </section>
  );
}