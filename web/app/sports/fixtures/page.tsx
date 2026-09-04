// src/app/sports/fixtures/page.tsx

"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  RefreshCw,
} from "lucide-react";

import SportsHeader from "@/components/sports/SportsHeader";
import SportsSidebar from "@/components/sports/SportsSidebar";
import SportsMobileNav from "@/components/sports/SportsMobileNav";
import UpcomingMatchCard from "@/components/sports/UpcomingMatchCard";
import SportsAd from "@/components/sports/SportsAd";
import { useMatches } from "@/hooks/sports/useMatches";

type DateFilter = "yesterday" | "today" | "tomorrow";

export default function FixturesPage() {
  const [selectedDate, setSelectedDate] =
    useState<DateFilter>("today");

  const date = useMemo(() => {
    const value = new Date();

    if (selectedDate === "yesterday") {
      value.setDate(value.getDate() - 1);
    }

    if (selectedDate === "tomorrow") {
      value.setDate(value.getDate() + 1);
    }

    return formatApiDate(value);
  }, [selectedDate]);

  const {
    matches,
    loading: isLoading,
    error,
    refetch,
  } = useMatches({
    date,
  });

  const fixtures = useMemo(() => {
    return (matches ?? []).filter((match) => {
      const status =
        match.status?.toLowerCase();

      return (
        status !== "finished" &&
        status !== "ft" &&
        status !== "cancelled" &&
        status !== "postponed"
      );
    });
  }, [matches]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <SportsHeader
        title="Fixtures"
        subtitle="Upcoming football matches and fixtures"
      />

      <SportsMobileNav />

      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex gap-8">
          <SportsSidebar />

          <section className="min-w-0 flex-1">
            {/* Page heading */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400">
                    <CalendarDays className="h-5 w-5" />
                  </div>

                  <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">
                    Fixtures
                  </h1>
                </div>

                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Find upcoming matches from your
                  favourite competitions.
                </p>
              </div>

              <button
                type="button"
                onClick={() => refetch?.()}
                disabled={isLoading}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-xs font-bold text-gray-600 transition hover:border-indigo-600 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-indigo-500 dark:hover:text-indigo-400"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    isLoading
                      ? "animate-spin"
                      : ""
                  }`}
                />
                Refresh
              </button>
            </div>

            {/* Date selector */}
            <div className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedDate("yesterday")
                  }
                  className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-4 text-xs font-bold transition sm:px-5 ${
                    selectedDate === "yesterday"
                      ? "bg-indigo-600 text-white"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                  }`}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Yesterday
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedDate("today")
                  }
                  className={`flex flex-1 items-center justify-center gap-1.5 border-x border-gray-200 px-3 py-4 text-xs font-bold transition dark:border-gray-800 sm:px-5 ${
                    selectedDate === "today"
                      ? "bg-indigo-600 text-white"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                  }`}
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  Today
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedDate("tomorrow")
                  }
                  className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-4 text-xs font-bold transition sm:px-5 ${
                    selectedDate === "tomorrow"
                      ? "bg-indigo-600 text-white"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                  }`}
                >
                  Tomorrow
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Ad placement */}
            <div className="mb-6">
              <SportsAd />
            </div>

            {/* Results */}
            {isLoading ? (
              <LoadingState />
            ) : error ? (
              <ErrorState
                onRetry={() => refetch?.()}
              />
            ) : fixtures.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="space-y-6">
                {groupFixturesByCompetition(
                  fixtures
                ).map((group) => (
                  <FixtureGroup
                    key={group.key}
                    name={group.name}
                    logo={group.logo}
                    matches={group.matches}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function FixtureGroup({
  name,
  logo,
  matches,
}: {
  name: string;
  logo?: string;
  matches: any[];
}) {
  return (
    <section>
      {/* Competition heading */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white p-1.5 dark:border-gray-800 dark:bg-gray-900">
            {logo ? (
              <img
                src={logo}
                alt=""
                className="h-full w-full object-contain"
              />
            ) : (
              <Filter className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            )}
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-sm font-extrabold text-gray-900 dark:text-white">
              {name}
            </h2>

            <p className="text-[11px] text-gray-400 dark:text-gray-500">
              {matches.length}{" "}
              {matches.length === 1
                ? "fixture"
                : "fixtures"}
            </p>
          </div>
        </div>
      </div>

      {/* Fixtures */}
      <div className="grid gap-3 md:grid-cols-2">
        {matches.map((match) => (
          <UpcomingMatchCard
            key={match.id}
            match={match}
          />
        ))}
      </div>
    </section>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {Array.from({ length: 6 }).map(
        (_, index) => (
          <div
            key={index}
            className="animate-pulse rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="mb-5 flex justify-between">
              <div className="space-y-2">
                <div className="h-3 w-28 rounded bg-gray-200 dark:bg-gray-800" />
                <div className="h-2.5 w-20 rounded bg-gray-100 dark:bg-gray-800" />
              </div>

              <div className="h-6 w-16 rounded-full bg-gray-100 dark:bg-gray-800" />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-1 items-center justify-end gap-2">
                <div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-800" />
                <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-800" />
              </div>

              <div className="h-9 w-12 rounded-xl bg-gray-100 dark:bg-gray-800" />

              <div className="flex flex-1 items-center gap-2">
                <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-800" />
                <div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-800" />
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}

function ErrorState({
  onRetry,
}: {
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 py-12 text-center dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
        <RefreshCw className="h-5 w-5 text-gray-500 dark:text-gray-400" />
      </div>

      <h2 className="mt-4 text-base font-bold text-gray-900 dark:text-white">
        Unable to load fixtures
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
        We couldn't retrieve the fixtures right
        now. Please try again.
      </p>

      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-indigo-700"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Try again
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 py-14 text-center dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
        <CalendarDays className="h-6 w-6 text-gray-400 dark:text-gray-500" />
      </div>

      <h2 className="mt-4 text-base font-bold text-gray-900 dark:text-white">
        No fixtures found
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
        There are no upcoming matches available
        for the selected date.
      </p>
    </div>
  );
}

function groupFixturesByCompetition(
  matches: any[]
) {
  const groups = new Map<
    string,
    {
      key: string;
      name: string;
      logo?: string;
      matches: any[];
    }
  >();

  matches.forEach((match) => {
    const competition =
      match.competition;

    const key =
      competition?.id?.toString() ??
      competition?.name ??
      "other";

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        name:
          competition?.name ??
          "Other Fixtures",
        logo: competition?.logo,
        matches: [],
      });
    }

    groups.get(key)!.matches.push(match);
  });

  return Array.from(groups.values());
}

function formatApiDate(date: Date) {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}