import { apiRequest } from "@/utils/api";

import {
  MONETIZATION_ENDPOINTS,
  DEFAULT_REVENUE_PERIOD,
  DEFAULT_CHART_METRIC,
  TRANSACTIONS_PAGE_SIZE,
  PAYOUTS_PAGE_SIZE,
  TOP_CONTENT_LIMIT,
} from "@/utils/monetization/constants/monetization";

import type {
  MonetizationDashboardResponse,
  RevenueChartResponse,
  RevenuePeriod,
  ChartMetric,
  RevenueSource,
  MonetizedContent,
  Wallet,
  Transaction,
  TransactionsResponse,
  Payout,
  PayoutsResponse,
  CreatorGoal,
  MonetizationInsight,
  InsightsResponse,
  WithdrawalRequest,
  WithdrawalResponse,
  BankAccount,
  MonetizationSettings,
} from "@/utils/monetization/types/monetization";

type ApiResponse<T> = {
  ok: boolean;
  data?: T;
  error?: unknown;
};

async function request<T>(
  endpoint: string,
  options?: {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    data?: unknown;
  }
): Promise<T> {
  const response = await apiRequest(endpoint, {
    method: options?.method ?? "GET",
    ...(options?.data !== undefined
      ? { data: options.data }
      : {}),
  });

  if (!response.ok) {
    let message = "Unable to complete monetization request.";

    try {
      const errorData = await response.json();

      if (typeof errorData?.detail === "string") {
        message = errorData.detail;
      } else if (typeof errorData?.message === "string") {
        message = errorData.message;
      }
    } catch {
      // Keep the default error message.
    }

    throw new Error(message);
  }

  return response.json();
}

export async function getMonetizationDashboard(): Promise<MonetizationDashboardResponse> {
  return request<MonetizationDashboardResponse>(
    MONETIZATION_ENDPOINTS.dashboard
  );
}

export interface RevenueChartParams {
  period?: RevenuePeriod;
  metric?: ChartMetric;
}

export async function getRevenueChart(
  params: RevenueChartParams = {}
): Promise<RevenueChartResponse> {
  const period = params.period ?? DEFAULT_REVENUE_PERIOD;
  const metric = params.metric ?? DEFAULT_CHART_METRIC;

  const query = new URLSearchParams({
    period,
    metric,
  });

  return request<RevenueChartResponse>(
    `${MONETIZATION_ENDPOINTS.chart}?${query.toString()}`
  );
}

export async function getRevenueSources(): Promise<RevenueSource[]> {
  const response = await request<
    RevenueSource[] | { results: RevenueSource[] }
  >(MONETIZATION_ENDPOINTS.revenueSources);

  return Array.isArray(response)
    ? response
    : response.results;
}

export interface TopContentParams {
  limit?: number;
  type?: string;
}

export async function getTopContent(
  params: TopContentParams = {}
): Promise<MonetizedContent[]> {
  const query = new URLSearchParams({
    limit: String(params.limit ?? TOP_CONTENT_LIMIT),
  });

  if (params.type) {
    query.set("type", params.type);
  }

  const response = await request<
    MonetizedContent[] | { results: MonetizedContent[] }
  >(
    `${MONETIZATION_ENDPOINTS.topContent}?${query.toString()}`
  );

  return Array.isArray(response)
    ? response
    : response.results;
}

/* -------------------------------------------------------------------------- */
/* Wallet                                                                      */
/* -------------------------------------------------------------------------- */

export async function getWallet(): Promise<Wallet> {
  return request<Wallet>(MONETIZATION_ENDPOINTS.wallet);
}

/* -------------------------------------------------------------------------- */
/* Transactions                                                                */
/* -------------------------------------------------------------------------- */

export interface TransactionParams {
  page?: number;
  pageSize?: number;
  status?: string;
  type?: string;
  source?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export async function getTransactions(
  params: TransactionParams = {}
): Promise<TransactionsResponse> {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    page_size: String(
      params.pageSize ?? TRANSACTIONS_PAGE_SIZE
    ),
  });

  if (params.status) {
    query.set("status", params.status);
  }

  if (params.type) {
    query.set("type", params.type);
  }

  if (params.source) {
    query.set("source", params.source);
  }

  if (params.search) {
    query.set("search", params.search);
  }

  if (params.startDate) {
    query.set("start_date", params.startDate);
  }

  if (params.endDate) {
    query.set("end_date", params.endDate);
  }

  return request<TransactionsResponse>(
    `${MONETIZATION_ENDPOINTS.transactions}?${query.toString()}`
  );
}

/* -------------------------------------------------------------------------- */
/* Single Transaction                                                          */
/* -------------------------------------------------------------------------- */

export async function getTransaction(
  transactionId: string
): Promise<Transaction> {
  return request<Transaction>(
    `${MONETIZATION_ENDPOINTS.transactions}${transactionId}/`
  );
}

export interface PayoutParams {
  page?: number;
  pageSize?: number;
  status?: string;
}

export async function getPayouts(
  params: PayoutParams = {}
): Promise<PayoutsResponse> {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    page_size: String(
      params.pageSize ?? PAYOUTS_PAGE_SIZE
    ),
  });

  if (params.status) {
    query.set("status", params.status);
  }

  return request<PayoutsResponse>(
    `${MONETIZATION_ENDPOINTS.payouts}?${query.toString()}`
  );
}

export async function getPayout(
  payoutId: string
): Promise<Payout> {
  return request<Payout>(
    `${MONETIZATION_ENDPOINTS.payouts}${payoutId}/`
  );
}

export async function withdraw(
  payload: WithdrawalRequest
): Promise<WithdrawalResponse> {
  return request<WithdrawalResponse>(
    MONETIZATION_ENDPOINTS.withdraw,
    {
      method: "POST",
      data: payload,
    }
  );
}

export async function getBankAccounts(): Promise<BankAccount[]> {
  const response = await request<
    BankAccount[] | { results: BankAccount[] }
  >("/api/payments/bank-accounts/");

  return Array.isArray(response)
    ? response
    : response.results;
}

export async function getCreatorGoal(): Promise<CreatorGoal | null> {
  return request<CreatorGoal | null>(
    MONETIZATION_ENDPOINTS.goals
  );
}

export async function getMonetizationInsights(): Promise<MonetizationInsight[]> {
  const response = await request<
    MonetizationInsight[] | InsightsResponse
  >(MONETIZATION_ENDPOINTS.insights);

  if (Array.isArray(response)) {
    return response;
  }

  return response.insights;
}

export async function getMonetizationSettings(): Promise<MonetizationSettings> {
  return request<MonetizationSettings>(
    "/api/monetization/settings/"
  );
}

export async function updateMonetizationSettings(
  data: Partial<MonetizationSettings>
): Promise<MonetizationSettings> {
  return request<MonetizationSettings>(
    "/api/monetization/settings/",
    {
      method: "PATCH",
      data,
    }
  );
}

export async function getMonetizationOverview() {
  const [
    dashboard,
    wallet,
    revenueSources,
    chart,
    topContent,
    goal,
    insights,
  ] = await Promise.all([
    getMonetizationDashboard(),
    getWallet(),
    getRevenueSources(),
    getRevenueChart(),
    getTopContent(),
    getCreatorGoal(),
    getMonetizationInsights(),
  ]);

  return {
    dashboard,
    wallet,
    revenueSources,
    chart,
    topContent,
    goal,
    insights,
  };
}