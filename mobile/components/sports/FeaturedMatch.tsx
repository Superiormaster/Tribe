// src/components/sports/FeaturedMatch.tsx

"use client";

import AppLink from '@/components/AppLink';
import {
  ArrowRight,
  CalendarDays,
  Clock,
  MapPin,
  Trophy,
} from "lucide-react";

import type { FeaturedMatch as FeaturedMatchType } from "@/utils/sports/types/sports";

interface FeaturedMatchProps {
  featured?: FeaturedMatchType;
  loading?: boolean;
  className?: string;
}

function formatDate(date: string) {
  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    return date;
  }

  return value.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatTime(
  date: string,
  kickoffTime?: string
) {
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

export default function FeaturedMatch({
  featured,
  loading = false,
  className = "",
}: FeaturedMatchProps) {
  if (loading) {
    return <LoadingState />;
  }

  if (!featured) {
    return null;
  }

  const { match, title, description } = featured;

  const isLive =
    match.status === "live" ||
    match.status === "halftime";

  const isFinished =
    match.status === "finished";

  return (
    <section
      className={`relative overflow-hidden rounded-3xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 ${className}`}
    >
      {match.competition.logo && (
        <div className="absolute right-6 top-6 z-10 hidden h-12 w-12 items-center justify-center rounded-xl border border-gray-200 bg-white/90 p-2 backdrop-blur sm:flex dark:border-gray-700 dark:bg-gray-900/90">
          <img
            src={match.competition.logo}
            alt=""
            className="h-full w-full object-contain"
          />
        </div>
      )}

      <div className="relative overflow-hidden bg-gray-50 px-5 py-6 sm:px-8 sm:py-8 dark:bg-gray-950">
        <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-indigo-600/10" />
        <div className="absolute -bottom-24 -left-16 h-48 w-48 rounded-full bg-gray-200/60 dark:bg-gray-800/50" />

        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 shadow-sm dark:bg-gray-900 dark:text-gray-300">
              <Trophy className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              {match.competition.shortName ||
                match.competition.name}
            </span>

            {isLive && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-red-600 dark:bg-red-950/30 dark:text-red-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-600 dark:bg-red-400" />
                Live
              </span>
            )}

            {isFinished && (
              <span className="rounded-full bg-gray-200 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                Full Time
              </span>
            )}
          </div>

          {title && (
            <h2 className="mt-5 max-w-2xl text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl dark:text-white">
              {title}
            </h2>
          )}

          {description && (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500 sm:text-base dark:text-gray-400">
              {description}
            </p>
          )}

          <div className="mt-7 grid grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-8">
            <Team
              name={match.homeTeam.name}
              logo={match.homeTeam.logo}
              align="right"
            />

            <div className="flex min-w-[80px] flex-col items-center">
              {match.score ? (
                <div className="text-3xl font-black tracking-tight text-gray-900 sm:text-4xl dark:text-white">
                  {match.score.home}
                  <span className="mx-2 text-gray-300 dark:text-gray-600">
                    -
                  </span>
                  {match.score.away}
                </div>
              ) : (
                <span className="text-lg font-bold text-gray-400 dark:text-gray-500">
                  VS
                </span>
              )}

              <span className="mt-1 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                {isLive && match.minute !== undefined
                  ? `${match.minute}'`
                  : isFinished
                    ? "FT"
                    : "Upcoming"}
              </span>
            </div>

            <Team
              name={match.awayTeam.name}
              logo={match.awayTeam.logo}
              align="left"
            />
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-gray-500 sm:text-sm dark:text-gray-400">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              {formatDate(match.date)}
            </span>

            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              {formatTime(
                match.date,
                match.kickoffTime
              )}
            </span>

            {match.venue && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                {match.venue}
              </span>
            )}
          </div>

          <div className="mt-7 flex justify-center">
            <AppLink
              href={`/sports/matches/${match.id}`}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 dark:focus:ring-offset-gray-950"
            >
              {isLive
                ? "Follow Live Match"
                : isFinished
                  ? "View Match"
                  : "Match Preview"}

              <ArrowRight className="h-4 w-4" />
            </AppLink>
          </div>
        </div>
      </div>
    </section>
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
      className={`flex min-w-0 flex-col items-center gap-3 ${
        align === "right"
          ? "sm:items-end"
          : "sm:items-start"
      }`}
    >
      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-white p-2 shadow-sm sm:h-20 sm:w-20 dark:border-gray-700 dark:bg-gray-900">
        {logo ? (
          <img
            src={logo}
            alt={name}
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">
            {name.charAt(0)}
          </span>
        )}
      </div>

      <span
        className={`max-w-[130px] truncate text-sm font-bold text-gray-900 sm:max-w-[180px] sm:text-base dark:text-white ${
          align === "right"
            ? "sm:text-right"
            : "sm:text-left"
        }`}
      >
        {name}
      </span>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="animate-pulse overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 sm:p-8 dark:border-gray-800 dark:bg-gray-900">
      <div className="h-7 w-40 rounded-full bg-gray-200 dark:bg-gray-800" />

      <div className="mt-7 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="flex flex-col items-center gap-3">
          <div className="h-20 w-20 rounded-2xl bg-gray-200 dark:bg-gray-800" />
          <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-800" />
        </div>

        <div className="h-10 w-20 rounded bg-gray-200 dark:bg-gray-800" />

        <div className="flex flex-col items-center gap-3">
          <div className="h-20 w-20 rounded-2xl bg-gray-200 dark:bg-gray-800" />
          <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-800" />
        </div>
      </div>

      <div className="mx-auto mt-7 h-4 w-56 rounded bg-gray-200 dark:bg-gray-800" />

      <div className="mx-auto mt-6 h-11 w-40 rounded-xl bg-gray-200 dark:bg-gray-800" />
    </div>
  );
}