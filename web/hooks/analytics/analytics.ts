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
    return await apiRequest("analytics/overview/", {
      method: "GET",
      params,
    }) as AnalyticsResponse;
  },

  async content(params: AnalyticsQuery = {}) {
    return await apiRequest("analytics/content/", {
      method: "GET",
      params,
    });
  },

  async audience(params: AnalyticsQuery = {}) {
    return await apiRequest("analytics/audience/", {
      method: "GET",
      params,
    });
  },

  async communities(params: AnalyticsQuery = {}) {
    return await apiRequest("analytics/communities/", {
      method: "GET",
      params,
    });
  },

  async topPosts(range: AnalyticsRange) {
    return await apiRequest("analytics/top-posts/", {
      method: "GET",
      params: { range },
    });
  },

  async reels(range: AnalyticsRange) {
    return await apiRequest("analytics/reels/", {
      method: "GET",
      params: { range },
    });
  },

  async exportCSV(range: AnalyticsRange) {
    return await apiRequest("analytics/export/", {
      method: "GET",
      params: { range },
      responseType: "blob",
    });
  },
};

export default analytics;