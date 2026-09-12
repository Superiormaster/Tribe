// src/components/sports/TodayFixtures.tsx

"use client";

import AppLink from '@/components/AppLink';
import {
  CalendarDays,
  ChevronRight,
  Clock,
} from "lucide-react";

import type { Match } from "@/utils/sports/types/sports";

interface TodayFixturesProps {
  matches?: Match[];
  title?: string;
  limit?: number;
  loading?: boolean;
  showViewAll?: boolean;
  viewAllHref?: string;
}

function formatTime(date: string, kickoffTime?: string) {
  if (kickoffTime) {
    return kickoffTime;
  }

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    return "";
  }

  return value.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCompetition(match: Match) {
  return match.competition.shortName ||
    match.competition.name;
}

export default function TodayFixtures({
  matches = [],
  title = "Today's Fixtures",
  limit = 10,
  loading = false,
  showViewAll = true,
  viewAllHref = "/sports/fixtures",
}: TodayFixturesProps) {
  const visibleMatches = matches.slice(0, limit);

  return (
    <section className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />

            <h2 className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
              {title}
            </h2>
          </div>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            All today's scheduled matches
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
              <FixtureRow
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
          View all fixtures
          <ChevronRight className="h-4 w-4" />
        </AppLink>
      )}
    </section>
  );
}

function FixtureRow({
  match,
}: {
  match: Match;
}) {
  return (
    <AppLink
      href={`/sports/matches/${match.id}`}
      className="group block p-4 transition hover:bg-gray-50 dark:hover:bg-gray-800/50"
    >
      <div className="flex items-center gap-4">
        <div className="flex w-20 shrink-0 flex-col items-center justify-center border-r border-gray-200 pr-4 dark:border-gray-800">
          <Clock className="mb-1 h-4 w-4 text-indigo-600 dark:text-indigo-400" />

          <span className="text-sm font-bold text-gray-900 dark:text-white">
            {formatTime(
              match.date,
              match.kickoffTime
            )}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="mb-3 truncate text-xs font-medium text-gray-500 dark:text-gray-400">
            {formatCompetition(match)}
          </p>

          <div className="space-y-2.5">
            <TeamRow
              name={match.homeTeam.name}
              logo={match.homeTeam.logo}
            />

            <TeamRow
              name={match.awayTeam.name}
              logo={match.awayTeam.logo}
            />
          </div>
        </div>

        <div className="hidden shrink-0 sm:block">
          <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            {match.venue || "Match"}
          </span>
        </div>

        <ChevronRight className="h-5 w-5 shrink-0 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-600 dark:text-gray-600 dark:group-hover:text-indigo-400" />
      </div>
    </AppLink>
  );
}

function TeamRow({
  name,
  logo,
}: {
  name: string;
  logo?: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
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

      <span className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
        {name}
      </span>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-800">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse p-4"
        >
          <div className="flex items-center gap-4">
            <div className="h-10 w-16 rounded bg-gray-200 dark:bg-gray-800" />

            <div className="flex-1 space-y-3">
              <div className="h-3 w-28 rounded bg-gray-200 dark:bg-gray-800" />
              <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-800" />
              <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-800" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <CalendarDays className="h-10 w-10 text-gray-300 dark:text-gray-600" />

      <h3 className="mt-3 font-semibold text-gray-900 dark:text-gray-100">
        No fixtures today
      </h3>

      <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
        There are no scheduled matches for today.
        Check the fixtures page for upcoming games.
      </p>
    </div>
  );
}