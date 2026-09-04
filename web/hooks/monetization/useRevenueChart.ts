"use client";

import { useCallback, useEffect, useState } from "react";

import {
  DEFAULT_CHART_METRIC,
  DEFAULT_REVENUE_PERIOD,
} from "@/utils/monetization/constants/monetization";

import { getRevenueChart } from "@/utils/monetization/services/monetization";

import type {
  ChartMetric,
  RevenueChartResponse,
  RevenuePeriod,
} from "@/utils/monetization/types/monetization";

interface UseRevenueChartReturn {
  data: RevenueChartResponse | null;

  period: RevenuePeriod;
  metric: ChartMetric;

  loading: boolean;
  error: string | null;

  setPeriod: (period: RevenuePeriod) => void;
  setMetric: (metric: ChartMetric) => void;

  refresh: () => Promise<void>;
  clearError: () => void;
}

export function useRevenueChart(): UseRevenueChartReturn {
  const [data, setData] =
    useState<RevenueChartResponse | null>(null);

  const [period, setPeriod] =
    useState<RevenuePeriod>(DEFAULT_REVENUE_PERIOD);

  const [metric, setMetric] =
    useState<ChartMetric>(DEFAULT_CHART_METRIC);

  const [loading, setLoading] = useState(true);
  const [error, setError] =
    useState<string | null>(null);

  const loadChart = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getRevenueChart({
        period,
        metric,
      });

      setData(response);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to load revenue analytics.";

      setError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [period, metric]);

  /**
   * Load chart whenever the selected
   * period or metric changes.
   */
  useEffect(() => {
    void loadChart();
  }, [loadChart]);

  /**
   * Manually refresh the current chart.
   */
  const refresh = useCallback(async () => {
    await loadChart();
  }, [loadChart]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    data,

    period,
    metric,

    loading,
    error,

    setPeriod,
    setMetric,

    refresh,
    clearError,
  };
}

export default useRevenueChart;