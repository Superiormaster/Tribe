import { useCallback, useEffect, useState } from "react";

import { getMonetizationOverview } from "@/utils/monetization/services/monetization";

import type {
MonetizationDashboardResponse,
MonetizationDashboard,
Wallet,
RevenueSource,
RevenueChartResponse,
MonetizedContent,
AudienceReward,
CreatorGoal,
MonetizationInsight,
} from "@/utils/monetization/types/monetization";

interface UseMonetizationReturn {
dashboard: MonetizationDashboard | null;
wallet: Wallet | null;

revenueSources: RevenueSource[];
chart: RevenueChartResponse | null;
topContent: MonetizedContent[];
audienceRewards: AudienceReward[];

goal: CreatorGoal | null;
insights: MonetizationInsight[];

loading: boolean;
refreshing: boolean;
error: string | null;

refresh: () => Promise<void>;
clearError: () => void;
}

export function useMonetization(): UseMonetizationReturn {
const [dashboard, setDashboard] =
useState<MonetizationDashboard | null>(null);

const [wallet, setWallet] =
useState<Wallet | null>(null);

const [revenueSources, setRevenueSources] = useState<
RevenueSource[]

«([]);»

const [chart, setChart] =
useState<RevenueChartResponse | null>(null);

const [topContent, setTopContent] = useState<
MonetizedContent[]

«([]);»

const [audienceRewards, setAudienceRewards] = useState<
AudienceReward[]

«([]);»

const [goal, setGoal] =
useState<CreatorGoal | null>(null);

const [insights, setInsights] = useState<
MonetizationInsight[]

«([]);»

const [loading, setLoading] = useState(true);
const [refreshing, setRefreshing] = useState(false);

const [error, setError] = useState<string | null>(null);

const loadMonetization = useCallback(
async (isRefresh = false) => {
if (isRefresh) {
setRefreshing(true);
} else {
setLoading(true);
}

  setError(null);

  try {
    const response: Awaited<
      ReturnType<typeof getMonetizationOverview>
    > = await getMonetizationOverview();

    setDashboard(response.dashboard.dashboard);

    setWallet(response.wallet);

    setRevenueSources(
      response.revenueSources ?? []
    );

    setChart(response.chart);

    setTopContent(
      response.topContent ?? []
    );

    /*
     * The overview endpoint may not return
     * audience rewards depending on the backend
     * response. Keep this safe.
     */
    setAudienceRewards(
      response.dashboard.audienceRewards ?? []
    );

    setGoal(response.goal);

    setInsights(
      response.insights ?? []
    );
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Unable to load monetization data.";

    setError(message);
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
},
[]

);

/**

* Initial dashboard load.
  */
  useEffect(() => {
  void loadMonetization();
  }, [loadMonetization]);

/**

* Manually refresh all monetization data.
  */
  const refresh = useCallback(async () => {
  await loadMonetization(true);
  }, [loadMonetization]);

const clearError = useCallback(() => {
setError(null);
}, []);

return {
dashboard,
wallet,

revenueSources,
chart,
topContent,
audienceRewards,

goal,
insights,

loading,
refreshing,
error,

refresh,
clearError,

};
}

export default useMonetization;