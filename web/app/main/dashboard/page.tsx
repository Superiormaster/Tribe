"use client";

import { useState } from "react";

import AnalyticsHeader from "@/components/analytics/AnalyticsHeader";
import AnalyticsTabs from "@/components/analytics/AnalyticsTabs";
import DateRangeSelector from "@/components/analytics/DateRangeSelector";
import AnalyticsFilters from "@/components/analytics/AnalyticsFilters";
import AnalyticsChart from "@/components/analytics/AnalyticsChart";
import MetricGrid from "@/components/analytics/MetricGrid";
import MediaActivity from "@/components/analytics/MediaActivity";
import AudienceSection from "@/components/analytics/AudienceSection";
import TopPosts from "@/components/analytics/TopPosts";
import ReelsAnalytics from "@/components/analytics/ReelsAnalytics";
import CommunityAnalytics from "@/components/analytics/CommunityAnalytics";
import Loading from "@/components/analytics/loading";

import { AnalyticsTab } from "@/hooks/analytics/types";

import useAnalytics from "@/hooks/analytics/useAnalytics";
import useChart from "@/hooks/analytics/useChart";
import useDateRange from "@/hooks/analytics/useDateRange";

export default function AnalyticsPage() {
  const [tab, setTab] = useState<AnalyticsTab>("overview");

  const dateRange = useDateRange();

  const chart = useChart();

  const {
    analytics,
    isLoading,
    isFetching,
    isError,
    refresh,
  } = useAnalytics({
    range: dateRange.range,
    tab,
    metric: chart.metric,
    chartType: chart.chartType,
    interval: chart.interval,
  });
  console.log("ANALYTICS RESPONSE:", analytics);

  if (isLoading) {
    return <Loading />;
  }
  
  if (isError || !analytics) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
  
          <h2 className="text-xl text-gray-800 dark:text-gray-200 font-semibold">
            Unable to load analytics
          </h2>
  
          <p className="text-sm text-gray-500 mt-2">
            Please try again.
          </p>
  
          <button
            onClick={refresh}
            disabled={isFetching}
            className="
              mt-4
              px-4
              py-2
              rounded-lg
              text-gray-700
              dark:text-gray-200
              bg-gray-300
              dark:bg-gray-950
              disabled:opacity-50
            "
          >
            {isFetching ? "Retrying..." : "Retry"}
          </button>
  
        </div>
      </main>
    );
  }
  
  if (!analytics.summary || !analytics.chart) {
    console.error(
      "❌ Invalid analytics response:",
      analytics
    );
  
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">
          Analytics response is incomplete.
        </p>
      </main>
    );
  }
  
  const summary = analytics.summary;

  return (
    <main
      className="
        relative
        min-h-screen
        py-3
        px-2
        mt-14
        space-y-2
        dark:bg-gray-900
        bg-gray-200
        dark:text-gray-300
        text-gray-700
      "
    >
      <AnalyticsHeader
        loading={isFetching}
        onRefresh={refresh}
      />

      <AnalyticsTabs
        value={tab}
        onChange={setTab}
      />

      <DateRangeSelector
        value={dateRange.range}
        onChange={dateRange.setRange}
      />

      <AnalyticsFilters
        metric={chart.metric}
        chartType={chart.chartType}
        interval={chart.interval}
        onMetricChange={chart.setMetric}
        onChartTypeChange={chart.setChartType}
        onIntervalChange={chart.setInterval}
      />

      {/* Chart */}

      <AnalyticsChart
        data={analytics.chart.data}
        type={chart.chartType}
      />

      {/* Summary Metrics */}
      {tab === "overview" && (
        <>
          <MetricGrid
            metrics={[
              summary.impressions,
              summary.engagement,
              summary.stars,
              summary.profileViews,
              summary.likes,
              summary.comments,
              summary.shares,
              summary.bookmarks,
            ].filter(Boolean)}
          />
      
          {analytics.content?.mediaActivity && (
            <MediaActivity
              posts={analytics.content.mediaActivity.posts}
              reels={analytics.content.mediaActivity.reels}
              photos={analytics.content.mediaActivity.photos}
              videos={analytics.content.mediaActivity.videos}
              postGrowth={analytics.content.mediaActivity.postGrowth}
              reelGrowth={analytics.content.mediaActivity.reelGrowth}
              photoGrowth={analytics.content.mediaActivity.photoGrowth}
              videoGrowth={analytics.content.mediaActivity.videoGrowth}
            />
          )}
      
          {analytics.audience && (
            <AudienceSection
              stars={analytics.audience.stars}
              newStars={analytics.audience.newStars}
              lostStars={analytics.audience.lostStars}
              activeStars={analytics.audience.activeStars}
              growth={analytics.audience.growth}
            />
          )}
      
          {analytics.topPosts && (
            <TopPosts posts={analytics.topPosts} />
          )}
      
          {analytics.reels && (
            <ReelsAnalytics
              totalReels={analytics.reels.totalReels}
              totalViews={analytics.reels.totalViews}
              totalWatchTime={analytics.reels.totalWatchTime}
              averageWatchTime={analytics.reels.averageWatchTime}
              completionRate={analytics.reels.completionRate}
              growth={analytics.reels.growth}
            />
          )}
      
          {analytics.communities && (
            <CommunityAnalytics
              communities={analytics.communities}
            />
          )}
        </>
      )}
      
      {tab === "content" && (
        <>
          {analytics.content?.mediaActivity && (
            <MediaActivity
              posts={analytics.content.mediaActivity.posts}
              reels={analytics.content.mediaActivity.reels}
              photos={analytics.content.mediaActivity.photos}
              videos={analytics.content.mediaActivity.videos}
              postGrowth={analytics.content.mediaActivity.postGrowth}
              reelGrowth={analytics.content.mediaActivity.reelGrowth}
              photoGrowth={analytics.content.mediaActivity.photoGrowth}
              videoGrowth={analytics.content.mediaActivity.videoGrowth}
            />
          )}
      
          {analytics.topPosts && (
            <TopPosts posts={analytics.topPosts} />
          )}
      
          {analytics.reels && (
            <ReelsAnalytics
              totalReels={analytics.reels.totalReels}
              totalViews={analytics.reels.totalViews}
              totalWatchTime={analytics.reels.totalWatchTime}
              averageWatchTime={analytics.reels.averageWatchTime}
              completionRate={analytics.reels.completionRate}
              growth={analytics.reels.growth}
            />
          )}
        </>
      )}
  
      {tab === "communities" && (
        <>
          {analytics.communities && (
            <CommunityAnalytics
              communities={analytics.communities}
            />
          )}
        </>
      )}
  
      {tab === "audience" && (
        <>
          {analytics.audience && (
            <AudienceSection
              stars={analytics.audience.stars}
              newStars={analytics.audience.newStars}
              lostStars={analytics.audience.lostStars}
              activeStars={analytics.audience.activeStars}
              growth={analytics.audience.growth}
            />
          )}
        </>
      )}
    </main>
  );
}