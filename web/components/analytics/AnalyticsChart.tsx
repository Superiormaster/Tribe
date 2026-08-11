"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { motion } from "framer-motion";

import AnalyticsTooltip from "./AnalyticsTooltip";

import { ChartPoint, ChartType } from "@/hooks/analytics/types";

interface AnalyticsChartProps {
  data: ChartPoint[];
  type?: ChartType;
  color?: string;
  height?: number;
  loading?: boolean;
  formatter?: (value: number) => string;
}

export default function AnalyticsChart({
  data,
  type = "line",
  color = "#3B82F6",
  height = 340,
  loading = false,
  formatter = (value) =>
    new Intl.NumberFormat("en", {
      notation: "compact",
    }).format(value),
}: AnalyticsChartProps) {
  if (loading) {
    return (
      <div className="h-[340px] animate-pulse rounded-3xl bg-white/5" />
    );
  }

  return (
    <motion.section
      initial={{
        opacity: 0,
        y: 20,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: .35,
      }}
      className="rounded-3xl border border-white/10 bg-background/70 p-6 backdrop-blur-xl"
    >
      <ResponsiveContainer
        width="100%"
        height={height}
      >
        {type === "line" ? (
          <LineChart data={data}>
            <CartesianGrid
              strokeDasharray="4 4"
              stroke="rgba(255,255,255,.08)"
            />

            <XAxis
              dataKey="label"
              tick={{
                fill: "#9CA3AF",
                fontSize: 12,
              }}
              axisLine={false}
              tickLine={false}
            />

            <YAxis
              tickFormatter={formatter}
              tick={{
                fill: "#9CA3AF",
                fontSize: 12,
              }}
              axisLine={false}
              tickLine={false}
            />

            <Tooltip
              content={<AnalyticsTooltip />}
            />

            <Line
              dataKey="value"
              stroke={color}
              strokeWidth={3}
              dot={false}
              activeDot={{
                r: 6,
              }}
            />
          </LineChart>
        ) : type === "bar" ? (
          <BarChart data={data}>
            <CartesianGrid
              strokeDasharray="4 4"
              stroke="rgba(255,255,255,.08)"
            />

            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{
                fill: "#9CA3AF",
              }}
            />

            <YAxis
              tickFormatter={formatter}
              axisLine={false}
              tickLine={false}
              tick={{
                fill: "#9CA3AF",
              }}
            />

            <Tooltip
              content={<AnalyticsTooltip />}
            />

            <Bar
              dataKey="value"
              fill={color}
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        ) : (
          <AreaChart data={data}>
            <defs>
              <linearGradient
                id="tribeArea"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor={color}
                  stopOpacity={0.4}
                />

                <stop
                  offset="95%"
                  stopColor={color}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="4 4"
              stroke="rgba(255,255,255,.08)"
            />

            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{
                fill: "#9CA3AF",
              }}
            />

            <YAxis
              tickFormatter={formatter}
              axisLine={false}
              tickLine={false}
              tick={{
                fill: "#9CA3AF",
              }}
            />

            <Tooltip
              content={<AnalyticsTooltip />}
            />

            <Area
              dataKey="value"
              stroke={color}
              strokeWidth={3}
              fill="url(#tribeArea)"
            />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </motion.section>
  );
}