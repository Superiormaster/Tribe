"use client";

import type { ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Clock3,
  DollarSign,
  Eye,
  Lightbulb,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";

import type {
  InsightType,
  MonetizationInsight,
} from "@/utils/monetization/types/monetization";

interface InsightCardProps {
  insight: MonetizationInsight;
  className?: string;
}

interface InsightConfig {
  icon: ReactNode;
  label: string;
}

const INSIGHT_CONFIG: Record<InsightType, InsightConfig> = {
  best_posting_time: {
    icon: <Clock3 className="h-5 w-5" />,
    label: "Best posting time",
  },

  highest_paying_tribe: {
    icon: <Users className="h-5 w-5" />,
    label: "Top earning Tribe",
  },

  best_content_type: {
    icon: <BarChart3 className="h-5 w-5" />,
    label: "Best content type",
  },

  best_rpm: {
    icon: <DollarSign className="h-5 w-5" />,
    label: "Best RPM",
  },

  highest_engagement: {
    icon: <Eye className="h-5 w-5" />,
    label: "Highest engagement",
  },
};

function formatValue(
  value: string | number | null | undefined,
  unit?: string | null
) {
  if (value === null || value === undefined) {
    return null;
  }

  return unit ? `${value}${unit}` : String(value);
}

export default function InsightCard({
  insight,
  className = "",
}: InsightCardProps) {
  const config =
    INSIGHT_CONFIG[insight.type] ??
    {
      icon: <Lightbulb className="h-5 w-5" />,
      label: "Insight",
    };

  const value = formatValue(
    insight.value,
    insight.unit
  );

  const change = insight.change;

  const hasChange =
    change !== null &&
    change !== undefined &&
    Number.isFinite(change);

  const isPositive = hasChange && change > 0;
  const isNegative = hasChange && change < 0;

  return (
    <article
      className={[
        "group relative overflow-hidden",
        "rounded-2xl border border-white/[0.08]",
        "bg-[#121212]",
        "p-4 sm:p-5",
        "transition-all duration-200",
        "hover:border-[#FFD84D]/25",
        "hover:bg-[#161616]",
        className,
      ].join(" ")}
    >
      {/* Subtle Tribe accent */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#FFD84D]/[0.04] blur-2xl transition-opacity group-hover:bg-[#FFD84D]/[0.07]" />

      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFD84D]/10 text-[#FFD84D]">
              {config.icon}
            </div>

            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-white/40">
                {config.label}
              </p>

              <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-white">
                {insight.title}
              </h3>
            </div>
          </div>

          <Sparkles className="h-4 w-4 shrink-0 text-[#FFD84D]/60" />
        </div>

        {/* Value */}
        {value && (
          <div className="mt-5">
            <p className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {value}
            </p>
          </div>
        )}

        {/* Description */}
        {insight.description && (
          <p className="mt-2 line-clamp-3 text-sm leading-5 text-white/45">
            {insight.description}
          </p>
        )}

        {/* Change */}
        {hasChange && (
          <div className="mt-4 flex items-center gap-2">
            <span
              className={[
                "inline-flex items-center gap-1 rounded-lg px-2 py-1",
                "text-xs font-semibold",
                isPositive
                  ? "bg-emerald-400/10 text-emerald-400"
                  : isNegative
                    ? "bg-red-400/10 text-red-400"
                    : "bg-white/[0.06] text-white/50",
              ].join(" ")}
            >
              {isPositive ? (
                <ArrowUp className="h-3.5 w-3.5" />
              ) : isNegative ? (
                <ArrowDown className="h-3.5 w-3.5" />
              ) : (
                <TrendingUp className="h-3.5 w-3.5" />
              )}

              {Math.abs(change).toFixed(1)}%
            </span>

            <span className="text-xs text-white/30">
              compared with previous period
            </span>
          </div>
        )}

        {/* Bottom accent */}
        <div className="mt-5 h-px w-full bg-white/[0.06]" />

        <div className="mt-3 flex items-center gap-2 text-xs text-white/30">
          <Lightbulb className="h-3.5 w-3.5 text-[#FFD84D]/60" />
          <span>Tribe creator insight</span>
        </div>
      </div>
    </article>
  );
}