import {
AnalyticsRange,
AnalyticsTab,
MetricType,
ChartType,
Interval,
} from "./types";

export const ANALYTICS_RANGES: AnalyticsRange[] = [
"7D",
"28D",
"3M",
"1Y",
];

export const ANALYTICS_TABS: AnalyticsTab[] = [
"overview",
"content",
"audience",
"communities",
];

export const METRIC_OPTIONS: {
value: MetricType;
label: string;
}[] = [
{ value: "impressions", label: "Impressions" },
{ value: "reach", label: "Reach" },
{ value: "engagement", label: "Engagement" },
{ value: "profileViews", label: "Profile Views" },
{ value: "stars", label: "Stars" },
{ value: "likes", label: "Likes" },
{ value: "comments", label: "Comments" },
{ value: "shares", label: "Shares" },
{ value: "bookmarks", label: "Bookmarks" },
{ value: "reposts", label: "Reposts" },
{ value: "videoViews", label: "Video Views" },
];

export const CHART_TYPES: {
value: ChartType;
label: string;
}[] = [
{ value: "line", label: "Line" },
{ value: "bar", label: "Bar" },
{ value: "area", label: "Area" },
];

export const INTERVAL_OPTIONS: {
value: Interval;
label: string;
}[] = [
{ value: "daily", label: "Daily" },
{ value: "weekly", label: "Weekly" },
{ value: "monthly", label: "Monthly" },
];

export const CARD_ANIMATION_DELAY = 0.08;

export const DEFAULT_RANGE: AnalyticsRange = "7D";

export const DEFAULT_TAB: AnalyticsTab = "overview";

export const DEFAULT_METRIC: MetricType = "impressions";

export const DEFAULT_CHART: ChartType = "line";

export const DEFAULT_INTERVAL: Interval = "daily";

export const COLORS = {
primary: "#3B82F6",
success: "#22C55E",
danger: "#EF4444",
warning: "#F59E0B",
};

export const SAMPLE_CHART = [
{ label: "Mon", value: 120 },
{ label: "Tue", value: 95 },
{ label: "Wed", value: 170 },
{ label: "Thu", value: 145 },
{ label: "Fri", value: 260 },
{ label: "Sat", value: 320 },
{ label: "Sun", value: 280 },
];