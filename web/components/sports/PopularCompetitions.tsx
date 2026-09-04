// src/components/sports/PopularCompetitions.tsx

"use client";

import AppLink from '@/components/AppLink';
import {
  ChevronRight,
  Trophy,
} from "lucide-react";

import type { Competition } from "@/utils/sports/types/sports";

interface PopularCompetitionsProps {
  competitions?: Competition[];
  title?: string;
  limit?: number;
  loading?: boolean;
  showViewAll?: boolean;
  viewAllHref?: string;
}

export default function PopularCompetitions({
  competitions = [],
  title = "Popular Competitions",
  limit = 6,
  loading = false,
  showViewAll = true,
  viewAllHref = "/sports/competitions",
}: PopularCompetitionsProps) {
  const visibleCompetitions =
    competitions.slice(0, limit);

  return (
    <section className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/30">
              <Trophy className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>

            <h2 className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
              {title}
            </h2>
          </div>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Follow the competitions you love
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

      {loading ? (
        <LoadingState />
      ) : visibleCompetitions.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {visibleCompetitions.map((competition) => (
            <CompetitionCard
              key={competition.id}
              competition={competition}
            />
          ))}
        </div>
      )}

      {showViewAll && (
        <AppLink
          href={viewAllHref}
          className="mt-3 flex items-center justify-center gap-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-indigo-600 transition hover:bg-gray-50 sm:hidden dark:border-gray-800 dark:bg-gray-900 dark:text-indigo-400 dark:hover:bg-gray-800"
        >
          View all competitions
          <ChevronRight className="h-4 w-4" />
        </AppLink>
      )}
    </section>
  );
}

function CompetitionCard({
  competition,
}: {
  competition: Competition;
}) {
  return (
    <AppLink
      href={`/sports/competitions/${competition.id}`}
      className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 transition duration-200 hover:-translate-y-0.5 hover:border-indigo-600 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-indigo-500"
    >
      <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-indigo-50 transition group-hover:scale-125 dark:bg-indigo-950/30" />

      <div className="relative">
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
          {competition.logo ? (
            <img
              src={competition.logo}
              alt={competition.name}
              className="h-9 w-9 object-contain"
            />
          ) : (
            <Trophy className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          )}
        </div>

        <h3 className="mt-4 line-clamp-2 text-sm font-bold text-gray-900 dark:text-white">
          {competition.shortName ||
            competition.name}
        </h3>

        {competition.country && (
          <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
            {competition.country}
          </p>
        )}

        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
            View competition
          </span>

          <ChevronRight className="h-4 w-4 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-600 dark:text-gray-600 dark:group-hover:text-indigo-400" />
        </div>
      </div>
    </AppLink>
  );
}

function LoadingState() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="h-12 w-12 rounded-xl bg-gray-200 dark:bg-gray-800" />

          <div className="mt-4 h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-800" />

          <div className="mt-2 h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-800" />

          <div className="mt-5 h-3 w-2/3 rounded bg-gray-200 dark:bg-gray-800" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-6 py-10 text-center dark:border-gray-800 dark:bg-gray-900">
      <Trophy className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />

      <h3 className="mt-3 font-semibold text-gray-900 dark:text-gray-100">
        No competitions available
      </h3>

      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Competitions will appear here when they are available.
      </p>
    </div>
  );
}