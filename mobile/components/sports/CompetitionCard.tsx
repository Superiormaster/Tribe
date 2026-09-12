// src/components/sports/CompetitionCard.tsx

"use client";

import AppLink from '@/components/AppLink';
import {
  ArrowRight,
  CalendarDays,
  Globe2,
  Trophy,
} from "lucide-react";

import type { Competition } from "@/utils/sports/types/sports";

interface CompetitionCardProps {
  competition: Competition;
  href?: string;
  className?: string;
}

export default function CompetitionCard({
  competition,
  href,
  className = "",
}: CompetitionCardProps) {
  const competitionHref =
    href ?? `/sports/competitions/${competition.id}`;

  return (
    <AppLink
      href={competitionHref}
      className={`group block overflow-hidden rounded-2xl border border-gray-200 bg-white transition duration-200 hover:-translate-y-0.5 hover:border-indigo-600 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-indigo-500 ${className}`}
    >
      {/* Header */}
      <div className="relative overflow-hidden bg-gray-50 px-5 py-6 dark:bg-gray-800/60">
        <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-indigo-600/10 transition duration-300 group-hover:scale-125" />

        <div className="relative flex items-start justify-between gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-white p-2 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            {competition.logo ? (
              <img
                src={competition.logo}
                alt={competition.name}
                className="h-full w-full object-contain"
              />
            ) : (
              <Trophy className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            )}
          </div>

          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-gray-400 transition group-hover:bg-indigo-600 group-hover:text-white dark:bg-gray-900 dark:text-gray-500 dark:group-hover:bg-indigo-600">
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-base font-bold leading-5 text-gray-900 transition group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
            {competition.name}
          </h3>

          {competition.shortName &&
            competition.shortName !==
              competition.name && (
              <p className="mt-1 truncate text-xs font-medium text-gray-500 dark:text-gray-400">
                {competition.shortName}
              </p>
            )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500 dark:text-gray-400">
          {competition.country && (
            <span className="flex items-center gap-1.5">
              <Globe2 className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="truncate">
                {competition.country}
              </span>
            </span>
          )}

          {competition.season && (
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              {competition.season}
            </span>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            View competition
          </span>

          <span className="text-xs text-gray-400 transition group-hover:text-indigo-600 dark:text-gray-500 dark:group-hover:text-indigo-400">
            Explore
          </span>
        </div>
      </div>
    </AppLink>
  );
}