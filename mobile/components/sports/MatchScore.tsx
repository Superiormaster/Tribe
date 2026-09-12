// src/components/sports/MatchScore.tsx

"use client";

import AppLink from '@/components/AppLink';
import {
  ChevronRight,
  CircleDot,
  Minus,
  Trophy,
} from "lucide-react";

interface MatchScoreProps {
  homeTeam: {
    id?: string | number;
    name: string;
    shortName?: string;
    logo?: string;
  };
  awayTeam: {
    id?: string | number;
    name: string;
    shortName?: string;
    logo?: string;
  };
  homeScore?: number | null;
  awayScore?: number | null;
  homeHalfTimeScore?: number | null;
  awayHalfTimeScore?: number | null;
  status?: string;
  minute?: number;
  extraMinute?: number;
  competitionName?: string;
  competitionLogo?: string;
  matchDate?: string | Date;
  venue?: string;
  showHalfTimeScore?: boolean;
  showCompetition?: boolean;
  showVenue?: boolean;
  compact?: boolean;
  clickable?: boolean;
  matchHref?: string;
  className?: string;
}

export default function MatchScore({
  homeTeam,
  awayTeam,
  homeScore = null,
  awayScore = null,
  homeHalfTimeScore = null,
  awayHalfTimeScore = null,
  status = "scheduled",
  minute,
  extraMinute,
  competitionName,
  competitionLogo,
  matchDate,
  venue,
  showHalfTimeScore = true,
  showCompetition = true,
  showVenue = true,
  compact = false,
  clickable = true,
  matchHref,
  className = "",
}: MatchScoreProps) {
  const normalizedStatus = normalizeStatus(status);

  const isLive =
    normalizedStatus === "live" ||
    normalizedStatus === "halftime";

  const isFinished =
    normalizedStatus === "finished";

  const isUpcoming =
    normalizedStatus === "scheduled" ||
    normalizedStatus === "delayed";

  const hasScore =
    homeScore !== null &&
    homeScore !== undefined &&
    awayScore !== null &&
    awayScore !== undefined;

  const content = (
    <div
      className={`
        relative overflow-hidden rounded-3xl border
        border-gray-200 bg-white
        dark:border-gray-800 dark:bg-gray-900
        ${className}
      `}
    >
      {/* Decorative background */}
      {!compact && (
        <>
          <div className="absolute -right-24 -top-24 h-56 w-56 rounded-full bg-indigo-600/10" />
          <div className="absolute -bottom-28 -left-20 h-56 w-56 rounded-full bg-gray-200/40 dark:bg-gray-800/40" />
        </>
      )}

      <div
        className={`relative ${
          compact
            ? "p-4"
            : "px-5 py-6 sm:px-8 sm:py-8"
        }`}
      >
        {/* Competition */}
        {showCompetition &&
          competitionName && (
            <div className="mb-5 flex items-center justify-center gap-2">
              {competitionLogo ? (
                <img
                  src={competitionLogo}
                  alt=""
                  className="h-5 w-5 object-contain"
                />
              ) : (
                <Trophy className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              )}

              <span className="max-w-[220px] truncate text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {competitionName}
              </span>
            </div>
          )}

        {/* Teams + score */}
        <div
          className={`grid grid-cols-[1fr_auto_1fr] items-center ${
            compact
              ? "gap-3"
              : "gap-4 sm:gap-8"
          }`}
        >
          <Team
            team={homeTeam}
            align="right"
            compact={compact}
          />

          <div className="flex min-w-[80px] flex-col items-center sm:min-w-[110px]">
            {isUpcoming ? (
              <span
                className={`font-extrabold text-gray-400 ${
                  compact
                    ? "text-lg"
                    : "text-xl sm:text-2xl"
                }`}
              >
                VS
              </span>
            ) : (
              <div
                className={`font-black tabular-nums tracking-tight text-gray-900 dark:text-white ${
                  compact
                    ? "text-2xl"
                    : "text-3xl sm:text-4xl"
                }`}
              >
                {hasScore
                  ? `${homeScore} - ${awayScore}`
                  : "-"}
              </div>
            )}

            {/* Status */}
            <div className="mt-2">
              <ScoreStatus
                status={normalizedStatus}
                minute={minute}
                extraMinute={extraMinute}
              />
            </div>

            {/* Half time */}
            {showHalfTimeScore &&
              homeHalfTimeScore !== null &&
              awayHalfTimeScore !== null && (
                <span className="mt-2 text-[10px] font-medium text-gray-400 dark:text-gray-500">
                  HT {homeHalfTimeScore} -{" "}
                  {awayHalfTimeScore}
                </span>
              )}
          </div>

          <Team
            team={awayTeam}
            align="left"
            compact={compact}
          />
        </div>

        {/* Match metadata */}
        {!compact &&
          (matchDate || (showVenue && venue)) && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-gray-100 pt-5 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
              {matchDate && (
                <span>
                  {formatDate(matchDate)}
                  {" · "}
                  {formatTime(matchDate)}
                </span>
              )}

              {showVenue && venue && (
                <span className="max-w-[240px] truncate">
                  {venue}
                </span>
              )}
            </div>
          )}
      </div>

      {/* Mobile/detail arrow */}
      {clickable && !compact && (
        <div className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 text-gray-400 dark:bg-gray-800 dark:text-gray-500">
          <ChevronRight className="h-4 w-4" />
        </div>
      )}
    </div>
  );

  if (!clickable) {
    return content;
  }

  const href =
    matchHref ??
    undefined;

  if (!href) {
    return content;
  }

  return (
    <AppLink
      href={href}
      className="group block"
    >
      {content}
    </AppLink>
  );
}

function Team({
  team,
  align,
  compact,
}: {
  team: MatchScoreProps["homeTeam"];
  align: "left" | "right";
  compact: boolean;
}) {
  const logo = (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-50 p-2 shadow-sm dark:border-gray-700 dark:bg-gray-800 ${
        compact
          ? "h-10 w-10"
          : "h-14 w-14 sm:h-16 sm:w-16"
      }`}
    >
      {team.logo ? (
        <img
          src={team.logo}
          alt={team.name}
          className="h-full w-full object-contain"
        />
      ) : (
        <span
          className={`font-extrabold text-indigo-600 dark:text-indigo-400 ${
            compact ? "text-xs" : "text-sm"
          }`}
        >
          {team.name.charAt(0)}
        </span>
      )}
    </div>
  );

  return (
    <div
      className={`flex min-w-0 items-center gap-2 sm:gap-3 ${
        align === "right"
          ? "justify-end text-right"
          : "justify-start text-left"
      }`}
    >
      {align === "right" && (
        <div className="min-w-0">
          <p
            className={`truncate font-bold text-gray-900 dark:text-white ${
              compact
                ? "text-xs"
                : "text-sm sm:text-base"
            }`}
          >
            <span className="sm:hidden">
              {team.shortName || team.name}
            </span>

            <span className="hidden sm:inline">
              {team.name}
            </span>
          </p>
        </div>
      )}

      {logo}

      {align === "left" && (
        <div className="min-w-0">
          <p
            className={`truncate font-bold text-gray-900 dark:text-white ${
              compact
                ? "text-xs"
                : "text-sm sm:text-base"
            }`}
          >
            <span className="sm:hidden">
              {team.shortName || team.name}
            </span>

            <span className="hidden sm:inline">
              {team.name}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

function ScoreStatus({
  status,
  minute,
  extraMinute,
}: {
  status: NormalizedStatus;
  minute?: number;
  extraMinute?: number;
}) {
  if (status === "live") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-extrabold uppercase text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400">
        <CircleDot className="h-3 w-3 animate-pulse" />

        <span>LIVE</span>

        {minute !== undefined && (
          <span>
            {minute}
            {extraMinute
              ? `+${extraMinute}`
              : ""}
            '
          </span>
        )}
      </span>
    );
  }

  if (status === "halftime") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-extrabold uppercase text-gray-600 dark:bg-gray-800 dark:text-gray-300">
        HT
      </span>
    );
  }

  if (status === "finished") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-extrabold uppercase text-gray-600 dark:bg-gray-800 dark:text-gray-300">
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
    <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-extrabold text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
      <Minus className="h-3 w-3" />
      Upcoming
    </span>
  );
}

type NormalizedStatus =
  | "scheduled"
  | "live"
  | "halftime"
  | "finished"
  | "postponed"
  | "cancelled"
  | "unknown"
  | "delayed";

function normalizeStatus(
  status?: string
): NormalizedStatus {
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

function formatDate(value: string | Date) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value: string | Date) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}