/**
 * Tribe Monetization Types
 *
 * Shared TypeScript contracts for:
 * - Earnings
 * - Wallet
 * - Revenue analytics
 * - Transactions
 * - Payouts
 * - Top content
 * - Creator goals
 * - Monetization insights
 */

export type MonetizationCurrency =
  | "NGN"
  | "USD"
  | "GBP"
  | "EUR";

export type GrowthDirection =
  | "up"
  | "down"
  | "neutral";

export interface Growth {
  value: number;
  percentage: number;
  direction: GrowthDirection;
  label: string;
}

export interface MonetizationDashboard {
  currency: MonetizationCurrency;

  totalEarnings: number;
  availableBalance: number;
  pendingBalance: number;
  lifetimeEarnings: number;
  withdrawnAmount?: number;

  todayEarnings: number;
  todayGrowth: number;

  weeklyEarnings: number;
  weeklyGrowth: number;

  monthlyEarnings: number;
  monthlyGrowth: number;

  totalViews: number;
  monetizedViews: number;

  averageRpm: number;

  lastUpdated: string;

  // Dashboard overview data
  periodLabel?: string;

  previousPeriodEarnings?: number;

  completedTransactions?: number;

  pendingTransactions?: number;

  // Dashboard sections
  revenueSources?: RevenueSource[];

  audienceRewards?: AudienceReward[];

  topContent?: MonetizedContent[];

  payouts?: Payout[];

  insights?: MonetizationInsight[];

  goal?: CreatorGoal | null;
}

export interface EarningsOverview {
  totalEarnings: number;
  availableBalance: number;
  pendingBalance: number;
  lifetimeEarnings: number;

  totalEarningsGrowth: number;
  availableBalanceGrowth: number;
  monthlyGrowth: number;

  currency: MonetizationCurrency;
}

export type RevenuePeriod =
  | "1d"
  | "7d"
  | "30d"
  | "3m"
  | "6m"
  | "1y"
  | "all";

export type ChartMetric =
  | "revenue"
  | "views"
  | "rpm"
  | "engagement";

export interface RevenueChartPoint {
  date: string;
  value: number;
  amount: number;
  revenue?: number;
  views?: number;
  rpm?: number;
  engagement?: number;
}

export interface RevenueChartResponse {
  currency: MonetizationCurrency;
  period: RevenuePeriod;
  metric: ChartMetric;
  data: RevenueChartPoint[];

  total: number;
  average: number;
  highest: number;
  lowest: number;

  growth: number;
}

export type RevenueSourceKey =
  | "ads"
  | "subscriptions"
  | "tips"
  | "tribe_premium"
  | "gifts"
  | "sponsored_posts"
  | "affiliate"
  | "marketplace";

export interface RevenueSource {
  id?: string;

  key: RevenueSourceKey;
  name: string;
  description?: string;

  amount: number;
  percentage: number;

  previousAmount?: number;
  growth: number;

  currency: MonetizationCurrency;

  enabled: boolean;

  chart?: RevenueChartPoint[];
}

export interface Wallet {
  id?: string;

  currency: MonetizationCurrency;

  availableBalance: number;
  pendingBalance: number;

  lifetimeEarnings: number;
  totalWithdrawn: number;

  minimumWithdrawal: number;

  lastPayout?: Payout | null;

  updatedAt: string;
}

export interface BankAccount {
  id: string;

  bankName: string;

  /**
   * Usually masked by the backend.
   * Example: "****1234"
   */
  accountNumber: string;

  accountName: string;

  bankCode?: string;

  isDefault: boolean;

  verified: boolean;
}

export interface WithdrawalRequest {
  amount: number;
  bankAccountId: string;
}

export interface WithdrawalResponse {
  success: boolean;

  message: string;

  transaction?: Transaction;

  payout?: Payout;

  newAvailableBalance?: number;
}

export type TransactionStatus =
  | "completed"
  | "pending"
  | "processing"
  | "failed"
  | "cancelled";

export type TransactionType =
  | "earning"
  | "withdrawal"
  | "refund"
  | "adjustment"
  | "bonus";

export interface Transaction {
  id: string;

  reference: string;

  type: TransactionType;

  source?: RevenueSourceKey;

  description: string;

  amount: number;

  fee?: number;

  netAmount?: number;

  currency: MonetizationCurrency;

  status: TransactionStatus;

  createdAt: string;

  completedAt?: string | null;

  metadata?: Record<string, unknown>;
}

export interface TransactionsResponse {
  results: Transaction[];

  count: number;

  next?: string | null;

  previous?: string | null;
}

export type PayoutStatus =
  | "completed"
  | "pending"
  | "processing"
  | "failed";

export interface Payout {
  id: string;

  reference: string;

  amount: number;

  fee?: number;

  netAmount?: number;

  currency: MonetizationCurrency;

  status: PayoutStatus;

  bankAccount?: BankAccount | null;

  createdAt: string;

  processedAt?: string | null;

  estimatedArrival?: string | null;
}

export interface PayoutsResponse {
  results: Payout[];

  count: number;

  next?: string | null;

  previous?: string | null;
}

export type MonetizableContentType =
  | "post"
  | "reel"
  | "video"
  | "article"
  | "community";

export interface MonetizedContent {
  id: string;

  type: MonetizableContentType;

  title?: string | null;

  caption?: string | null;

  thumbnailUrl?: string | null;

  createdAt: string;

  views: number;

  likes: number;

  comments: number;

  shares: number;

  engagementRate: number;

  revenue: number;

  rpm: number;

  currency: MonetizationCurrency;

  growth?: number;
}

export interface TopContentResponse {
  results: MonetizedContent[];

  total: number;
}

export type AudienceRewardType =
  | "tip"
  | "gift"
  | "paid_like"
  | "subscription"
  | "coin";

export interface AudienceReward {
  id: string;

  type: AudienceRewardType;

  label: string;

  amount: number;

  count: number;

  percentage: number;

  growth: number;
  createdAt: string;
  description: string;

  currency: MonetizationCurrency;
}

export type GoalPeriod =
  | "monthly"
  | "quarterly"
  | "yearly";

export interface CreatorGoal {
  id: string;

  title: string;

  period: GoalPeriod;

  target: number;

  current: number;

  percentage: number;

  currency: MonetizationCurrency;

  startDate: string;

  endDate: string;

  completed: boolean;
}

export type InsightType =
  | "best_posting_time"
  | "highest_paying_tribe"
  | "best_content_type"
  | "best_rpm"
  | "highest_engagement";

export interface MonetizationInsight {
  id: string;

  type: InsightType;

  title: string;

  description: string;

  value?: string | number | null;

  unit?: string | null;

  change?: number | null;

  createdAt?: string;
}

export interface InsightsResponse {
  insights: MonetizationInsight[];
}

export interface TribeMonetization {
  id: string;

  name: string;

  avatarUrl?: string | null;

  members: number;

  views: number;

  engagementRate: number;

  revenue: number;

  rpm: number;

  growth: number;

  currency: MonetizationCurrency;
}

export interface CreatorAnalytics {
  views: number;

  uniqueViewers: number;

  engagementRate: number;

  likes: number;

  comments: number;

  shares: number;

  subscribers: number;

  newSubscribers: number;

  rpm: number;

  revenue: number;

  revenueGrowth: number;

  currency: MonetizationCurrency;
}

export interface MonetizationSettings {
  monetizationEnabled: boolean;

  adsEnabled: boolean;

  subscriptionsEnabled: boolean;

  tipsEnabled: boolean;

  giftsEnabled: boolean;

  sponsoredPostsEnabled: boolean;

  affiliateEnabled: boolean;

  marketplaceEnabled: boolean;

  payoutCurrency: MonetizationCurrency;

  minimumWithdrawal: number;
}

export interface MonetizationDashboardResponse {
  dashboard: MonetizationDashboard;
  earnings: EarningsOverview;

  wallet: Wallet;

  revenueSources: RevenueSource[];

  chart: RevenueChartResponse;

  topContent: MonetizedContent[];

  audienceRewards: AudienceReward[];

  goal: CreatorGoal | null;

  insights: MonetizationInsight[];

  settings?: MonetizationSettings;
}

export interface MonetizationApiError {
  detail?: string;

  message?: string;

  code?: string;

  errors?: Record<string, string[]>;
}

export interface MonetizationLoadingState {
  dashboard: boolean;
  chart: boolean;
  wallet: boolean;
  transactions: boolean;
  payouts: boolean;
  topContent: boolean;
  insights: boolean;
  withdrawal: boolean;
}

export interface MonetizationErrorState {
  dashboard: string | null;
  chart: string | null;
  wallet: string | null;
  transactions: string | null;
  payouts: string | null;
  topContent: string | null;
  insights: string | null;
  withdrawal: string | null;
}

export interface PaginationMeta {
  count: number;

  next: string | null;

  previous: string | null;
}

export interface MonetizationListResponse<T>
  extends PaginationMeta {
  results: T[];
}