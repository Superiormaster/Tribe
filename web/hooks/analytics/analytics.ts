import { apiRequest } from "@/utils/api";

import {
  AnalyticsRange,
  AnalyticsTab,
  AnalyticsResponse,
  MetricType,
  ChartType,
  Interval,
} from "./types";

export interface AnalyticsQuery {
  range?: AnalyticsRange;
  tab?: AnalyticsTab;
  metric?: MetricType;
  chartType?: ChartType;
  interval?: Interval;
}

const analytics = {
  async overview(params: AnalyticsQuery = {}) {
    return await apiRequest("api/dashboard/overview/", {
      method: "GET",
      params,
    }) as AnalyticsResponse;
  },

  async content(params: AnalyticsQuery = {}) {
    return await apiRequest("api/dashboard/content/", {
      method: "GET",
      params,
    });
  },

  async audience(params: AnalyticsQuery = {}) {
    return await apiRequest("api/dashboard/audience/", {
      method: "GET",
      params,
    });
  },

  async communities(params: AnalyticsQuery = {}) {
    return await apiRequest("api/dashboard/communities/", {
      method: "GET",
      params,
    });
  },

  async reels(range: AnalyticsRange) {
    return await apiRequest("api/dashboard/reels/", {
      method: "GET",
      params: { range },
    });
  },
};

export default analytics;