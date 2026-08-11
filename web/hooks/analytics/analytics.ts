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
    const { data } = await apiRequest.get<AnalyticsResponse>(
      "analytics/overview/",
      {
        params,
      }
    );

    return data;
  },

  async content(params: AnalyticsQuery = {}) {
    const { data } = await apiRequest.get(
      "analytics/content/",
      {
        params,
      }
    );

    return data;
  },

  async audience(params: AnalyticsQuery = {}) {
    const { data } = await apiRequest.get(
      "analytics/audience/",
      {
        params,
      }
    );

    return data;
  },

  async communities(params: AnalyticsQuery = {}) {
    const { data } = await apiRequest.get(
      "analytics/communities/",
      {
        params,
      }
    );

    return data;
  },

  async topPosts(range: AnalyticsRange) {
    const { data } = await apiRequest.get(
      "analytics/top-posts/",
      {
        params: { range },
      }
    );

    return data;
  },

  async reels(range: AnalyticsRange) {
    const { data } = await apiRequest.get(
      "analytics/reels/",
      {
        params: { range },
      }
    );

    return data;
  },

  async exportCSV(range: AnalyticsRange) {
    const response = await apiRequest.get(
      "analytics/export/",
      {
        params: { range },
        responseType: "blob",
      }
    );

    return response.data;
  },
};

export default analytics;