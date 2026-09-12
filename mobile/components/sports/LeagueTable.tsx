// src/components/sports/LeagueTable.tsx

"use client";

import AppLink from '@/components/AppLink';
import {
  ArrowRight,
  Trophy,
} from "lucide-react";

import type { StandingRow } from "@/utils/sports/types/sports";

interface LeagueTableProps {
  standings?: StandingRow[];
  title?: string;
  limit?: number;
  loading?: boolean;
  showViewAll?: boolean;
  viewAllHref?: string;
}

export default function LeagueTable({
  standings = [],
  title = "League Table",
  limit = 10,
  loading = false,
  showViewAll = true,
  viewAllHref = "/sports/standings",
}: LeagueTableProps) {
  const visibleStandings = standings.slice(0, limit);

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
            Current standings and team positions
          </p>
        </div>

        {showViewAll && (
          <AppLink
            href={viewAllHref}
            className="hidden items-center gap-1 text-sm font-semibold text-indigo-600 transition hover:text-indigo-700 sm:flex dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            Full table
            <ArrowRight className="h-4 w-4" />
          </AppLink>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        {loading ? (
          <LoadingState />
        ) : visibleStandings.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-400">
                  <th className="w-12 px-4 py-3 text-center">
                    #
                  </th>

                  <th className="px-2 py-3">
                    Team
                  </th>

                  <th className="px-3 py-3 text-center">
                    P
                  </th>

                  <th className="px-3 py-3 text-center">
                    W
                  </th>

                  <th className="px-3 py-3 text-center">
                    D
                  </th>

                  <th className="px-3 py-3 text-center">
                    L
                  </th>

                  <th className="px-3 py-3 text-center">
                    GD
                  </th>

                  <th className="px-4 py-3 text-center">
                    Pts
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {visibleStandings.map(
                  (standing) => (
                    <StandingRowItem
                      key={standing.team.id}
                      standing={standing}
                    />
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showViewAll && (
        <AppLink
          href={viewAllHref}
          className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-indigo-600 transition hover:bg-gray-50 sm:hidden dark:border-gray-800 dark:bg-gray-900 dark:text-indigo-400 dark:hover:bg-gray-800"
        >
          View full table
          <ArrowRight className="h-4 w-4" />
        </AppLink>
      )}
    </section>
  );
}

function StandingRowItem({
  standing,
}: {
  standing: StandingRow;
}) {
  const position = standing.position;

  return (
    <tr className="group transition hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <td className="px-4 py-3 text-center">
        <div className="flex items-center justify-center gap-1.5">
          <PositionIndicator position={position} />

          <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
            {position}
          </span>
        </div>
      </td>

      <td className="px-2 py-3">
        <AppLink
          href={`/sports/teams/${standing.team.id}`}
          className="flex min-w-0 items-center gap-3"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            {standing.team.logo ? (
              <img
                src={standing.team.logo}
                alt=""
                className="h-full w-full object-contain"
              />
            ) : (
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                {standing.team.name.charAt(0)}
              </span>
            )}
          </div>

          <span className="max-w-[180px] truncate text-sm font-semibold text-gray-900 transition group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
            {standing.team.name}
          </span>
        </AppLink>
      </td>

      <td className="px-3 py-3 text-center text-sm text-gray-600 dark:text-gray-400">
        {standing.played}
      </td>

      <td className="px-3 py-3 text-center text-sm text-gray-600 dark:text-gray-400">
        {standing.wins}
      </td>

      <td className="px-3 py-3 text-center text-sm text-gray-600 dark:text-gray-400">
        {standing.draws}
      </td>

      <td className="px-3 py-3 text-center text-sm text-gray-600 dark:text-gray-400">
        {standing.losses}
      </td>

      <td
        className={`px-3 py-3 text-center text-sm font-medium ${
          standing.goalDifference > 0
            ? "text-green-600 dark:text-green-400"
            : standing.goalDifference < 0
              ? "text-red-600 dark:text-red-400"
              : "text-gray-500 dark:text-gray-400"
        }`}
      >
        {standing.goalDifference > 0
          ? `+${standing.goalDifference}`
          : standing.goalDifference}
      </td>

      <td className="px-4 py-3 text-center text-sm font-extrabold text-gray-900 dark:text-white">
        {standing.points}
      </td>
    </tr>
  );
}

function PositionIndicator({
  position,
}: {
  position: number;
}) {
  if (position === 1) {
    return (
      <span
        className="h-5 w-1 rounded-full bg-indigo-600"
        aria-hidden="true"
      />
    );
  }

  if (position >= 2 && position <= 4) {
    return (
      <span
        className="h-5 w-1 rounded-full bg-gray-400 dark:bg-gray-600"
        aria-hidden="true"
      />
    );
  }

  return (
    <span
      className="h-5 w-1 rounded-full bg-gray-200 dark:bg-gray-800"
      aria-hidden="true"
    />
  );
}

function LoadingState() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center gap-4 border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/50">
        {Array.from({ length: 7 }).map(
          (_, index) => (
            <div
              key={index}
              className="h-3 flex-1 rounded bg-gray-200 dark:bg-gray-700"
            />
          )
        )}
      </div>

      {Array.from({ length: 6 }).map(
        (_, index) => (
          <div
            key={index}
            className="flex items-center gap-4 border-b border-gray-200 px-4 py-4 dark:border-gray-800"
          >
            <div className="h-4 w-6 rounded bg-gray-200 dark:bg-gray-800" />

            <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-800" />

            <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-800" />

            <div className="ml-auto h-4 w-8 rounded bg-gray-200 dark:bg-gray-800" />
          </div>
        )
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="px-6 py-12 text-center">
      <Trophy className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />

      <h3 className="mt-3 font-semibold text-gray-900 dark:text-gray-100">
        No standings available
      </h3>

      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        League standings will appear here when
        available.
      </p>
    </div>
  );
}