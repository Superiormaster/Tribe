"use client";

import {
  BarChart3,
  ChevronDown,
  Loader2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  useMemo,
  useState,
} from "react";

import { formatCurrency } from "@/utils/monetization/formatCurrency";
import type {
  RevenueChartPoint,
  MonetizationCurrency,
  RevenuePeriod,
  ChartMetric,
} from "@/utils/monetization/types/monetization";

export interface RevenueChartProps {
  data: RevenueChartPoint[];

  currency?: MonetizationCurrency;

  title?: string;
  subtitle?: string;

  loading?: boolean;
  error?: string | null;

  period?: RevenuePeriod;
  onPeriodChange?: (
    period: RevenuePeriod
  ) => void;
  
  onRetry?: () => void | Promise<void>;

  metric?: ChartMetric;
  onMetricChange?: (
    metric: ChartMetric
  ) => void;

  showSummary?: boolean;
  showTooltip?: boolean;

  className?: string;
}

const PERIODS = [
  { value: "1d", label: "1 day" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "3m", label: "3 months" },
  { value: "6m", label: "6 months" },
  { value: "1y", label: "1 year" },
  { value: "all", label: "All time" },
] as const;

function formatShortDate(
  date: string,
  period: RevenueChartProps["period"]
) {
  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  if (period === "1y") {
    return new Intl.DateTimeFormat(
      "en-NG",
      {
        month: "short",
      }
    ).format(parsed);
  }

  return new Intl.DateTimeFormat(
    "en-NG",
    {
      day: "numeric",
      month: "short",
    }
  ).format(parsed);
}

function formatTooltipDate(date: string) {
  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat(
    "en-NG",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  ).format(parsed);
}

function getNiceStep(
  maxValue: number
) {
  if (maxValue <= 0) {
    return 1;
  }

  const roughStep = maxValue / 4;
  const magnitude =
    10 **
    Math.floor(
      Math.log10(roughStep)
    );

  const normalized =
    roughStep / magnitude;

  let niceNormalized = 1;

  if (normalized <= 1) {
    niceNormalized = 1;
  } else if (normalized <= 2) {
    niceNormalized = 2;
  } else if (normalized <= 5) {
    niceNormalized = 5;
  } else {
    niceNormalized = 10;
  }

  return niceNormalized * magnitude;
}

function formatAxisValue(
  value: number,
  currency: string
) {
  const symbol =
    currency === "NGN"
      ? "₦"
      : currency === "USD"
        ? "$"
        : currency === "GBP"
          ? "£"
          : currency === "EUR"
            ? "€"
            : currency;

  if (Math.abs(value) >= 1_000_000) {
    return `${symbol}${(
      value / 1_000_000
    ).toFixed(
      value % 1_000_000 === 0 ? 0 : 1
    )}M`;
  }

  if (Math.abs(value) >= 1_000) {
    return `${symbol}${(
      value / 1_000
    ).toFixed(
      value % 1_000 === 0 ? 0 : 1
    )}K`;
  }

  return `${symbol}${Math.round(value)}`;
}

function ChartSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <div className="h-7 w-32 rounded bg-white/[0.07]" />
          <div className="mt-2 h-3 w-24 rounded bg-white/[0.05]" />
        </div>

        <div className="h-9 w-24 rounded-xl bg-white/[0.06]" />
      </div>

      <div className="h-[260px] rounded-xl bg-white/[0.025]" />
    </div>
  );
}

export default function RevenueChart({
  data,
  currency = "NGN",
  title = "Revenue",
  subtitle = "Your earnings over time",
  loading = false,
  error = null,
  period = "30d",
  onPeriodChange,
  metric = "revenue",
  onMetricChange,
  onRetry,
  showSummary = true,
  showTooltip = true,
  className = "",
}: RevenueChartProps) {
  const [internalPeriod, setInternalPeriod] =
    useState<RevenuePeriod>(
      period
    );

  const [hoveredIndex, setHoveredIndex] =
    useState<number | null>(null);

  const activePeriod =
    onPeriodChange
      ? period
      : internalPeriod;

  const handlePeriodChange = (
    value: RevenuePeriod
  ) => {
    setInternalPeriod(value);
    onPeriodChange?.(value);
  };

  const chartData = useMemo(() => {
    return data
      .map((item) => ({
        ...item,
        amount: Number(item.amount) || 0,
      }))
      .sort(
        (a, b) =>
          new Date(a.date).getTime() -
          new Date(b.date).getTime()
      );
  }, [data]);

  const summary = useMemo(() => {
    const total = chartData.reduce(
      (sum, item) => sum + item.amount,
      0
    );

    if (chartData.length < 2) {
      return {
        total,
        change: 0,
        positive: true,
      };
    }

    const midpoint = Math.floor(
      chartData.length / 2
    );

    const previous = chartData
      .slice(0, midpoint)
      .reduce(
        (sum, item) =>
          sum + item.amount,
        0
      );

    const current = chartData
      .slice(midpoint)
      .reduce(
        (sum, item) =>
          sum + item.amount,
        0
      );

    const change =
      previous === 0
        ? current > 0
          ? 100
          : 0
        : ((current - previous) /
            previous) *
          100;

    return {
      total,
      change,
      positive: change >= 0,
    };
  }, [chartData]);

  const chart = useMemo(() => {
    if (!chartData.length) {
      return {
        maxValue: 1,
        step: 1,
        points: "",
        areaPoints: "",
        coordinates: [],
        labels: [],
      };
    }

    const rawMax = Math.max(
      ...chartData.map(
        (item) => item.amount
      ),
      0
    );

    const step = getNiceStep(rawMax);

    const maxValue =
      Math.max(
        step * 4,
        Math.ceil(
          rawMax / step
        ) * step
      ) || 1;

    const width = 1000;
    const height = 300;

    const horizontalPadding = 25;
    const verticalPadding = 20;

    const graphWidth =
      width -
      horizontalPadding * 2;

    const graphHeight =
      height -
      verticalPadding * 2;

    const coordinates =
      chartData.map(
        (item, index) => {
          const x =
            chartData.length === 1
              ? width / 2
              : horizontalPadding +
                (index /
                  (chartData.length -
                    1)) *
                  graphWidth;

          const y =
            verticalPadding +
            graphHeight -
            (item.amount /
              maxValue) *
              graphHeight;

          return {
            x,
            y,
            item,
          };
        }
      );

    const points = coordinates
      .map(
        (point) =>
          `${point.x},${point.y}`
      )
      .join(" ");

    const first = coordinates[0];
    const last =
      coordinates[
        coordinates.length - 1
      ];

    const areaPoints = [
      `${first.x},${height - verticalPadding}`,
      ...coordinates.map(
        (point) =>
          `${point.x},${point.y}`
      ),
      `${last.x},${height - verticalPadding}`,
    ].join(" ");

    const labels =
      chartData.length <= 7
        ? chartData
        : chartData.filter(
            (_, index) => {
              const interval =
                Math.ceil(
                  chartData.length /
                    6
                );

              return (
                index === 0 ||
                index ===
                  chartData.length - 1 ||
                index % interval ===
                  0
              );
            }
          );

    return {
      maxValue,
      step,
      points,
      areaPoints,
      coordinates,
      labels,
    };
  }, [chartData]);

  if (loading) {
    return (
      <section
        className={[
          "w-full overflow-hidden rounded-2xl",
          "border border-white/[0.08]",
          "bg-[#121212]",
          "p-5",
          className,
        ].join(" ")}
      >
        <ChartSkeleton />
      </section>
    );
  }

  return (
    <section
      className={[
        "w-full overflow-hidden rounded-2xl",
        "border border-white/[0.08]",
        "bg-[#121212]",
        className,
      ].join(" ")}
    >
      {/* Header */}
      <div className="border-b border-white/[0.07] p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFD84D]/10">
                <BarChart3 className="h-4 w-4 text-[#FFD84D]" />
              </div>

              <div>
                <h2 className="text-base font-semibold text-white">
                  {title}
                </h2>

                <p className="mt-1 text-xs text-white/40">
                  {subtitle}
                </p>
              </div>
            </div>

            {showSummary &&
              !error &&
              chartData.length > 0 && (
                <div className="mt-5">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-white/30">
                    Total revenue
                  </p>

                  <div className="mt-1 flex flex-wrap items-center gap-3">
                    <p className="text-2xl font-bold tracking-tight text-white">
                      {formatCurrency(
                        summary.total,
                        currency
                      )}
                    </p>

                    <span
                      className={[
                        "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold",
                        summary.positive
                          ? "bg-emerald-400/10 text-emerald-400"
                          : "bg-red-400/10 text-red-400",
                      ].join(" ")}
                    >
                      {summary.positive ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}

                      {Math.abs(
                        summary.change
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                </div>
              )}
          </div>

          {/* Period selector */}
          <div className="relative shrink-0">
            <select
              value={activePeriod}
              onChange={(event) =>
                handlePeriodChange(
                  event.target.value as RevenuePeriod
                )
              }
              className={[
                "h-9 appearance-none rounded-xl",
                "border border-white/[0.08]",
                "bg-white/[0.025]",
                "pl-3 pr-8",
                "text-xs font-medium text-white/60",
                "outline-none transition",
                "focus:border-[#FFD84D]/30",
              ].join(" ")}
              aria-label="Revenue period"
            >
              {PERIODS.map((item) => (
                <option
                  key={item.value}
                  value={item.value}
                >
                  {item.label}
                </option>
              ))}
            </select>

            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-400/10">
            <TrendingDown className="h-5 w-5 text-red-400" />
          </div>
      
          <h3 className="mt-4 text-sm font-semibold text-white">
            Unable to load revenue
          </h3>
      
          <p className="mt-1.5 max-w-sm text-xs leading-5 text-white/40">
            {error}
          </p>
      
          {onRetry && (
            <button
              type="button"
              onClick={() => void onRetry()}
              className="mt-4 rounded-lg bg-[#FFD84D]/10 px-3 py-2 text-xs font-semibold text-[#FFD84D] transition hover:bg-[#FFD84D]/15"
            >
              Try again
            </button>
          )}
        </div>
      )}

      {/* Empty */}
      {!error &&
        chartData.length === 0 && (
          <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFD84D]/10">
              <BarChart3 className="h-6 w-6 text-[#FFD84D]" />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-white">
              No revenue data yet
            </h3>

            <p className="mt-1.5 max-w-sm text-xs leading-5 text-white/40">
              Your earnings will appear here as
              your content starts generating
              revenue.
            </p>
          </div>
        )}

      {/* Chart */}
      {!error &&
        chartData.length > 0 && (
          <div className="p-4 sm:p-5">
            <div className="relative h-[270px] w-full">
              {/* Y-axis */}
              <div className="pointer-events-none absolute bottom-5 left-0 top-0 flex w-12 flex-col justify-between">
                {[4, 3, 2, 1, 0].map(
                  (multiplier) => (
                    <span
                      key={multiplier}
                      className="text-[9px] text-white/25"
                    >
                      {formatAxisValue(
                        chart.maxValue *
                          (multiplier /
                            4),
                        currency
                      )}
                    </span>
                  )
                )}
              </div>

              {/* SVG */}
              <div className="absolute bottom-5 left-12 right-0 top-0">
                <svg
                  viewBox="0 0 1000 300"
                  preserveAspectRatio="none"
                  className="h-full w-full overflow-visible"
                >
                  <defs>
                    <linearGradient
                      id="tribeRevenueGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#FFD84D"
                        stopOpacity="0.22"
                      />

                      <stop
                        offset="100%"
                        stopColor="#FFD84D"
                        stopOpacity="0"
                      />
                    </linearGradient>
                  </defs>

                  {/* Grid */}
                  {[0, 1, 2, 3, 4].map(
                    (line) => {
                      const y =
                        20 +
                        ((300 - 40) *
                          line) /
                          4;

                      return (
                        <line
                          key={line}
                          x1="25"
                          x2="975"
                          y1={y}
                          y2={y}
                          stroke="rgba(255,255,255,0.055)"
                          strokeWidth="1"
                          vectorEffect="non-scaling-stroke"
                        />
                      );
                    }
                  )}

                  {/* Area */}
                  <polygon
                    points={chart.areaPoints}
                    fill="url(#tribeRevenueGradient)"
                  />

                  {/* Line */}
                  <polyline
                    points={chart.points}
                    fill="none"
                    stroke="#FFD84D"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />

                  {/* Points */}
                  {chart.coordinates.map(
                    (
                      point,
                      index
                    ) => {
                      const active =
                        hoveredIndex ===
                        index;

                      return (
                        <g
                          key={`${point.item.date}-${index}`}
                        >
                          <circle
                            cx={point.x}
                            cy={point.y}
                            r={
                              active
                                ? 6
                                : 4
                            }
                            fill="#121212"
                            stroke="#FFD84D"
                            strokeWidth={
                              active
                                ? 3
                                : 2
                              }
                            vectorEffect="non-scaling-stroke"
                          />

                          <circle
                            cx={point.x}
                            cy={point.y}
                            r="14"
                            fill="transparent"
                            className="cursor-pointer"
                            onMouseEnter={() =>
                              setHoveredIndex(
                                index
                              )
                            }
                            onMouseLeave={() =>
                              setHoveredIndex(
                                null
                              )
                            }
                          />
                        </g>
                      );
                    }
                  )}
                </svg>

                {/* Tooltip */}
                {showTooltip &&
                  hoveredIndex !==
                    null &&
                  chart.coordinates[
                    hoveredIndex
                  ] && (
                    <div
                      className="pointer-events-none absolute z-10 min-w-[145px] -translate-x-1/2 -translate-y-full rounded-xl border border-white/[0.08] bg-[#1b1b1b] px-3 py-2.5 shadow-2xl"
                      style={{
                        left: `${
                          (chart.coordinates[
                            hoveredIndex
                          ].x /
                            1000) *
                          100
                        }%`,
                        top: `${
                          (chart.coordinates[
                            hoveredIndex
                          ].y /
                            300) *
                          100
                        }%`,
                      }}
                    >
                      <p className="text-[10px] text-white/35">
                        {formatTooltipDate(
                          chart
                            .coordinates[
                              hoveredIndex
                            ].item
                            .date
                        )}
                      </p>

                      <p className="mt-1 text-sm font-semibold text-white">
                        {formatCurrency(
                          chart
                            .coordinates[
                              hoveredIndex
                            ].item
                            .amount,
                          currency
                        )}
                      </p>
                    </div>
                  )}
              </div>

              {/* X-axis */}
              <div className="absolute bottom-0 left-12 right-0 flex justify-between">
                {chart.labels.map(
                  (item, index) => (
                    <span
                      key={`${item.date}-${index}`}
                      className="max-w-[70px] truncate text-[9px] text-white/25"
                    >
                      {formatShortDate(
                        item.date,
                        activePeriod
                      )}
                    </span>
                  )
                )}
              </div>
            </div>
          </div>
        )}
    </section>
  );
}