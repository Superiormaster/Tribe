"use client";

import { useMemo, useState } from "react";
import AppLink from '@/components/AppLink';
import {
  Search,
  Trophy,
  RefreshCw,
  ChevronRight,
} from "lucide-react";

import SportsHeader from "@/components/sports/SportsHeader";
import SportsSidebar from "@/components/sports/SportsSidebar";
import SportsMobileNav from "@/components/sports/SportsMobileNav";
import CompetitionCard from "@/components/sports/CompetitionCard";
import SportsAd from "@/components/sports/SportsAd";

import { useCompetitions } from "@/hooks/sports/useCompetitions";

export default function CompetitionsPage() {
  const [search, setSearch] = useState("");

  const {
    competitions,
    loading: isLoading,
    error,
    refetch,
  } = useCompetitions();

  const filteredCompetitions = useMemo(() => {
    const items = competitions ?? [];

    if (!search.trim()) {
      return items;
    }

    const query = search
      .trim()
      .toLowerCase();

    return items.filter((competition: any) => {
      const name =
        competition.name?.toLowerCase() ?? "";

      const country =
        competition.country?.name?.toLowerCase() ??
        competition.country?.toLowerCase() ??
        "";

      return (
        name.includes(query) ||
        country.includes(query)
      );
    });
  }, [competitions, search]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <SportsHeader
        title="Competitions"
        subtitle="Explore leagues and football competitions"
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
                    <Trophy className="h-5 w-5" />
                  </div>

                  <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">
                    Competitions
                  </h1>
                </div>

                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Follow your favourite leagues,
                  tournaments and competitions.
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

            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                <input
                  type="search"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search competitions..."
                  className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Ad */}
            <div className="mb-6">
              <SportsAd />
            </div>

            {/* Content */}
            {isLoading ? (
              <LoadingState />
            ) : error ? (
              <ErrorState
                onRetry={() => refetch?.()}
              />
            ) : filteredCompetitions.length ===
              0 ? (
              <EmptyState search={search} />
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-extrabold text-gray-900 dark:text-white">
                      Popular Competitions
                    </h2>

                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {filteredCompetitions.length}{" "}
                      competitions
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredCompetitions.map(
                    (competition: any) => (
                      <CompetitionCard
                        key={competition.id}
                        competition={competition}
                      />
                    )
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 9 }).map(
        (_, index) => (
          <div
            key={index}
            className="animate-pulse rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gray-200 dark:bg-gray-800" />

              <div className="flex-1 space-y-2">
                <div className="h-3 w-32 rounded bg-gray-200 dark:bg-gray-800" />
                <div className="h-2.5 w-20 rounded bg-gray-100 dark:bg-gray-800" />
              </div>
            </div>

            <div className="mt-5 h-9 w-full rounded-xl bg-gray-100 dark:bg-gray-800" />
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
    <div className="rounded-2xl border border-gray-200 bg-white px-5 py-14 text-center dark:border-gray-800 dark:bg-gray-900">
      <RefreshCw className="mx-auto h-8 w-8 text-gray-400" />

      <h2 className="mt-4 text-base font-extrabold text-gray-900 dark:text-white">
        Unable to load competitions
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
        We couldn't retrieve the competitions
        right now.
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

function EmptyState({
  search,
}: {
  search: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 py-14 text-center dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
        <Trophy className="h-6 w-6 text-gray-400 dark:text-gray-500" />
      </div>

      <h2 className="mt-4 text-base font-extrabold text-gray-900 dark:text-white">
        No competitions found
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
        {search
          ? `No competitions match "${search}".`
          : "There are no competitions available right now."}
      </p>

      {search && (
        <AppLink
          href="/sports/competitions"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-indigo-700"
        >
          View all competitions
          <ChevronRight className="h-3.5 w-3.5" />
        </AppLink>
      )}
    </div>
  );
}