// src/components/sports/TeamMatches.tsx

"use client";

import AppLink from '@/components/AppLink';
import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  Clock,
  Trophy,
} from "lucide-react";

import type { Match } from "@/utils/sports/types/sports";

interface TeamMatchesProps {
  matches?: Match[];
  title?: string;
  limit?: number;
  loading?: boolean;
  showViewAll?: boolean;
  viewAllHref?: string;
  emptyMessage?: string;
}

export default function TeamMatches({
  matches = [],
  title = "Team Matches",
  limit = 6,
  loading = false,
  showViewAll = true,
  viewAllHref = "/sports/matches",
  emptyMessage = "No matches available for this team.",
}: TeamMatchesProps) {
  const visibleMatches = matches.slice(0, limit);

  return (
    <section className="w-full">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/30">
              <CalendarDays className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>

            <h2 className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
              {title}
            </h2>
          </div>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Fixtures and recent results
          </p>
        </div>

        {showViewAll && (
          <AppLink
            href={viewAllHref}
            className="hidden items-center gap-1 text-sm font-semibold text-indigo-600 transition hover:text-indigo-700 sm:flex dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            View all
            <ArrowRight className="h-4 w-4" />
          </AppLink>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        {loading ? (
          <LoadingState />
        ) : visibleMatches.length === 0 ? (
          <EmptyState message={emptyMessage} />
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {visibleMatches.map((match) => (
              <MatchRow
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
          className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-indigo-600 transition hover:bg-gray-50 sm:hidden dark:border-gray-800 dark:bg-gray-900 dark:text-indigo-400 dark:hover:bg-gray-800"
        >
          View all matches
          <ArrowRight className="h-4 w-4" />
        </AppLink>
      )}
    </section>
  );
}

function MatchRow({
  match,
}: {
  match: Match;
}) {
  const isLive =
    match.status === "live" ||
    match.status === "halftime";

  const isFinished =
    match.status === "finished";

  const hasScore =
    match.score !== undefined &&
    match.score !== null;

  return (
    <AppLink
      href={`/sports/matches/${match.id}`}
      className="group block p-4 transition hover:bg-gray-50 dark:hover:bg-gray-800/50"
    >
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Date / status */}
        <div className="flex w-16 shrink-0 flex-col items-center justify-center border-r border-gray-200 pr-3 dark:border-gray-800 sm:w-20">
          {isLive ? (
            <>
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase text-red-600 dark:text-red-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-600 dark:bg-red-400" />
                Live
              </span>

              <span className="mt-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                {match.minute !== undefined
                  ? `${match.minute}'`
                  : match.status === "halftime"
                    ? "HT"
                    : ""}
              </span>
            </>
          ) : isFinished ? (
            <>
              <span className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                FT
              </span>

              <span className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
                {formatDate(match.date)}
              </span>
            </>
          ) : (
            <>
              <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />

              <span className="mt-1 text-xs font-bold text-gray-900 dark:text-white">
                {formatTime(
                  match.date,
                  match.kickoffTime
                )}
              </span>

              <span className="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">
                {formatDate(match.date)}
              </span>
            </>
          )}
        </div>

        {/* Teams */}
        <div className="min-w-0 flex-1">
          <p className="mb-2 flex items-center gap-1.5 truncate text-[11px] font-medium text-gray-400 dark:text-gray-500">
            <Trophy className="h-3 w-3 shrink-0 text-indigo-600 dark:text-indigo-400" />
            {match.competition.shortName ||
              match.competition.name}
          </p>

          <TeamRow
            name={match.homeTeam.name}
            logo={match.homeTeam.logo}
            score={
              hasScore
                ? match.score?.home
                : undefined
            }
          />

          <div className="my-1.5 border-t border-gray-100 dark:border-gray-800" />

          <TeamRow
            name={match.awayTeam.name}
            logo={match.awayTeam.logo}
            score={
              hasScore
                ? match.score?.away
                : undefined
            }
          />
        </div>

        {/* Match info */}
        <div className="hidden shrink-0 items-center gap-3 sm:flex">
          {match.venue && (
            <span className="max-w-[120px] truncate text-xs text-gray-400 dark:text-gray-500">
              {match.venue}
            </span>
          )}

          <ChevronRight className="h-5 w-5 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-600 dark:text-gray-600 dark:group-hover:text-indigo-400" />
        </div>

        <ChevronRight className="h-5 w-5 shrink-0 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-600 sm:hidden dark:text-gray-600 dark:group-hover:text-indigo-400" />
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
  score?: number;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        {logo ? (
          <img
            src={logo}
            alt=""
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
            {name.charAt(0)}
          </span>
        )}
      </div>

      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
        {name}
      </span>

      {score !== undefined && (
        <span className="min-w-[18px] text-right text-sm font-extrabold text-gray-900 dark:text-white">
          {score}
        </span>
      )}
    </div>
  );
}

function formatDate(date?: string) {
  if (!date) return "";

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    return "";
  }

  return value.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

function formatTime(
  date?: string,
  kickoffTime?: string
) {
  if (kickoffTime) {
    return kickoffTime;
  }

  if (!date) return "";

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    return "";
  }

  return value.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function LoadingState() {
  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-800">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="flex animate-pulse items-center gap-4 p-4"
        >
          <div className="h-10 w-16 rounded bg-gray-200 dark:bg-gray-800" />

          <div className="flex-1 space-y-3">
            <div className="h-3 w-32 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-800" />
          </div>

          <div className="h-5 w-5 rounded bg-gray-200 dark:bg-gray-800" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  message,
}: {
  message: string;
}) {
  return (
    <div className="px-6 py-12 text-center">
      <CalendarDays className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />

      <h3 className="mt-3 font-semibold text-gray-900 dark:text-gray-100">
        No matches
      </h3>

      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {message}
      </p>
    </div>
  );
}