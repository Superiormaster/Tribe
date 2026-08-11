import { AnalyticsResponse } from "./types";

export const mockAnalytics: AnalyticsResponse = {
  chart: {
    metric: "impressions",
    chartType: "line",
    interval: "daily",

    data: [
      { label: "Mon", value: 120 },
      { label: "Tue", value: 180 },
      { label: "Wed", value: 140 },
      { label: "Thu", value: 220 },
      { label: "Fri", value: 300 },
      { label: "Sat", value: 260 },
      { label: "Sun", value: 340 },
    ],
  },

  summary: {
    impressions: {
      id: "impressions",
      title: "Impressions",
      value: 582000,
      formattedValue: "582K",
      previousValue: 492000,
      growth: 18.3,
      positive: true,
    },

    engagement: {
      id: "engagement",
      title: "Engagement",
      value: 18400,
      formattedValue: "18.4K",
      previousValue: 16100,
      growth: 14.3,
      positive: true,
    },

    stars: {
      id: "stars",
      title: "Stars",
      value: 12850,
      formattedValue: "12.8K",
      previousValue: 11400,
      growth: 12.7,
      positive: true,
    },

    profileViews: {
      id: "profileViews",
      title: "Profile Views",
      value: 9240,
      formattedValue: "9.2K",
      previousValue: 8100,
      growth: 14.1,
      positive: true,
    },

    likes: {
      id: "likes",
      title: "Likes",
      value: 25400,
      formattedValue: "25.4K",
      previousValue: 22100,
      growth: 14.9,
      positive: true,
    },

    comments: {
      id: "comments",
      title: "Comments",
      value: 3400,
      formattedValue: "3.4K",
      previousValue: 2900,
      growth: 17.2,
      positive: true,
    },

    shares: {
      id: "shares",
      title: "Shares",
      value: 2100,
      formattedValue: "2.1K",
      previousValue: 1800,
      growth: 16.7,
      positive: true,
    },

    bookmarks: {
      id: "bookmarks",
      title: "Bookmarks",
      value: 970,
      formattedValue: "970",
      previousValue: 840,
      growth: 15.5,
      positive: true,
    },
  },

  topPosts: [],

  reels: {
    totalViews: 2850000,
    watchTime: 48320,
    averageWatchTime: 27.4,
    completionRate: 74.8,
  },

  communities: [],
};