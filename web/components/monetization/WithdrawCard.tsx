"use client";

import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Loader2,
  LockKeyhole,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";

import { formatCurrency } from "@/utils/monetization/formatCurrency";

import type {
  BankAccount,
  MonetizationCurrency,
} from "@/utils/monetization/types/monetization";

interface WithdrawCardProps {
  availableBalance: number;
  currency?: MonetizationCurrency;
  minimumWithdrawal?: number;
  bankAccounts?: BankAccount[];
  selectedBankAccount?: BankAccount | null;

  loading?: boolean;
  submitting?: boolean;
  error?: string | null;
  success?: string | null;

  onWithdraw?: (amount: number) => void;
  onAddBankAccount?: () => void;
  onSelectBankAccount?: (
    account: BankAccount
  ) => void;

  className?: string;
}

function maskAccountNumber(
  accountNumber?: string | null
) {
  if (!accountNumber) return "••••••••";

  const value = String(accountNumber);

  if (value.length <= 4) {
    return value;
  }

  return `•••• ${value.slice(-4)}`;
}

function getBankName(
  account: BankAccount
) {
  return (
    account.bankName ||
    "Bank account"
  );
}

function getAccountName(
  account: BankAccount
) {
  return (
    account.accountName ||
    ""
  );
}

function getAccountNumber(
  account: BankAccount
) {
  return (
    account.accountNumber ||
    ""
  );
}

export default function WithdrawCard({
  availableBalance,
  currency = "NGN",
  minimumWithdrawal = 1000,
  bankAccounts = [],
  selectedBankAccount = null,
  loading = false,
  submitting = false,
  error = null,
  success = null,
  onWithdraw,
  onAddBankAccount,
  onSelectBankAccount,
  className = "",
}: WithdrawCardProps) {
  const [amount, setAmount] = useState("");
  const [accountOpen, setAccountOpen] =
    useState(false);

  const selectedAccount =
    selectedBankAccount ??
    bankAccounts[0] ??
    null;

  const numericAmount = Number(amount);

  const amountError = useMemo(() => {
    if (!amount) return null;

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      return "Enter a valid amount.";
    }

    if (numericAmount < minimumWithdrawal) {
      return `Minimum withdrawal is ${formatCurrency(
        minimumWithdrawal,
        currency
      )}.`;
    }

    if (numericAmount > availableBalance) {
      return "Amount exceeds your available balance.";
    }

    return null;
  }, [
    amount,
    numericAmount,
    minimumWithdrawal,
    availableBalance,
    currency,
  ]);

  const canWithdraw =
    numericAmount > 0 &&
    !amountError &&
    !!selectedAccount &&
    !submitting &&
    !loading;

  const setMaxAmount = () => {
    if (availableBalance <= 0) {
      setAmount("");
      return;
    }

    setAmount(
      Number(availableBalance).toFixed(2)
    );
  };

  const handleAmountChange = (
    value: string
  ) => {
    if (value === "") {
      setAmount("");
      return;
    }

    if (!/^\d*\.?\d{0,2}$/.test(value)) {
      return;
    }

    setAmount(value);
  };

  const handleWithdraw = () => {
    if (!canWithdraw || !onWithdraw) {
      return;
    }

    onWithdraw(numericAmount);
  };

  return (
    <section
      className={[
        "relative w-full overflow-hidden",
        "rounded-2xl border border-white/[0.08]",
        "bg-[#121212]",
        className,
      ].join(" ")}
    >
      {/* Tribe accent */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#FFD84D]/[0.06] blur-3xl" />

      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] px-4 py-4 sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFD84D]/10">
              <Wallet className="h-5 w-5 text-[#FFD84D]" />
            </div>

            <div>
              <h2 className="text-base font-semibold text-white">
                Withdraw earnings
              </h2>

              <p className="mt-1 text-xs text-white/40">
                Transfer your available Tribe earnings
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-1.5 rounded-lg bg-white/[0.04] px-2.5 py-1.5 sm:flex">
            <LockKeyhole className="h-3.5 w-3.5 text-white/30" />

            <span className="text-[10px] font-medium text-white/35">
              Secure payout
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {/* Balance */}
          <div className="rounded-2xl border border-[#FFD84D]/10 bg-[#FFD84D]/[0.04] p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-white/40">
                  Available balance
                </p>

                <p className="mt-1.5 text-2xl font-bold tracking-tight text-white">
                  {formatCurrency(
                    availableBalance,
                    currency
                  )}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFD84D]/10">
                <CreditCard className="h-5 w-5 text-[#FFD84D]" />
              </div>
            </div>
          </div>

          {/* Amount */}
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <label
                htmlFor="withdraw-amount"
                className="text-xs font-medium text-white/55"
              >
                Withdrawal amount
              </label>

              <button
                type="button"
                onClick={setMaxAmount}
                disabled={
                  availableBalance <= 0 ||
                  submitting
                }
                className="text-[11px] font-semibold text-[#FFD84D] transition hover:text-[#FFE066] disabled:cursor-not-allowed disabled:opacity-30"
              >
                Max
              </button>
            </div>

            <div
              className={[
                "flex h-14 items-center rounded-xl",
                "border bg-white/[0.025]",
                amountError
                  ? "border-red-400/30"
                  : "border-white/[0.08]",
                "focus-within:border-[#FFD84D]/30",
                "focus-within:ring-2 focus-within:ring-[#FFD84D]/10",
                "transition",
              ].join(" ")}
            >
              <span className="pl-4 text-sm font-semibold text-white/40">
                {currency}
              </span>

              <input
                id="withdraw-amount"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={amount}
                onChange={(event) =>
                  handleAmountChange(
                    event.target.value
                  )
                }
                placeholder="0.00"
                disabled={
                  loading || submitting
                }
                className="h-full min-w-0 flex-1 bg-transparent px-3 text-lg font-semibold text-white outline-none placeholder:text-white/15 disabled:cursor-not-allowed"
              />
            </div>

            <div className="mt-2 flex items-start justify-between gap-3">
              <div className="min-h-4">
                {amountError ? (
                  <p className="flex items-center gap-1.5 text-[11px] text-red-400">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {amountError}
                  </p>
                ) : (
                  <p className="text-[11px] text-white/30">
                    Minimum withdrawal:{" "}
                    {formatCurrency(
                      minimumWithdrawal,
                      currency
                    )}
                  </p>
                )}
              </div>

              {numericAmount > 0 &&
                !amountError && (
                  <p className="text-[11px] text-white/30">
                    Remaining:{" "}
                    {formatCurrency(
                      Math.max(
                        0,
                        availableBalance -
                          numericAmount
                      ),
                      currency
                    )}
                  </p>
                )}
            </div>
          </div>

          {/* Bank account */}
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className="text-xs font-medium text-white/55">
                Payout account
              </label>

              {onAddBankAccount && (
                <button
                  type="button"
                  onClick={onAddBankAccount}
                  disabled={submitting}
                  className="text-[11px] font-semibold text-[#FFD84D] transition hover:text-[#FFE066] disabled:opacity-30"
                >
                  Add account
                </button>
              )}
            </div>

            {bankAccounts.length === 0 ? (
              <button
                type="button"
                onClick={onAddBankAccount}
                disabled={
                  !onAddBankAccount ||
                  submitting
                }
                className="flex w-full items-center gap-3 rounded-xl border border-dashed border-white/[0.12] bg-white/[0.02] p-4 text-left transition hover:border-[#FFD84D]/25 hover:bg-[#FFD84D]/[0.03] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.05]">
                  <Building2 className="h-4 w-4 text-white/40" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">
                    Add a bank account
                  </p>

                  <p className="mt-1 text-xs text-white/35">
                    Add your payout details to withdraw
                    your earnings.
                  </p>
                </div>

                <ArrowRight className="h-4 w-4 text-white/25" />
              </button>
            ) : (
              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setAccountOpen(
                      (value) => !value
                    )
                  }
                  disabled={submitting}
                  className="flex w-full items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.025] p-3.5 text-left transition hover:border-[#FFD84D]/25 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFD84D]/10">
                    <Building2 className="h-4 w-4 text-[#FFD84D]" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      {selectedAccount
                        ? getBankName(
                            selectedAccount
                          )
                        : "Select bank account"}
                    </p>

                    {selectedAccount && (
                      <p className="mt-1 truncate text-xs text-white/35">
                        {getAccountName(
                          selectedAccount
                        )}
                        {getAccountName(
                          selectedAccount
                        )
                          ? " • "
                          : ""}
                        {maskAccountNumber(
                          getAccountNumber(
                            selectedAccount
                          )
                        )}
                      </p>
                    )}
                  </div>

                  <ChevronDown
                    className={[
                      "h-4 w-4 shrink-0 text-white/30 transition-transform",
                      accountOpen
                        ? "rotate-180"
                        : "",
                    ].join(" ")}
                  />
                </button>

                {accountOpen && (
                  <div className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-xl border border-white/[0.08] bg-[#171717] p-1.5 shadow-2xl">
                    {bankAccounts.map(
                      (account) => {
                        const selected =
                          selectedAccount?.id ===
                          account.id;

                        return (
                          <button
                            key={account.id}
                            type="button"
                            onClick={() => {
                              onSelectBankAccount?.(
                                account
                              );
                              setAccountOpen(false);
                            }}
                            className={[
                              "flex w-full items-center gap-3 rounded-lg p-3 text-left transition",
                              selected
                                ? "bg-[#FFD84D]/10"
                                : "hover:bg-white/[0.05]",
                            ].join(" ")}
                          >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.05]">
                              <Building2 className="h-4 w-4 text-white/50" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-medium text-white">
                                {getBankName(
                                  account
                                )}
                              </p>

                              <p className="mt-1 truncate text-[11px] text-white/30">
                                {getAccountName(
                                  account
                                )}
                                {getAccountName(
                                  account
                                )
                                  ? " • "
                                  : ""}
                                {maskAccountNumber(
                                  getAccountNumber(
                                    account
                                  )
                                )}
                              </p>
                            </div>

                            {selected && (
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#FFD84D]" />
                            )}
                          </button>
                        );
                      }
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Messages */}
          {error && (
            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-400/10 bg-red-400/[0.05] p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />

              <p className="text-xs leading-5 text-red-300">
                {error}
              </p>
            </div>
          )}

          {success && (
            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-emerald-400/10 bg-emerald-400/[0.05] p-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />

              <p className="text-xs leading-5 text-emerald-300">
                {success}
              </p>
            </div>
          )}

          {/* Submit */}
          <button
            type="button"
            onClick={handleWithdraw}
            disabled={!canWithdraw}
            className={[
              "mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl",
              "text-sm font-semibold",
              "transition-all duration-200",
              canWithdraw
                ? "bg-[#FFD84D] text-black hover:bg-[#FFE066] active:scale-[0.99]"
                : "cursor-not-allowed bg-white/[0.06] text-white/25",
            ].join(" ")}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing withdrawal...
              </>
            ) : (
              <>
                Withdraw
                {numericAmount > 0 &&
                  !amountError && (
                    <>
                      {" "}
                      {formatCurrency(
                        numericAmount,
                        currency
                      )}
                    </>
                  )}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          {/* Security note */}
          <div className="mt-4 flex items-start gap-2 text-[10px] leading-4 text-white/25">
            <LockKeyhole className="mt-0.5 h-3 w-3 shrink-0" />

            <p>
              Withdrawals are processed securely. Make
              sure your payout account details are
              correct before confirming.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}