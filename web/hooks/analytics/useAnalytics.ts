"use client";

import { useMemo } from "react";
import {
  useQuery,
  useQueries,
  useQueryClient,
} from "@tanstack/react-query";

import analytics, { AnalyticsQuery } from "./analytics";
import {
  AnalyticsRange,
  AnalyticsTab,
} from "./types";

interface UseAnalyticsOptions extends AnalyticsQuery {
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
}

const DEFAULT_STALE_TIME = 1000 * 60 * 5; // 5 minutes
const DEFAULT_GC_TIME = 1000 * 60 * 30; // 30 minutes

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
    [tab, range, metric, chartType, interval]
  );

  const query = useQuery({
    queryKey,

    queryFn: async () => {
      switch (tab) {
        case "content":
          return analytics.content({
            range,
            metric,
            chartType,
            interval,
          });

        case "audience":
          return analytics.audience({
            range,
            metric,
            chartType,
            interval,
          });

        case "communities":
          return analytics.communities({
            range,
            metric,
            chartType,
            interval,
          });

        default:
          return analytics.overview({
            range,
            metric,
            chartType,
            interval,
          });
      }
    },

    enabled,

    staleTime,

    gcTime,

    retry: 2,

    refetchOnWindowFocus: false,

    refetchOnReconnect: true,

    refetchOnMount: false,
  });

  const prefetchRange = async (nextRange: AnalyticsRange) => {
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
        analytics.overview({
          range: nextRange,
          metric,
          chartType,
          interval,
        }),
    });
  };

  const refresh = () => {
    query.refetch();
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

export function useAnalyticsDashboard(
  range: AnalyticsRange = "7D"
) {
  const queries = useQueries({
    queries: [
      {
        queryKey: ["analytics", "overview", range],
        queryFn: () =>
          analytics.overview({
            range,
          }),
      },

      {
        queryKey: ["analytics", "top-posts", range],
        queryFn: () =>
          analytics.topPosts(range),
      },

      {
        queryKey: ["analytics", "reels", range],
        queryFn: () =>
          analytics.reels(range),
      },
    ],
  });

  return {
    overview: queries[0].data,

    topPosts: queries[1].data,

    reels: queries[2].data,

    isLoading: queries.some((q) => q.isLoading),

    isFetching: queries.some((q) => q.isFetching),

    isError: queries.some((q) => q.isError),

    errors: queries
      .map((q) => q.error)
      .filter(Boolean),

    refetchAll: () =>
      Promise.all(
        queries.map((q) => q.refetch())
      ),
  };
}