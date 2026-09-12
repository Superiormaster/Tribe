// src/components/sports/MatchCard.tsx

"use client";

import AppLink from '@/components/AppLink';
import {
  CalendarDays,
  ChevronRight,
  CircleDot,
  Clock3,
  Trophy,
} from "lucide-react";

import type { Match } from "@/utils/sports/types/sports";

interface MatchCardProps {
  match: Match;
  href?: string;
  className?: string;
  showCompetition?: boolean;
  showVenue?: boolean;
  compact?: boolean;
}

export default function MatchCard({
  match,
  href,
  className = "",
  showCompetition = true,
  showVenue = false,
  compact = false,
}: MatchCardProps) {
  const matchHref =
    href ?? `/sports/matches/${match.id}`;

  const status = normalizeStatus(match.status);

  const isLive =
    status === "live" || status === "halftime";

  const isFinished = status === "finished";

  const isUpcoming =
    status === "scheduled" ||
    status === "delayed" ||
    status === "unknown";

  const homeScore = match.score?.home;
  const awayScore = match.score?.away;

  const hasScore =
    homeScore !== undefined &&
    homeScore !== null &&
    awayScore !== undefined &&
    awayScore !== null;

  const homeWon =
    hasScore &&
    isFinished &&
    homeScore > awayScore;

  const awayWon =
    hasScore &&
    isFinished &&
    awayScore > homeScore;

  return (
    <AppLink
      href={matchHref}
      className={`group block ${className}`}
    >
      <article
        className={`
          relative overflow-hidden rounded-2xl border
          border-gray-200 bg-white
          transition-all duration-200
          hover:border-indigo-600 hover:shadow-md
          dark:border-gray-800 dark:bg-gray-900
          dark:hover:border-indigo-500
          ${compact ? "p-4" : "p-4 sm:p-5"}
        `}
      >
        {/* Live top indicator */}
        {isLive && (
          <div className="absolute inset-x-0 top-0 h-1 bg-indigo-600" />
        )}

        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {showCompetition &&
              match.competition && (
                <div className="flex min-w-0 items-center gap-1.5">
                  {match.competition.logo ? (
                    <img
                      src={match.competition.logo}
                      alt=""
                      className="h-4 w-4 shrink-0 object-contain"
                    />
                  ) : (
                    <Trophy className="h-3.5 w-3.5 shrink-0 text-indigo-600 dark:text-indigo-400" />
                  )}

                  <span className="truncate text-xs font-bold text-gray-500 dark:text-gray-400">
                    {match.competition.shortName ||
                      match.competition.name}
                  </span>
                </div>
              )}

            {match.date && !isLive && (
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

          <StatusBadge
            status={status}
            minute={getMinute(match)}
          />
        </div>

        {/* Teams and score */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <Team
            name={match.homeTeam.name}
            logo={match.homeTeam.logo}
            score={homeScore}
            winner={homeWon}
            align="right"
            compact={compact}
          />

          <div className="flex min-w-[65px] flex-col items-center">
            {isUpcoming ? (
              <>
                <div className="rounded-xl bg-gray-50 px-3 py-2 dark:bg-gray-800">
                  <span className="text-xs font-extrabold text-gray-500 dark:text-gray-400">
                    VS
                  </span>
                </div>

                {match.date && (
                  <span className="mt-2 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                    {getCountdownText(match.date)}
                  </span>
                )}
              </>
            ) : (
              <>
                <div
                  className={`font-black tabular-nums tracking-tight text-gray-900 dark:text-white ${
                    compact
                      ? "text-xl"
                      : "text-2xl sm:text-3xl"
                  }`}
                >
                  {hasScore
                    ? `${homeScore} - ${awayScore}`
                    : "-"}
                </div>

                {isLive && (
                  <span className="mt-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                    {getMinute(match)}
                  </span>
                )}
              </>
            )}
          </div>

          <Team
            name={match.awayTeam.name}
            logo={match.awayTeam.logo}
            score={awayScore}
            winner={awayWon}
            align="left"
            compact={compact}
          />
        </div>

        {/* Venue */}
        {showVenue && match.venue && (
          <div className="mt-4 border-t border-gray-100 pt-3 text-center text-[11px] text-gray-400 dark:border-gray-800 dark:text-gray-500">
            {match.venue}
          </div>
        )}

        {/* Footer */}
        {!compact && (
          <div className="mt-4 flex items-center justify-end">
            <span className="flex items-center gap-1 text-xs font-semibold text-indigo-600 transition-all group-hover:gap-1.5 dark:text-indigo-400">
              Match details
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
          </div>
        )}
      </article>
    </AppLink>
  );
}

function Team({
  name,
  logo,
  score,
  winner,
  align,
  compact,
}: {
  name: string;
  logo?: string;
  score?: number | null;
  winner: boolean;
  align: "left" | "right";
  compact: boolean;
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
        <TeamInfo
          name={name}
          winner={winner}
          compact={compact}
        />
      )}

      <TeamLogo
        name={name}
        logo={logo}
        compact={compact}
      />

      {align === "left" && (
        <TeamInfo
          name={name}
          winner={winner}
          compact={compact}
        />
      )}
    </div>
  );
}

function TeamInfo({
  name,
  winner,
  compact,
}: {
  name: string;
  winner: boolean;
  compact: boolean;
}) {
  return (
    <div className="min-w-0">
      <p
        className={`truncate ${
          winner
            ? "font-extrabold text-gray-900 dark:text-white"
            : "font-semibold text-gray-600 dark:text-gray-400"
        } ${
          compact
            ? "max-w-[95px] text-xs"
            : "max-w-[120px] text-xs sm:max-w-[180px] sm:text-sm"
        }`}
      >
        {name}
      </p>

      {winner && (
        <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400">
          Winner
        </span>
      )}
    </div>
  );
}

function TeamLogo({
  name,
  logo,
  compact,
}: {
  name: string;
  logo?: string;
  compact: boolean;
}) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-50 p-1.5 dark:border-gray-700 dark:bg-gray-800 ${
        compact
          ? "h-9 w-9"
          : "h-11 w-11"
      }`}
    >
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

function StatusBadge({
  status,
  minute,
}: {
  status: MatchStatus;
  minute?: string;
}) {
  if (status === "live") {
    return (
      <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-extrabold uppercase text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400">
        <CircleDot className="h-3 w-3 animate-pulse" />
        LIVE
        {minute && (
          <span>{minute}</span>
        )}
      </span>
    );
  }

  if (status === "halftime") {
    return (
      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-extrabold uppercase text-gray-600 dark:bg-gray-800 dark:text-gray-300">
        HT
      </span>
    );
  }

  if (status === "finished") {
    return (
      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-extrabold uppercase text-gray-600 dark:bg-gray-800 dark:text-gray-300">
        FT
      </span>
    );
  }

  if (status === "postponed") {
    return (
      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-extrabold uppercase text-gray-600 dark:bg-gray-800 dark:text-gray-300">
        Postponed
      </span>
    );
  }

  if (status === "cancelled") {
    return (
      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-extrabold uppercase text-gray-600 dark:bg-gray-800 dark:text-gray-300">
        Cancelled
      </span>
    );
  }

  return (
    <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-extrabold uppercase text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
      Upcoming
    </span>
  );
}

type MatchStatus =
  | "scheduled"
  | "live"
  | "halftime"
  | "finished"
  | "postponed"
  | "cancelled"
  | "delayed"
  | "unknown";

function normalizeStatus(
  status?: string
): MatchStatus {
  if (!status) return "unknown";

  const value = status
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, "_");

  switch (value) {
    case "scheduled":
    case "upcoming":
    case "not_started":
    case "notstarted":
    case "fixture":
      return "scheduled";

    case "live":
    case "in_play":
    case "inplay":
    case "playing":
    case "first_half":
    case "second_half":
      return "live";

    case "halftime":
    case "half_time":
    case "ht":
      return "halftime";

    case "finished":
    case "full_time":
    case "fulltime":
    case "ft":
    case "completed":
      return "finished";

    case "postponed":
      return "postponed";

    case "cancelled":
    case "canceled":
      return "cancelled";

    case "delayed":
      return "delayed";

    default:
      return "unknown";
  }
}

function getMinute(match: Match) {
  const data = match as Match & {
    minute?: number;
    elapsed?: number;
    extraMinute?: number;
  };

  const minute =
    data.minute ?? data.elapsed;

  if (minute === undefined) {
    return undefined;
  }

  return `${minute}${
    data.extraMinute
      ? `+${data.extraMinute}`
      : ""
  }'`;
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
    difference / 60000
  );

  const days = Math.floor(
    totalMinutes / 1440
  );

  const hours = Math.floor(
    (totalMinutes % 1440) / 60
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