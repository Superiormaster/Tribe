export type AnalyticsRange = "7D" | "28D" | "3M" | "1Y";

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

export type ChartType = "line" | "bar" | "area";

export type Interval = "daily" | "weekly" | "monthly";

export interface ChartPoint {
  label: string;
  value: number;
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

export interface AnalyticsChart {
  metric: MetricType;
  chartType: ChartType;
  interval: Interval;
  data: ChartPoint[];
}

export interface TopPost {
  id: string;
  title: string;
  thumbnail: string;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
}

export interface ReelsAnalytics {
  totalViews: number;
  watchTime: number;
  averageWatchTime: number;
  completionRate: number;
}

export interface CommunityAnalytics {
  id: string;
  name: string;
  members: number;
  activeMembers: number;
  posts: number;
  engagement: number;
}

export interface AnalyticsResponse {
  summary: AnalyticsSummary;
  chart: AnalyticsChart;
  topPosts: TopPost[];
  reels: ReelsAnalytics;
  communities: CommunityAnalytics[];
}