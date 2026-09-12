// src/components/sports/LiveMatchCard.tsx

"use client";

import AppLink from '@/components/AppLink';
import {
  Activity,
  ChevronRight,
  CircleDot,
  Trophy,
} from "lucide-react";

import type { Match } from "@/utils/sports/types/sports";

interface LiveMatchCardProps {
  match: Match;
  href?: string;
  className?: string;
  showCompetition?: boolean;
  showVenue?: boolean;
  compact?: boolean;
}

export default function LiveMatchCard({
  match,
  href,
  className = "",
  showCompetition = true,
  showVenue = false,
  compact = false,
}: LiveMatchCardProps) {
  const matchHref =
    href ?? `/sports/matches/${match.id}`;

  const homeScore = match.score?.home ?? 0;
  const awayScore = match.score?.away ?? 0;

  const content = (
    <div
      className={`
        group relative overflow-hidden rounded-2xl border
        border-gray-200 bg-white
        transition hover:border-indigo-600 hover:shadow-md
        dark:border-gray-800 dark:bg-gray-900
        dark:hover:border-indigo-500
        ${className}
      `}
    >
      {/* Live indicator strip */}
      <div className="absolute inset-x-0 top-0 h-1 bg-indigo-600" />

      <div
        className={
          compact
            ? "p-4"
            : "p-4 sm:p-5"
        }
      >
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
          </div>

          {/* LIVE badge */}
          <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-extrabold uppercase text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400">
            <CircleDot className="h-3 w-3 animate-pulse" />
            LIVE
          </div>
        </div>

        {/* Teams and score */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <Team
            name={match.homeTeam.name}
            logo={match.homeTeam.logo}
            score={homeScore}
            align="right"
            compact={compact}
          />

          <div className="flex min-w-[64px] flex-col items-center">
            {/* Score */}
            <div
              className={`font-black tabular-nums tracking-tight text-gray-900 dark:text-white ${
                compact
                  ? "text-xl"
                  : "text-2xl sm:text-3xl"
              }`}
            >
              {homeScore} - {awayScore}
            </div>

            {/* Match minute */}
            <div className="mt-1.5 flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 dark:bg-indigo-950/40">
              <Activity className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />

              <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400">
                {getMinute(match)}
              </span>
            </div>
          </div>

          <Team
            name={match.awayTeam.name}
            logo={match.awayTeam.logo}
            score={awayScore}
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
            <span className="flex items-center gap-1 text-xs font-semibold text-indigo-600 transition group-hover:gap-1.5 dark:text-indigo-400">
              Follow match
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <AppLink
      href={matchHref}
      className="block"
    >
      {content}
    </AppLink>
  );
}

function Team({
  name,
  logo,
  score,
  align,
  compact,
}: {
  name: string;
  logo?: string;
  score: number;
  align: "left" | "right";
  compact: boolean;
}) {
  return (
    <div
      className={`flex min-w-0 items-center gap-2 ${
        align === "right"
          ? "justify-end text-right"
          : "justify-start text-left"
      }`}
    >
      {align === "right" && (
        <TeamName
          name={name}
          score={score}
          compact={compact}
          align={align}
        />
      )}

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

      {align === "left" && (
        <TeamName
          name={name}
          score={score}
          compact={compact}
          align={align}
        />
      )}
    </div>
  );
}

function TeamName({
  name,
  compact,
}: {
  name: string;
  score: number;
  compact: boolean;
  align: "left" | "right";
}) {
  return (
    <div className="min-w-0">
      <p
        className={`truncate font-bold text-gray-900 dark:text-white ${
          compact
            ? "max-w-[90px] text-xs"
            : "max-w-[120px] text-xs sm:max-w-[170px] sm:text-sm"
        }`}
      >
        {name}
      </p>
    </div>
  );
}

function getMinute(match: Match) {
  const rawMatch = match as Match & {
    minute?: number;
    elapsed?: number;
    extraMinute?: number;
    period?: string;
  };

  const minute =
    rawMatch.minute ??
    rawMatch.elapsed;

  const extraMinute =
    rawMatch.extraMinute;

  if (rawMatch.period) {
    const period =
      rawMatch.period.toLowerCase();

    if (
      period.includes("half") &&
      period.includes("time")
    ) {
      return "HT";
    }
  }

  if (minute === undefined) {
    return "LIVE";
  }

  return `${minute}${extraMinute ? `+${extraMinute}` : ""}'`;
}