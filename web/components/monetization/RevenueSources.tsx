"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Coins,
  Gift,
  Heart,
  MessageCircle,
  Play,
  Share2,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";

import { formatCurrency, CurrencyCode } from "@/utils/monetization/formatCurrency";

import type {
  RevenueSource,
  RevenueSourceKey,
} from "@/utils/monetization/types/monetization";

interface RevenueSourcesProps {
  sources: RevenueSource[];
  currency?: CurrencyCode;
  loading?: boolean;
  error?: string | null;
  showPercentages?: boolean;
  onViewSource?: (source: RevenueSource) => void;
  className?: string;
}

const SOURCE_CONFIG: Record<
  RevenueSourceKey,
  {
    label: string;
    icon: typeof Coins;
  }
> = {
  ads: {
    label: "Ads",
    icon: BarChart3,
  },

  subscriptions: {
    label: "Subscriptions",
    icon: Users,
  },

  tips: {
    label: "Tips",
    icon: Coins,
  },

  tribe_premium: {
    label: "Tribe Premium",
    icon: Sparkles,
  },

  gifts: {
    label: "Gifts",
    icon: Gift,
  },

  sponsored_posts: {
    label: "Sponsored Posts",
    icon: MessageCircle,
  },

  affiliate: {
    label: "Affiliate",
    icon: Share2,
  },

  marketplace: {
    label: "Marketplace",
    icon: BarChart3,
  },
};

function getSourceConfig(
  key: RevenueSourceKey
) {
  return SOURCE_CONFIG[key];
}

function formatPercentage(value: number) {
  if (!Number.isFinite(value)) {
    return "0%";
  }

  if (value >= 100) {
    return "100%";
  }

  return `${Math.max(0, value).toFixed(
    value % 1 === 0 ? 0 : 1
  )}%`;
}

function SourceSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 animate-pulse rounded-xl bg-white/[0.06]" />

      <div className="min-w-0 flex-1">
        <div className="h-3 w-24 animate-pulse rounded bg-white/[0.07]" />

        <div className="mt-2 h-2.5 w-full max-w-[180px] animate-pulse rounded bg-white/[0.05]" />
      </div>

      <div className="h-3 w-16 animate-pulse rounded bg-white/[0.07]" />
    </div>
  );
}

export default function RevenueSources({
  sources,
  currency = "NGN",
  loading = false,
  error = null,
  showPercentages = true,
  onViewSource,
  className = "",
}: RevenueSourcesProps) {
  const totalRevenue = sources.reduce(
    (total, source) =>
      total + Number(source.amount ?? 0),
    0
  );

  const calculatedSources = sources.map(
    (source) => {
      const amount = Number(source.amount ?? 0);

      const percentage =
        source.percentage !== undefined &&
        source.percentage !== null
          ? Number(source.percentage)
          : totalRevenue > 0
            ? (amount / totalRevenue) * 100
            : 0;

      return {
        ...source,
        amount,
        percentage,
      };
    }
  );

  const sortedSources = [
    ...calculatedSources,
  ].sort(
    (a, b) => b.amount - a.amount
  );

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
      <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] px-4 py-4 sm:px-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFD84D]/10">
              <TrendingUp className="h-4 w-4 text-[#FFD84D]" />
            </div>

            <div>
              <h2 className="text-base font-semibold text-white">
                Revenue sources
              </h2>

              <p className="mt-1 text-xs text-white/40">
                Where your Tribe earnings come from
              </p>
            </div>
          </div>
        </div>

        {!loading &&
          !error &&
          sources.length > 0 && (
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wide text-white/30">
                Total revenue
              </p>

              <p className="mt-1 text-sm font-semibold text-[#FFD84D]">
                {formatCurrency(
                  totalRevenue,
                  currency
                )}
              </p>
            </div>
          )}
      </div>

      {/* Error */}
      {error && !loading && (
        <div className="px-5 py-10 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-red-400/10">
            <ArrowDownRight className="h-5 w-5 text-red-400" />
          </div>

          <p className="mt-3 text-sm font-semibold text-white">
            Unable to load revenue sources
          </p>

          <p className="mx-auto mt-1.5 max-w-sm text-xs leading-5 text-white/40">
            {error}
          </p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-5 p-4 sm:p-5">
          {Array.from({ length: 5 }).map(
            (_, index) => (
              <SourceSkeleton key={index} />
            )
          )}
        </div>
      )}

      {/* Empty */}
      {!loading &&
        !error &&
        sources.length === 0 && (
          <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFD84D]/10">
              <Coins className="h-6 w-6 text-[#FFD84D]" />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-white">
              No revenue data yet
            </h3>

            <p className="mt-1.5 max-w-sm text-xs leading-5 text-white/40">
              Once your content starts generating
              earnings, you'll see the revenue sources
              here.
            </p>
          </div>
        )}

      {/* Sources */}
      {!loading &&
        !error &&
        sortedSources.length > 0 && (
          <div className="divide-y divide-white/[0.05]">
            {sortedSources.map(
              (source, index) => {
                const config = getSourceConfig(source.key);

                const Icon = config.icon;

                const isTopSource =
                  index === 0 &&
                  source.amount > 0;

                const growth =
                  source.growth !== undefined
                    ? Number(source.growth)
                    : null;

                return (
                  <button
                    key={source.id}
                    type="button"
                    onClick={() =>
                      onViewSource?.(source)
                    }
                    disabled={!onViewSource}
                    className={[
                      "w-full px-4 py-4 text-left sm:px-5",
                      onViewSource
                        ? "transition-colors hover:bg-white/[0.025]"
                        : "cursor-default",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-3">
                      {/* Icon */}
                      <div
                        className={[
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                          isTopSource
                            ? "bg-[#FFD84D]/15 text-[#FFD84D]"
                            : "bg-white/[0.05] text-white/40",
                        ].join(" ")}
                      >
                        <Icon className="h-4 w-4" />
                      </div>

                      {/* Details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-white">
                            {source.name ||
                              config.label}
                          </p>

                          {isTopSource && (
                            <span className="hidden rounded-md bg-[#FFD84D]/10 px-1.5 py-0.5 text-[9px] font-semibold text-[#FFD84D] sm:inline-block">
                              Top source
                            </span>
                          )}
                        </div>

                        {source.description && (
                          <p className="mt-1 line-clamp-1 text-xs text-white/30">
                            {source.description}
                          </p>
                        )}

                        {/* Progress */}
                        <div className="mt-3 flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                            <div
                              className="h-full rounded-full bg-[#FFD84D] transition-all duration-500"
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.max(
                                    0,
                                    source.percentage
                                  )
                                )}%`,
                              }}
                            />
                          </div>

                          {showPercentages && (
                            <span className="w-10 text-right text-[10px] font-medium text-white/35">
                              {formatPercentage(
                                source.percentage
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-white">
                          {formatCurrency(
                            source.amount,
                            source.currency ??
                              currency
                          )}
                        </p>

                        {growth !== null &&
                          Number.isFinite(
                            growth
                          ) && (
                            <p
                              className={[
                                "mt-1 inline-flex items-center gap-0.5 text-[10px] font-medium",
                                growth > 0
                                  ? "text-emerald-400"
                                  : growth < 0
                                    ? "text-red-400"
                                    : "text-white/30",
                              ].join(" ")}
                            >
                              {growth > 0 ? (
                                <ArrowUpRight className="h-3 w-3" />
                              ) : growth < 0 ? (
                                <ArrowDownRight className="h-3 w-3" />
                              ) : null}

                              {Math.abs(
                                growth
                              ).toFixed(1)}
                              %
                            </p>
                          )}
                      </div>
                    </div>
                  </button>
                );
              }
            )}
          </div>
        )}

      {/* Footer */}
      {!loading &&
        !error &&
        sortedSources.length > 0 && (
          <div className="border-t border-white/[0.06] px-4 py-3 sm:px-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] text-white/25">
                Revenue distribution
              </p>

              <p className="text-[10px] font-medium text-white/40">
                {sortedSources.length}{" "}
                {sortedSources.length === 1
                  ? "source"
                  : "sources"}
              </p>
            </div>
          </div>
        )}
    </section>
  );
}