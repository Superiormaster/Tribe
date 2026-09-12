// src/components/sports/UpcomingMatches.tsx

"use client";

import AppLink from '@/components/AppLink';
import { CalendarDays, ChevronRight, Clock } from "lucide-react";

import type { Match } from "@/utils/sports/types/sports";
import { getMatchStatusLabel } from "@/components/sports/MatchStatus";

interface UpcomingMatchesProps {
  matches?: Match[];
  title?: string;
  limit?: number;
  showViewAll?: boolean;
  viewAllHref?: string;
  loading?: boolean;
}

function formatMatchDate(date: string) {
  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    return date;
  }

  return value.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatKickoff(date: string, kickoffTime?: string) {
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

export default function UpcomingMatches({
  matches = [],
  title = "Upcoming Matches",
  limit = 5,
  showViewAll = true,
  viewAllHref = "/sports/fixtures",
  loading = false,
}: UpcomingMatchesProps) {
  const visibleMatches = matches.slice(0, limit);

  return (
    <section className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
            {title}
          </h2>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Don't miss the next big games
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
              <MatchRow key={match.id} match={match} />
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

function MatchRow({ match }: { match: Match }) {
  return (
    <AppLink
      href={`/sports/matches/${match.id}`}
      className="group block p-4 transition hover:bg-gray-50 dark:hover:bg-gray-800/50"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="truncate">
              {match.competition.name}
            </span>

            <span>•</span>

            <span className="shrink-0">
              {formatMatchDate(match.date)}
            </span>
          </div>

          <div className="space-y-3">
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

        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100">
            <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            {formatKickoff(match.date, match.kickoffTime)}
          </div>

          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            {getMatchStatusLabel(match.status)}
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
    <div className="flex items-center gap-3">
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
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse p-4"
        >
          <div className="mb-4 h-3 w-32 rounded bg-gray-200 dark:bg-gray-800" />

          <div className="space-y-3">
            <div className="h-5 w-3/4 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-5 w-2/3 rounded bg-gray-200 dark:bg-gray-800" />
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
        No upcoming matches
      </h3>

      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Check back later for upcoming fixtures.
      </p>
    </div>
  );
}