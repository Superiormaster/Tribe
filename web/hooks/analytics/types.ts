import type React from "react";

export type AnalyticsRange =
  | "7D"
  | "28D"
  | "3M"
  | "1Y";

export type AnalyticsTab =
  | "overview"
  | "content"
  | "audience"
  | "communities";

export type MetricType =
  | "impressions"
  | "reach"
  | "engagement"
  | "profileViews"
  | "stars"
  | "likes"
  | "comments"
  | "shares"
  | "bookmarks"
  | "reposts"
  | "videoViews";

export type ChartType =
  | "line"
  | "bar"
  | "area";

export type Interval =
  | "daily"
  | "weekly"
  | "monthly";

export interface ChartPoint {
  label: string;
  value: number;
}

export interface AnalyticsChart {
  metric: MetricType;
  chartType: ChartType;
  interval: Interval;
  data: ChartPoint[];
}

export interface MetricCard {
  id: MetricType;
  title: string;
  value: number;
  formattedValue: string;
  growth: number;
  previousValue: number;
  positive: boolean;
  icon?: React.ReactNode;
}

export interface AnalyticsSummary {
  impressions: MetricCard;
  engagement: MetricCard;
  profileViews: MetricCard;
  stars: MetricCard;
  likes: MetricCard;
  comments: MetricCard;
  shares: MetricCard;
  bookmarks: MetricCard;
}

export interface AnalyticsMediaActivity {
  posts: number;
  reels: number;
  photos: number;
  videos: number;
  postGrowth: number;
  reelGrowth: number;
  photoGrowth: number;
  videoGrowth: number;
}

export interface AnalyticsContent {
  range: AnalyticsRange;
  metric: MetricType;
  chart: AnalyticsChart;
  topPosts: TopPost[];
  mediaActivity: AnalyticsMediaActivity;
}

export interface AnalyticsAudience {
  stars: number;
  newStars: number;
  lostStars: number;
  activeStars: number;
  growth: number;
}

export interface TopPost {
  id: string;
  title: string;
  thumbnail: string | null;
  impressions: number;
  likes: number;
  comments: number;
  reposts: number;
  bookmarks: number;
  engagementRate: number;
}

export interface ReelsAnalytics {
  totalReels: number;
  totalViews: number;
  totalWatchTime: number;
  averageWatchTime: number;
  completionRate: number;
  growth: number;
}

export interface CommunityAnalytics {
  id: string;
  name: string;
  members: number;
  cover: string | null;
  activeMembers: number;
  posts: number;
  engagement: number;
  engagementCount: number;
}

export interface AnalyticsResponse {
  summary: AnalyticsSummary;
  chart: AnalyticsChart;
  content: AnalyticsContent;
  audience: AnalyticsAudience;
  topPosts: TopPost[];
  reels: ReelsAnalytics;
  communities: CommunityAnalytics[];
}