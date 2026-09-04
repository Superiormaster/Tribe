// src/components/sports/LiveMatches.tsx

"use client";

import AppLink from '@/components/AppLink';
import {
  ChevronRight,
  CircleDot,
  Radio,
} from "lucide-react";

import type { Match } from "@/utils/sports/types/sports";

interface LiveMatchesProps {
  matches?: Match[];
  title?: string;
  limit?: number;
  loading?: boolean;
  showViewAll?: boolean;
  viewAllHref?: string;
}

export default function LiveMatches({
  matches = [],
  title = "Live Matches",
  limit = 10,
  loading = false,
  showViewAll = true,
  viewAllHref = "/sports/live",
}: LiveMatchesProps) {
  const visibleMatches = matches.slice(0, limit);

  return (
    <section className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/30">
              <Radio className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>

            <h2 className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
              {title}
            </h2>

            {visibleMatches.length > 0 && (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-600 dark:bg-red-950/30 dark:text-red-400">
                Live
              </span>
            )}
          </div>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Follow matches happening right now
          </p>
        </div>

        {showViewAll && (
          <AppLink
            href={viewAllHref}
            className="hidden items-center gap-1 text-sm font-semibold text-indigo-600 transition hover:text-indigo-700 sm:flex dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            View all
            <ChevronRight className="h-4 w-4" />
          </AppLink>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        {loading ? (
          <LoadingState />
        ) : visibleMatches.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {visibleMatches.map((match) => (
              <LiveMatchRow
                key={match.id}
                match={match}
              />
            ))}
          </div>
        )}
      </div>

      {showViewAll && (
        <AppLink
          href={viewAllHref}
          className="mt-3 flex items-center justify-center gap-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-indigo-600 transition hover:bg-gray-50 sm:hidden dark:border-gray-800 dark:bg-gray-900 dark:text-indigo-400 dark:hover:bg-gray-800"
        >
          View all live matches
          <ChevronRight className="h-4 w-4" />
        </AppLink>
      )}
    </section>
  );
}

function LiveMatchRow({
  match,
}: {
  match: Match;
}) {
  const minute =
    match.minute !== undefined
      ? `${match.minute}'`
      : match.status === "halftime"
        ? "HT"
        : "LIVE";

  const homeScore = match.score?.home ?? 0;
  const awayScore = match.score?.away ?? 0;

  return (
    <AppLink
      href={`/sports/matches/${match.id}`}
      className="group block p-4 transition hover:bg-gray-50 dark:hover:bg-gray-800/50"
    >
      <div className="flex items-center gap-4">
        <div className="flex w-16 shrink-0 flex-col items-center justify-center">
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase text-red-600 dark:text-red-400">
            <CircleDot className="h-3.5 w-3.5 animate-pulse" />
            {minute}
          </span>

          <span className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
            {match.competition.shortName ||
              match.competition.name}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <TeamRow
            name={match.homeTeam.name}
            logo={match.homeTeam.logo}
            score={homeScore}
          />

          <div className="my-2 border-t border-gray-100 dark:border-gray-800" />

          <TeamRow
            name={match.awayTeam.name}
            logo={match.awayTeam.logo}
            score={awayScore}
          />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-bold uppercase text-red-600 sm:block dark:bg-red-950/30 dark:text-red-400">
            Live
          </span>

          <ChevronRight className="h-5 w-5 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-600 dark:text-gray-600 dark:group-hover:text-indigo-400" />
        </div>
      </div>
    </AppLink>
  );
}

function TeamRow({
  name,
  logo,
  score,
}: {
  name: string;
  logo?: string;
  score: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        {logo ? (
          <img
            src={logo}
            alt=""
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="text-xs font-bold text-gray-400">
            {name.charAt(0)}
          </span>
        )}
      </div>

      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
        {name}
      </span>

      <span className="min-w-[20px] text-right text-base font-bold text-gray-900 dark:text-white">
        {score}
      </span>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-800">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse p-4"
        >
          <div className="flex items-center gap-4">
            <div className="h-8 w-12 rounded bg-gray-200 dark:bg-gray-800" />

            <div className="flex-1 space-y-3">
              <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-800" />
              <div className="h-px w-full bg-gray-200 dark:bg-gray-800" />
              <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-800" />
            </div>

            <div className="h-5 w-5 rounded bg-gray-200 dark:bg-gray-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
        <Radio className="h-6 w-6 text-gray-400 dark:text-gray-500" />
      </div>

      <h3 className="mt-3 font-semibold text-gray-900 dark:text-gray-100">
        No live matches
      </h3>

      <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
        There are no matches being played right now.
        Check back during match time.
      </p>
    </div>
  );
}