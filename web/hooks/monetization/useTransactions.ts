"use client";

import { useCallback, useEffect, useState } from "react";

import {
  TRANSACTIONS_PAGE_SIZE,
} from "@/utils/monetization/constants/monetization";

import {
  getTransactions,
} from "@/utils/monetization/services/monetization";

import type {
  Transaction,
  TransactionsResponse,
} from "@/utils/monetization/types/monetization";

interface UseTransactionsOptions {
  pageSize?: number;
  status?: string;
  type?: string;
  source?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

interface UseTransactionsReturn {
  transactions: Transaction[];
  count: number;

  page: number;
  pageSize: number;

  loading: boolean;
  error: string | null;

  hasNext: boolean;
  hasPrevious: boolean;

  setPage: (page: number) => void;

  nextPage: () => void;
  previousPage: () => void;

  refresh: () => Promise<void>;

  clearError: () => void;
}

export function useTransactions(
  options: UseTransactionsOptions = {}
): UseTransactionsReturn {
  const pageSize =
    options.pageSize ?? TRANSACTIONS_PAGE_SIZE;

  const [transactions, setTransactions] = useState<Transaction[]>(
    []
  );

  const [count, setCount] = useState(0);

  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [nextUrl, setNextUrl] = useState<string | null>(null);

  const [previousUrl, setPreviousUrl] =
    useState<string | null>(null);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response: TransactionsResponse =
        await getTransactions({
          page,
          pageSize,
          status: options.status,
          type: options.type,
          source: options.source,
          search: options.search,
          startDate: options.startDate,
          endDate: options.endDate,
        });

      setTransactions(response.results ?? []);
      setCount(response.count ?? 0);

      setNextUrl(response.next ?? null);
      setPreviousUrl(response.previous ?? null);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to load transactions.";

      setError(message);
      setTransactions([]);
      setCount(0);

      setNextUrl(null);
      setPreviousUrl(null);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    pageSize,
    options.status,
    options.type,
    options.source,
    options.search,
    options.startDate,
    options.endDate,
  ]);

  /**
   * Reload transactions whenever
   * pagination or filters change.
   */
  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  /**
   * Move to the next page.
   */
  const nextPage = useCallback(() => {
    if (!nextUrl || loading) {
      return;
    }

    setPage((current) => current + 1);
  }, [nextUrl, loading]);

  /**
   * Move to the previous page.
   */
  const previousPage = useCallback(() => {
    if (!previousUrl || loading) {
      return;
    }

    setPage((current) => Math.max(1, current - 1));
  }, [previousUrl, loading]);

  /**
   * Manually refresh the current page.
   */
  const refresh = useCallback(async () => {
    await loadTransactions();
  }, [loadTransactions]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    transactions,
    count,

    page,
    pageSize,

    loading,
    error,

    hasNext: Boolean(nextUrl),
    hasPrevious: Boolean(previousUrl),

    setPage,

    nextPage,
    previousPage,

    refresh,

    clearError,
  };
}

export default useTransactions;