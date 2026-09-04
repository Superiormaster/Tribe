// src/components/sports/UpcomingMatchCard.tsx

"use client";

import AppLink from '@/components/AppLink';
import {
  CalendarDays,
  ChevronRight,
  Clock3,
  Trophy,
} from "lucide-react";

import type { Match } from "@/utils/sports/types/sports";

interface UpcomingMatchCardProps {
  match: Match;
  href?: string;
  className?: string;
  showCompetition?: boolean;
  showVenue?: boolean;
  showCountdown?: boolean;
}

export default function UpcomingMatchCard({
  match,
  href,
  className = "",
  showCompetition = true,
  showVenue = false,
  showCountdown = true,
}: UpcomingMatchCardProps) {
  const matchHref =
    href ?? `/sports/matches/${match.id}`;

  return (
    <AppLink
      href={matchHref}
      className={`group block rounded-2xl border border-gray-200 bg-white transition hover:border-indigo-600 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-indigo-500 ${className}`}
    >
      <div className="p-4 sm:p-5">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {showCompetition &&
              match.competition && (
                <div className="flex min-w-0 items-center gap-1.5">
                  <Trophy className="h-3.5 w-3.5 shrink-0 text-indigo-600 dark:text-indigo-400" />

                  <span className="truncate text-xs font-bold text-gray-500 dark:text-gray-400">
                    {match.competition.shortName ||
                      match.competition.name}
                  </span>
                </div>
              )}

            {match.date && (
              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-gray-400 dark:text-gray-500">
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  {formatDate(match.date)}
                </span>

                <span className="flex items-center gap-1">
                  <Clock3 className="h-3 w-3" />
                  {formatTime(match.date)}
                </span>
              </div>
            )}
          </div>

          <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-extrabold uppercase text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
            Upcoming
          </span>
        </div>

        {/* Teams */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <Team
            name={match.homeTeam.name}
            logo={match.homeTeam.logo}
            align="right"
          />

          <div className="flex min-w-[58px] flex-col items-center">
            <div className="flex h-9 items-center justify-center rounded-xl bg-gray-50 px-3 dark:bg-gray-800">
              <span className="text-xs font-extrabold text-gray-500 dark:text-gray-400">
                VS
              </span>
            </div>

            {showCountdown &&
              match.date && (
                <span className="mt-2 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                  {getCountdownText(match.date)}
                </span>
              )}
          </div>

          <Team
            name={match.awayTeam.name}
            logo={match.awayTeam.logo}
            align="left"
          />
        </div>

        {/* Footer */}
        {(showVenue && match.venue) && (
          <div className="mt-4 border-t border-gray-100 pt-3 text-[11px] text-gray-400 dark:border-gray-800 dark:text-gray-500">
            {match.venue}
          </div>
        )}

        <div className="mt-4 flex items-center justify-end">
          <span className="flex items-center gap-1 text-xs font-semibold text-indigo-600 transition group-hover:gap-1.5 dark:text-indigo-400">
            Match details
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </AppLink>
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
      className={`flex min-w-0 items-center gap-2.5 ${
        align === "right"
          ? "justify-end text-right"
          : "justify-start text-left"
      }`}
    >
      {align === "right" && (
        <p className="max-w-[130px] truncate text-xs font-bold text-gray-900 dark:text-white sm:max-w-[180px] sm:text-sm">
          {name}
        </p>
      )}

      <TeamLogo
        name={name}
        logo={logo}
      />

      {align === "left" && (
        <p className="max-w-[130px] truncate text-xs font-bold text-gray-900 dark:text-white sm:max-w-[180px] sm:text-sm">
          {name}
        </p>
      )}
    </div>
  );
}

function TeamLogo({
  name,
  logo,
}: {
  name: string;
  logo?: string;
}) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800">
      {logo ? (
        <img
          src={logo}
          alt={name}
          className="h-full w-full object-contain"
        />
      ) : (
        <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
          {name.charAt(0)}
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
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatTime(date?: string) {
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

function getCountdownText(date?: string) {
  if (!date) return "";

  const target = new Date(date).getTime();

  if (!Number.isFinite(target)) {
    return "";
  }

  const difference = target - Date.now();

  if (difference <= 0) {
    return "Starting soon";
  }

  const totalMinutes = Math.floor(
    difference / (1000 * 60)
  );

  const days = Math.floor(
    totalMinutes / (60 * 24)
  );

  const hours = Math.floor(
    (totalMinutes % (60 * 24)) / 60
  );

  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `In ${days}d ${hours}h`;
  }

  if (hours > 0) {
    return `In ${hours}h ${minutes}m`;
  }

  return `In ${minutes}m`;
}