"use client";

import AnalyticsHeader from "@/components/analytics/AnalyticsHeader";
import AnalyticsTabs from "@/components/analytics/AnalyticsTabs";
import DateRangeSelector from "@/components/analytics/DateRangeSelector";
import AnalyticsFilters from "@/components/analytics/AnalyticsFilters";
import AnalyticsChart from "@/components/analytics/AnalyticsChart";
import MetricGrid from "@/components/analytics/MetricGrid";
import MediaActivity from "@/components/analytics/MediaActivity";
import AudienceSection from "@/components/analytics/AudienceSection";
import { useState } from "react";
import { AnalyticsTab } from "@/hooks/analytics/types";
import TopPosts from "@/components/analytics/TopPosts";
import ReelsAnalytics from "@/components/analytics/ReelsAnalytics";
import CommunityAnalytics from "@/components/analytics/CommunityAnalytics";
import Loading from "@/components/analytics/loading";

import useAnalytics from "@/hooks/analytics/useAnalytics";
import { mockAnalytics } from "@/hooks/analytics/mockAnalytics";
import useChart from "@/hooks/analytics/useChart";
import useDateRange from "@/hooks/analytics/useDateRange";

export default function AnalyticsPage() {
  const [tab, setTab] = useState<AnalyticsTab>("overview");
  const dateRange = useDateRange();

  const chart = useChart();

  {/*const {
    analytics,
    isLoading,
    isFetching,
    refresh,
  } = useAnalytics({
    range: dateRange.range,
    metric: chart.metric,
    chartType: chart.chartType,
    interval: chart.interval,
  });*/}
  const analytics = mockAnalytics;
  const isLoading = false;
  const isFetching = false;
  
  const refresh = () => {};
  
  const handleExport = () => {
    console.log("Export analytics");
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <main className="relative min-h-screen my-20 space-y-2 bg-background dark:text-gray-300 text-gray-700">
      {/* Animated Background */}

      <AnalyticsHeader
        loading={isFetching}
        onRefresh={refresh}
        onExport={handleExport}
      />

      {/* Analytics Tabs */}
      <AnalyticsTabs
        value={tab}
        onChange={setTab}
      />

      {/* Date Range */}
      <DateRangeSelector
        value={dateRange.range}
        onChange={dateRange.setRange}
      />

      {/* Analytics Filters */}
      <AnalyticsFilters
        metric={chart.metric}
        chartType={chart.chartType}
        interval={chart.interval}
        onMetricChange={chart.setMetric}
        onChartTypeChange={chart.setChartType}
        onIntervalChange={chart.setInterval}
      />

      {/* Analytics Chart */}
      <AnalyticsChart
          data={analytics.chart.data}
          type={chart.chartType}
      />

      {/* Metric Grid */}
      <MetricGrid
        metrics={[
          analytics.summary.impressions,
          analytics.summary.engagement,
          analytics.summary.stars,
          analytics.summary.profileViews,
          analytics.summary.likes,
          analytics.summary.comments,
          analytics.summary.shares,
          analytics.summary.bookmarks,
        ]}
      />

      {/* Media Activity */}
      <MediaActivity
          posts={482}
          reels={164}
          photos={278}
          videos={89}
          postGrowth={18}
          reelGrowth={36}
          photoGrowth={12}
          videoGrowth={-4}
      />

      {/* Audience */}
      <AudienceSection
          stars={12850}
          newStars={846}
          lostStars={73}
          activeStars={9720}
          growth={12.8}
      />

      {/* Top Posts */}
      <TopPosts
        posts={[
          {
            id: "1",
            title: "Barcelona complete stunning comeback against Real Madrid",
            thumbnail: "/images/post1.jpg",
            impressions: 582000,
            likes: 25400,
            comments: 3400,
            reposts: 2100,
            bookmarks: 970,
            engagementRate: 8.4,
          },
          {
            id: "2",
            title: "Top 10 Premier League transfers this summer",
            thumbnail: "/images/post2.jpg",
            impressions: 401000,
            likes: 18400,
            comments: 1800,
            reposts: 1200,
            bookmarks: 760,
            engagementRate: 7.2,
          },
        ]}
      />

      {/* Reels Analytics */}
      <ReelsAnalytics
        totalReels={164}
        totalViews={2850000}
        totalWatchTime={48320}
        averageWatchTime={27.4}
        completionRate={74.8}
        growth={18.6}
      />

      {/* Community Analytics */}
      <CommunityAnalytics
        communities={[
          {
            id: "1",
            name: "Football Fans",
            members: 18450,
            activeMembers: 12280,
            posts: 843,
            engagement: 18.6,
          },
          {
            id: "2",
            name: "Tech Tribe",
            members: 9340,
            activeMembers: 6180,
            posts: 512,
            engagement: 12.4,
          },
          {
            id: "3",
            name: "Entertainment",
            members: 22100,
            activeMembers: 16400,
            posts: 1350,
            engagement: 24.1,
          },
        ]}
      />
    </main>
  );
}
