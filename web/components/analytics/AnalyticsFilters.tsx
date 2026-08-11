"use client";

import { motion } from "framer-motion";
import { BarChart3, CalendarDays, LineChart } from "lucide-react";

import {
  CHART_TYPES,
  INTERVAL_OPTIONS,
  METRIC_OPTIONS,
} from "@/hooks/analytics/constants";

import {
  ChartType,
  Interval,
  MetricType,
} from "@/hooks/analytics/types";

interface AnalyticsFiltersProps {
  metric: MetricType;
  chartType: ChartType;
  interval: Interval;

  onMetricChange: (metric: MetricType) => void;
  onChartTypeChange: (type: ChartType) => void;
  onIntervalChange: (interval: Interval) => void;
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) =>
        onChange(e.target.value)
      }
      className="
        h-11
        w-full
        rounded-xl
        border
        border-white/10
        bg-white/5
        px-4
        text-sm
        outline-none
        backdrop-blur-md
        transition
        focus:border-primary
      "
    >
      {children}
    </select>
  );
}

export default function AnalyticsFilters({
  metric,
  chartType,
  interval,
  onMetricChange,
  onChartTypeChange,
  onIntervalChange,
}: AnalyticsFiltersProps) {
  return (
    <motion.section
      initial={{
        opacity: 0,
        y: 15,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: .35,
      }}
      className="
        rounded-3xl
        border
        border-white/10
        bg-background/70
        p-5
        backdrop-blur-xl
      "
    >
      <div className="grid gap-4 md:grid-cols-3">

        {/* Metric */}

        <div className="space-y-2">

          <label className="flex items-center gap-2 text-sm font-medium">

            <BarChart3
              size={16}
              className="text-primary"
            />

            Metric

          </label>

          <Select
            value={metric}
            onChange={(value) =>
              onMetricChange(
                value as MetricType
              )
            }
          >
            {METRIC_OPTIONS.map(
              (item) => (
                <option
                  key={item.value}
                  value={item.value}
                >
                  {item.label}
                </option>
              )
            )}
          </Select>

        </div>

        {/* Chart */}

        <div className="space-y-2">

          <label className="flex items-center gap-2 text-sm font-medium">

            <LineChart
              size={16}
              className="text-primary"
            />

            Chart Type

          </label>

          <Select
            value={chartType}
            onChange={(value) =>
              onChartTypeChange(
                value as ChartType
              )
            }
          >
            {CHART_TYPES.map(
              (item) => (
                <option
                  key={item.value}
                  value={item.value}
                >
                  {item.label}
                </option>
              )
            )}
          </Select>

        </div>

        {/* Interval */}

        <div className="space-y-2">

          <label className="flex items-center gap-2 text-sm font-medium">

            <CalendarDays
              size={16}
              className="text-primary"
            />

            Interval

          </label>

          <Select
            value={interval}
            onChange={(value) =>
              onIntervalChange(
                value as Interval
              )
            }
          >
            {INTERVAL_OPTIONS.map(
              (item) => (
                <option
                  key={item.value}
                  value={item.value}
                >
                  {item.label}
                </option>
              )
            )}
          </Select>

        </div>

      </div>
    </motion.section>
  );
}