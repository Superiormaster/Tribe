"use client";

import {
  BarChart3,
  Target,
} from "lucide-react";

import type {
  Match,
  MatchStats as MatchStatistics,
} from "@/utils/sports/types/sports";

interface MatchStat {
  label: string;
  home: number | string;
  away: number | string;
  homePercentage?: number;
  awayPercentage?: number;
}

interface MatchStatsProps {
  match: Match;
  loading?: boolean;
  title?: string;
}

export default function MatchStats({
  match,
  loading = false,
  title = "Match Statistics",
}: MatchStatsProps) {
  if (loading) {
    return <LoadingState />;
  }

  const stats = buildStats(match.statistics);

  if (stats.length === 0) {
    return <EmptyState />;
  }

  return (
    <section className="w-full">
      {/* Header */}
      <div className="mb-5 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/30">
          <BarChart3 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
            {title}
          </h2>

          <p className="text-sm text-gray-500 dark:text-gray-400">
            Match performance comparison
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        {/* Teams */}
        <div className="grid grid-cols-3 items-center border-b border-gray-200 bg-gray-50 px-4 py-4 dark:border-gray-800 dark:bg-gray-800/50 sm:px-6">
          <Team
            name={match.homeTeam?.name ?? "Home"}
            logo={match.homeTeam?.logo}
            align="left"
          />

          <div className="flex justify-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/40">
              <Target className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>

          <Team
            name={match.awayTeam?.name ?? "Away"}
            logo={match.awayTeam?.logo}
            align="right"
          />
        </div>

        {/* Statistics */}
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {stats.map((stat, index) => (
            <StatRow
              key={`${stat.label}-${index}`}
              stat={stat}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function buildStats(
  statistics?: MatchStatistics
): MatchStat[] {
  if (!statistics) {
    return [];
  }

  const stats: MatchStat[] = [];

  addStat(
    stats,
    "Possession",
    statistics.possession
  );

  addStat(
    stats,
    "Shots",
    statistics.shots
  );

  addStat(
    stats,
    "Shots on target",
    statistics.shotsOnTarget
  );

  addStat(
    stats,
    "Corners",
    statistics.corners
  );

  addStat(
    stats,
    "Fouls",
    statistics.fouls
  );

  addStat(
    stats,
    "Offsides",
    statistics.offsides
  );

  addStat(
    stats,
    "Yellow cards",
    statistics.yellowCards
  );

  addStat(
    stats,
    "Red cards",
    statistics.redCards
  );

  return stats;
}

function addStat(
  stats: MatchStat[],
  label: string,
  value?: {
    home: number;
    away: number;
  }
) {
  if (!value) {
    return;
  }

  stats.push({
    label,
    home: value.home,
    away: value.away,
  });
}

function StatRow({
  stat,
}: {
  stat: MatchStat;
}) {
  const homePercentage =
    stat.homePercentage ??
    calculatePercentage(
      stat.home,
      stat.away
    );

  const awayPercentage =
    stat.awayPercentage ??
    calculatePercentage(
      stat.away,
      stat.home
    );

  return (
    <div className="px-4 py-4 sm:px-6">
      <div className="grid grid-cols-3 items-center">
        <span className="text-left text-sm font-bold text-gray-900 dark:text-white">
          {stat.home}
        </span>

        <span className="px-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
          {stat.label}
        </span>

        <span className="text-right text-sm font-bold text-gray-900 dark:text-white">
          {stat.away}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <ProgressBar
          percentage={homePercentage}
          align="left"
        />

        <ProgressBar
          percentage={awayPercentage}
          align="right"
        />
      </div>
    </div>
  );
}

function ProgressBar({
  percentage,
  align,
}: {
  percentage: number;
  align: "left" | "right";
}) {
  const safePercentage = Math.min(
    100,
    Math.max(0, percentage)
  );

  return (
    <div
      className={`h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800 ${
        align === "right"
          ? "flex justify-end"
          : ""
      }`}
    >
      <div
        className="h-full rounded-full bg-indigo-600 transition-all duration-500 dark:bg-indigo-500"
        style={{
          width: `${safePercentage}%`,
        }}
      />
    </div>
  );
}

function Team({
  name,
  logo,
  align,
}: {
  name: string;
  logo?: string;
  align: "left" | "right";
}) {
  return (
    <div
      className={`flex min-w-0 items-center gap-2 ${
        align === "right"
          ? "justify-end"
          : "justify-start"
      }`}
    >
      {align === "left" && (
        <TeamLogo
          logo={logo}
          name={name}
        />
      )}

      <span className="max-w-[100px] truncate text-xs font-bold text-gray-900 dark:text-white sm:max-w-[160px] sm:text-sm">
        {name}
      </span>

      {align === "right" && (
        <TeamLogo
          logo={logo}
          name={name}
        />
      )}
    </div>
  );
}

function TeamLogo({
  logo,
  name,
}: {
  logo?: string;
  name: string;
}) {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white dark:bg-gray-900">
      {logo ? (
        <img
          src={logo}
          alt=""
          className="h-full w-full object-contain"
        />
      ) : (
        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
          {name.charAt(0)}
        </span>
      )}
    </div>
  );
}

function calculatePercentage(
  value: number | string,
  otherValue: number | string
) {
  const current = Number(value);
  const other = Number(otherValue);

  if (
    !Number.isFinite(current) ||
    !Number.isFinite(other)
  ) {
    return 50;
  }

  const total = current + other;

  if (total <= 0) {
    return 50;
  }

  return (current / total) * 100;
}

function LoadingState() {
  return (
    <section className="w-full">
      <div className="mb-5 flex items-center gap-2">
        <div className="h-8 w-8 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />

        <div className="space-y-2">
          <div className="h-5 w-36 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          <div className="h-3 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
        <div className="h-20 animate-pulse bg-gray-100 dark:bg-gray-800" />

        <div className="space-y-6 bg-white p-5 dark:bg-gray-900">
          {Array.from({ length: 6 }).map(
            (_, index) => (
              <div key={index}>
                <div className="mb-3 flex justify-between">
                  <div className="h-4 w-8 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                  <div className="h-3 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                  <div className="h-4 w-8 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="h-1.5 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" />
                  <div className="h-1.5 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" />
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </section>
  );
}

function EmptyState() {
  return (
    <section className="w-full">
      <div className="rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center dark:border-gray-800 dark:bg-gray-900">
        <BarChart3 className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />

        <h3 className="mt-3 font-semibold text-gray-900 dark:text-white">
          No match statistics
        </h3>

        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Match statistics will appear here when available.
        </p>
      </div>
    </section>
  );
}