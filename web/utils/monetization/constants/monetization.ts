/**
 * Tribe Monetization Constants
 *
 * Centralized configuration for the monetization dashboard.
 */

import type { CurrencyCode } from "@/utils/monetization/formatCurrency";

export const DEFAULT_CURRENCY: CurrencyCode = "NGN";

export const SUPPORTED_CURRENCIES: {
  code: CurrencyCode;
  name: string;
  symbol: string;
}[] = [
  {
    code: "NGN",
    name: "Nigerian Naira",
    symbol: "₦",
  },
  {
    code: "USD",
    name: "US Dollar",
    symbol: "$",
  },
  {
    code: "GBP",
    name: "British Pound",
    symbol: "£",
  },
  {
    code: "EUR",
    name: "Euro",
    symbol: "€",
  },
];

export const REVENUE_PERIODS = [
  {
    key: "1d",
    label: "1D",
    days: 1,
  },
  {
    key: "7d",
    label: "7D",
    days: 7,
  },
  {
    key: "30d",
    label: "30D",
    days: 30,
  },
  {
    key: "3m",
    label: "3M",
    days: 90,
  },
  {
    key: "6m",
    label: "6M",
    days: 180,
  },
  {
    key: "1y",
    label: "1Y",
    days: 365,
  },
  {
    key: "all",
    label: "All",
    days: null,
  },
] as const;

export type RevenuePeriod = (typeof REVENUE_PERIODS)[number]["key"];

export const DEFAULT_REVENUE_PERIOD: RevenuePeriod = "30d";

export const CHART_METRICS = [
  {
    key: "revenue",
    label: "Revenue",
  },
  {
    key: "views",
    label: "Views",
  },
  {
    key: "rpm",
    label: "RPM",
  },
  {
    key: "engagement",
    label: "Engagement",
  },
] as const;

export type ChartMetric = (typeof CHART_METRICS)[number]["key"];

export const DEFAULT_CHART_METRIC: ChartMetric = "revenue";

export const REVENUE_SOURCES = [
  {
    key: "ads",
    label: "Ads",
    description: "Revenue from advertisements shown on your content.",
  },
  {
    key: "subscriptions",
    label: "Subscriptions",
    description: "Recurring revenue from your subscribers.",
  },
  {
    key: "tips",
    label: "Tips",
    description: "Direct support from your audience.",
  },
  {
    key: "tribe_premium",
    label: "Tribe Premium",
    description: "Revenue from premium Tribe features.",
  },
  {
    key: "gifts",
    label: "Gifts",
    description: "Virtual gifts sent by your audience.",
  },
  {
    key: "sponsored_posts",
    label: "Sponsored Posts",
    description: "Revenue from approved sponsored content.",
  },
  {
    key: "affiliate",
    label: "Affiliate",
    description: "Commission from eligible affiliate activity.",
  },
  {
    key: "marketplace",
    label: "Marketplace",
    description: "Revenue from eligible marketplace sales.",
  },
] as const;

export type RevenueSource =
  (typeof REVENUE_SOURCES)[number]["key"];

export const MONETIZABLE_CONTENT_TYPES = [
  {
    key: "post",
    label: "Posts",
  },
  {
    key: "reel",
    label: "Reels",
  },
  {
    key: "video",
    label: "Videos",
  },
  {
    key: "article",
    label: "Articles",
  },
  {
    key: "community",
    label: "Tribes",
  },
] as const;

export type MonetizableContentType =
  (typeof MONETIZABLE_CONTENT_TYPES)[number]["key"];

export const TRANSACTION_STATUSES = [
  {
    key: "completed",
    label: "Completed",
  },
  {
    key: "pending",
    label: "Pending",
  },
  {
    key: "processing",
    label: "Processing",
  },
  {
    key: "failed",
    label: "Failed",
  },
  {
    key: "cancelled",
    label: "Cancelled",
  },
] as const;

export type TransactionStatus =
  (typeof TRANSACTION_STATUSES)[number]["key"];

export const PAYOUT_STATUSES = [
  {
    key: "completed",
    label: "Completed",
  },
  {
    key: "pending",
    label: "Pending",
  },
  {
    key: "processing",
    label: "Processing",
  },
  {
    key: "failed",
    label: "Failed",
  },
] as const;

export type PayoutStatus =
  (typeof PAYOUT_STATUSES)[number]["key"];

export const DEFAULT_MINIMUM_WITHDRAWAL = 5000;

export const DEFAULT_WITHDRAWAL_PROCESSING_DAYS = {
  minimum: 1,
  maximum: 3,
};

export const MONETIZATION_STATS = [
  {
    key: "total_earnings",
    label: "Total Earnings",
    description: "Your total monetization earnings.",
  },
  {
    key: "available_balance",
    label: "Available Balance",
    description: "Funds currently available for withdrawal.",
  },
  {
    key: "pending_balance",
    label: "Pending",
    description: "Earnings currently being processed.",
  },
  {
    key: "lifetime_earnings",
    label: "Lifetime Earnings",
    description: "All earnings generated on Tribe.",
  },
] as const;

export const DEFAULT_MONTHLY_GOAL = 2_000_000;

export const GOAL_PERIODS = [
  {
    key: "monthly",
    label: "Monthly",
  },
  {
    key: "quarterly",
    label: "Quarterly",
  },
  {
    key: "yearly",
    label: "Yearly",
  },
] as const;

export type GoalPeriod =
  (typeof GOAL_PERIODS)[number]["key"];

export const QUICK_ACTIONS = [
  {
    key: "withdraw",
    label: "Withdraw",
  },
  {
    key: "analytics",
    label: "View Analytics",
  },
  {
    key: "premium",
    label: "Create Premium",
  },
  {
    key: "ads",
    label: "Manage Ads",
  },
  {
    key: "boost",
    label: "Boost Content",
  },
  {
    key: "settings",
    label: "Creator Settings",
  },
] as const;

export type QuickAction =
  (typeof QUICK_ACTIONS)[number]["key"];

export const INSIGHT_TYPES = [
  {
    key: "best_posting_time",
    label: "Best Posting Time",
  },
  {
    key: "highest_paying_tribe",
    label: "Highest Paying Tribe",
  },
  {
    key: "best_content_type",
    label: "Best Content Type",
  },
  {
    key: "best_rpm",
    label: "Best RPM",
  },
  {
    key: "highest_engagement",
    label: "Highest Engagement",
  },
] as const;

export type InsightType =
  (typeof INSIGHT_TYPES)[number]["key"];

export const TRANSACTIONS_PAGE_SIZE = 10;

export const PAYOUTS_PAGE_SIZE = 10;

export const TOP_CONTENT_LIMIT = 5;

export const MONETIZATION_DASHBOARD_DEFAULTS = {
  currency: DEFAULT_CURRENCY,
  revenuePeriod: DEFAULT_REVENUE_PERIOD,
  chartMetric: DEFAULT_CHART_METRIC,
  monthlyGoal: DEFAULT_MONTHLY_GOAL,
  transactionsPageSize: TRANSACTIONS_PAGE_SIZE,
  payoutsPageSize: PAYOUTS_PAGE_SIZE,
  topContentLimit: TOP_CONTENT_LIMIT,
};

export const TRIBE_MONETIZATION_THEME = {
  background: "#090909",
  card: "#121212",
  cardHover: "#1A1A1A",
  primary: "#FFD84D",
  primaryHover: "#FFE066",
  success: "#00D67A",
  danger: "#FF5757",
  warning: "#FFB020",
  text: "#FFFFFF",
  mutedText: "rgba(255, 255, 255, 0.5)",
  subtleText: "rgba(255, 255, 255, 0.3)",
  border: "rgba(255, 255, 255, 0.08)",
};

export const MONETIZATION_ENDPOINTS = {
  dashboard: "/api/monetization/dashboard/",
  chart: "/api/monetization/chart/",
  revenueSources: "/api/monetization/revenue-sources/",
  topContent: "/api/monetization/top-content/",
  transactions: "/api/monetization/transactions/",
  payouts: "/api/monetization/payouts/",
  wallet: "/api/monetization/wallet/",
  withdraw: "/api/monetization/withdraw/",
  goals: "/api/monetization/goals/",
  insights: "/api/monetization/insights/",
} as const;