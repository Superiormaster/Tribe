"use client";

import { useMemo } from "react";
import {
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import analytics, {
  AnalyticsQuery,
} from "./analytics";

import {
  AnalyticsRange,
} from "./types";

interface UseAnalyticsOptions extends AnalyticsQuery {
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
}

const DEFAULT_STALE_TIME = 1000 * 60 * 5;
const DEFAULT_GC_TIME = 1000 * 60 * 30;

export default function useAnalytics({
  range = "7D",
  tab = "overview",
  metric = "impressions",
  chartType = "line",
  interval = "daily",
  enabled = true,
  staleTime = DEFAULT_STALE_TIME,
  gcTime = DEFAULT_GC_TIME,
}: UseAnalyticsOptions = {}) {

  const queryClient = useQueryClient();

  const queryKey = useMemo(
    () => [
      "analytics",
      tab,
      range,
      metric,
      chartType,
      interval,
    ],
    [
      tab,
      range,
      metric,
      chartType,
      interval,
    ]
  );

  const fetchAnalytics = async (
    selectedRange: AnalyticsRange
  ) => {

    console.log("🔥 ANALYTICS REQUEST START");

    const params = {
      range: selectedRange,
      metric,
      chartType,
      interval,
    };

    console.log("🔥 ANALYTICS PARAMS:", params);

    try {

      const response =
        await analytics.overview(params);

      console.log(
        "🔥 ANALYTICS API RESPONSE:",
        response
      );

      return response;

    } catch (error) {

      console.error(
        "❌ ANALYTICS API ERROR:",
        error
      );

      throw error;
    }
  };

  const query = useQuery({
    queryKey,

    queryFn: () =>
      fetchAnalytics(range),

    enabled,

    staleTime,
    gcTime,

    retry: 2,

    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchOnMount: true,
  });

  console.log("🔥 REACT QUERY ANALYTICS:", {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isRefetching: query.isRefetching,
    isError: query.isError,
    error: query.error,
    status: query.status,
    fetchStatus: query.fetchStatus,
  });

  const prefetchRange = async (
    nextRange: AnalyticsRange
  ) => {

    await queryClient.prefetchQuery({
      queryKey: [
        "analytics",
        tab,
        nextRange,
        metric,
        chartType,
        interval,
      ],

      queryFn: () =>
        fetchAnalytics(nextRange),
    });
  };

  const refresh = async () => {
    await query.refetch();
  };

  return {
    ...query,

    analytics: query.data,

    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isRefetching: query.isRefetching,
    isError: query.isError,
    error: query.error,

    refresh,
    prefetchRange,
  };
}