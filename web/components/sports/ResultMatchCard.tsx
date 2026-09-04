"use client";

import {
  CalendarDays,
  CheckCircle2,
} from "lucide-react";

interface ResultMatchCardProps {
  match: any;
}

export default function ResultMatchCard({
  match,
}: ResultMatchCardProps) {
  const homeTeam =
    match?.home_team ??
    match?.homeTeam ??
    match?.home ??
    {};

  const awayTeam =
    match?.away_team ??
    match?.awayTeam ??
    match?.away ??
    {};

  const homeName =
    homeTeam?.name ??
    match?.home_team_name ??
    "Home";

  const awayName =
    awayTeam?.name ??
    match?.away_team_name ??
    "Away";

  const homeLogo =
    homeTeam?.logo ??
    homeTeam?.image ??
    homeTeam?.crest ??
    null;

  const awayLogo =
    awayTeam?.logo ??
    awayTeam?.image ??
    awayTeam?.crest ??
    null;

  const homeScore =
    match?.home_score ??
    match?.homeScore ??
    match?.scores?.home ??
    0;

  const awayScore =
    match?.away_score ??
    match?.awayScore ??
    match?.scores?.away ??
    0;

  const dateValue =
    match?.date ??
    match?.match_date ??
    match?.start_time ??
    match?.kickoff;

  const formattedDate = dateValue
    ? new Date(dateValue).toLocaleDateString(
        "en-NG",
        {
          day: "numeric",
          month: "short",
          year: "numeric",
        }
      )
    : null;

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-gray-400">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />

          <span>Full Time</span>
        </div>

        {formattedDate && (
          <div className="flex items-center gap-1 text-[10px] text-gray-400">
            <CalendarDays className="h-3 w-3" />
            {formattedDate}
          </div>
        )}
      </div>

      {/* Teams */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        {/* Home */}
        <div className="min-w-0 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center">
            {homeLogo ? (
              <img
                src={homeLogo}
                alt=""
                className="h-10 w-10 object-contain"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-400 dark:bg-gray-800">
                {homeName
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
            )}
          </div>

          <p className="mt-2 truncate text-xs font-bold text-gray-900 dark:text-white">
            {homeName}
          </p>
        </div>

        {/* Score */}
        <div className="text-center">
          <div className="flex items-center gap-2 text-xl font-extrabold text-gray-900 dark:text-white">
            <span>{homeScore}</span>

            <span className="text-gray-300 dark:text-gray-600">
              -
            </span>

            <span>{awayScore}</span>
          </div>
        </div>

        {/* Away */}
        <div className="min-w-0 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center">
            {awayLogo ? (
              <img
                src={awayLogo}
                alt=""
                className="h-10 w-10 object-contain"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-400 dark:bg-gray-800">
                {awayName
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
            )}
          </div>

          <p className="mt-2 truncate text-xs font-bold text-gray-900 dark:text-white">
            {awayName}
          </p>
        </div>
      </div>
    </article>
  );
}