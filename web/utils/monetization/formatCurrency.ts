/**
 * Currency formatting utilities for Tribe monetization.
 */

export type CurrencyCode = "NGN" | "USD" | "GBP" | "EUR";

const currencyLocales: Record<CurrencyCode, string> = {
  NGN: "en-NG",
  USD: "en-US",
  GBP: "en-GB",
  EUR: "de-DE",
};

export function formatCurrency(
  amount: number | string | null | undefined,
  currency: CurrencyCode = "NGN",
  options?: Intl.NumberFormatOptions
): string {
  const numericAmount = Number(amount ?? 0);

  if (!Number.isFinite(numericAmount)) {
    return formatCurrency(0, currency, options);
  }

  return new Intl.NumberFormat(currencyLocales[currency], {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
    ...options,
  }).format(numericAmount);
}

export function formatCompactCurrency(
  amount: number | string | null | undefined,
  currency: CurrencyCode = "NGN"
): string {
  const numericAmount = Number(amount ?? 0);

  if (!Number.isFinite(numericAmount)) {
    return formatCompactCurrency(0, currency);
  }

  return new Intl.NumberFormat(currencyLocales[currency], {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(numericAmount);
}

export function formatNumber(
  value: number | string | null | undefined,
  maximumFractionDigits = 0
): string {
  const numericValue = Number(value ?? 0);

  if (!Number.isFinite(numericValue)) {
    return "0";
  }

  return new Intl.NumberFormat("en-NG", {
    maximumFractionDigits,
  }).format(numericValue);
}

export function formatPercentage(
  value: number | string | null | undefined,
  maximumFractionDigits = 2
): string {
  const numericValue = Number(value ?? 0);

  if (!Number.isFinite(numericValue)) {
    return "0%";
  }

  return `${numericValue.toFixed(maximumFractionDigits)}%`;
}

export function formatSignedPercentage(
  value: number | string | null | undefined,
  maximumFractionDigits = 2
): string {
  const numericValue = Number(value ?? 0);

  if (!Number.isFinite(numericValue)) {
    return "0%";
  }

  const sign = numericValue > 0 ? "+" : "";

  return `${sign}${numericValue.toFixed(maximumFractionDigits)}%`;
}