// src/components/sports/TeamForm.tsx

"use client";

import AppLink from '@/components/AppLink';
import {
  ArrowRight,
  Minus,
  Trophy,
  X,
  Check,
} from "lucide-react";

import type { TeamForm as TeamFormType } from "@/utils/sports/types/sports";
import type { Match } from "@/utils/sports/types/sports";

interface TeamFormProps {
  matches: Match[];
  teamId: string;
  form?: TeamFormType[];
  title?: string;
  limit?: number;
  loading?: boolean;
  showViewAll?: boolean;
  viewAllHref?: string;
  compact?: boolean;
}

export default function TeamForm({
  form = [],
  matches = [],
  teamId,
  title = "Recent Form",
  limit = 5,
  loading = false,
  showViewAll = false,
  viewAllHref = "/sports/teams",
  compact = false,
}: TeamFormProps) {
  const visibleForm = form.slice(0, limit);

  return (
    <section className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/30">
              <Trophy className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>

            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {title}
            </h2>
          </div>

          {!compact && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Results from the team's latest matches
            </p>
          )}
        </div>

        {showViewAll && (
          <AppLink
            href={viewAllHref}
            className="hidden items-center gap-1 text-sm font-semibold text-indigo-600 transition hover:text-indigo-700 sm:flex dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            View team
            <ArrowRight className="h-4 w-4" />
          </AppLink>
        )}
      </div>

      {loading ? (
        <LoadingState compact={compact} />
      ) : visibleForm.length === 0 ? (
        <EmptyState />
      ) : (
        <div
          className={
            compact
              ? "flex items-center gap-1.5"
              : "rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
          }
        >
          {visibleForm.map((result, index) => (
            <FormItem
              key={`${result.matchId ?? index}-${index}`}
              result={result}
              compact={compact}
            />
          ))}
        </div>
      )}

      {showViewAll && (
        <AppLink
          href={viewAllHref}
          className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-indigo-600 sm:hidden dark:border-gray-800 dark:bg-gray-900 dark:text-indigo-400"
        >
          View team
          <ArrowRight className="h-4 w-4" />
        </AppLink>
      )}
    </section>
  );
}

function FormItem({
  result,
  compact,
}: {
  result: TeamFormType;
  compact: boolean;
}) {
  const outcome = normalizeResult(result.result);

  const content = (
    <div
      title={
        result.opponent
          ? `vs ${result.opponent.name}`
          : undefined
      }
      className={`
        flex shrink-0 items-center justify-center rounded-lg font-bold
        transition
        ${
          compact
            ? "h-8 w-8 text-xs"
            : "h-10 w-10 text-sm"
        }
        ${getResultClasses(outcome)}
      `}
    >
      {getResultIcon(outcome)}
    </div>
  );

  if (result.matchId) {
    return (
      <AppLink
        href={`/sports/matches/${result.matchId}`}
        className="group"
      >
        {content}
      </AppLink>
    );
  }

  return content;
}

function normalizeResult(
  result?: string
): "W" | "D" | "L" | "U" {
  if (!result) return "U";

  const value = result.toUpperCase();

  if (
    value === "W" ||
    value === "WIN" ||
    value === "WON"
  ) {
    return "W";
  }

  if (
    value === "D" ||
    value === "DRAW" ||
    value === "DRAWN"
  ) {
    return "D";
  }

  if (
    value === "L" ||
    value === "LOSS" ||
    value === "LOST"
  ) {
    return "L";
  }

  return "U";
}

function getResultClasses(
  result: "W" | "D" | "L" | "U"
) {
  switch (result) {
    case "W":
      return "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400";

    case "D":
      return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";

    case "L":
      return "bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400";

    default:
      return "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500";
  }
}

function getResultIcon(
  result: "W" | "D" | "L" | "U"
) {
  switch (result) {
    case "W":
      return <Check className="h-4 w-4" />;

    case "L":
      return <X className="h-4 w-4" />;

    case "D":
      return <Minus className="h-4 w-4" />;

    default:
      return "?";
  }
}

function LoadingState({
  compact,
}: {
  compact: boolean;
}) {
  return (
    <div
      className={
        compact
          ? "flex items-center gap-1.5"
          : "flex items-center gap-2 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
      }
    >
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className={`animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800 ${
            compact
              ? "h-8 w-8"
              : "h-10 w-10"
          }`}
        />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-6 py-8 text-center dark:border-gray-800 dark:bg-gray-900">
      <Trophy className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />

      <p className="mt-2 text-sm font-medium text-gray-500 dark:text-gray-400">
        No recent form available
      </p>
    </div>
  );
}