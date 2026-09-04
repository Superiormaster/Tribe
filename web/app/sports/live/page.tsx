"use client";

import AppLink from '@/components/AppLink';
import {
  ArrowLeft,
  CalendarDays,
  RefreshCw,
  Radio,
  Tv,
} from "lucide-react";
import { useMemo } from "react";

import SportsHeader from "@/components/sports/SportsHeader";
import SportsSidebar from "@/components/sports/SportsSidebar";
import SportsMobileNav from "@/components/sports/SportsMobileNav";
import SportsAd from "@/components/sports/SportsAd";
import LiveMatchCard from "@/components/sports/LiveMatchCard";

import { useLiveMatches } from "@/hooks/sports/useLiveMatches";

export default function LivePage() {
  const {
    matches,
    loading: isLoading,
    error,
    refetch,
  } = useLiveMatches();

  const liveMatches = useMemo(() => {
    return matches ?? [];
  }, [matches]);

  const handleRefresh = () => {
    refetch?.();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <SportsHeader
        title="Live Matches"
        subtitle="Follow football matches happening right now"
      />

      <SportsMobileNav />

      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex gap-8">
          <SportsSidebar />

          <section className="min-w-0 flex-1">
            {/* Top navigation */}
            <div className="mb-5 flex items-center justify-between">
              <AppLink
                href="/sports"
                className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 transition hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400"
              >
                <ArrowLeft className="h-4 w-4" />
                Sports home
              </AppLink>

              <button
                type="button"
                onClick={handleRefresh}
                disabled={isLoading}
                className="inline-flex h-9 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold text-gray-500 transition hover:border-indigo-600 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-indigo-500 dark:hover:text-indigo-400"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${
                    isLoading
                      ? "animate-spin"
                      : ""
                  }`}
                />
                Refresh
              </button>
            </div>

            {/* Hero */}
            <LiveHero count={liveMatches.length} />

            {/* Top ad */}
            <div className="my-6">
              <SportsAd />
            </div>

            {/* Content */}
            {isLoading ? (
              <LoadingState />
            ) : error ? (
              <ErrorState onRetry={handleRefresh} />
            ) : liveMatches.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">
                      Matches happening now
                    </h2>

                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Live scores and match status
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-red-600 dark:bg-red-950/30 dark:text-red-400">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                    Live
                  </div>
                </div>

                <div className="space-y-4">
                  {liveMatches.map(
                    (match: any) => (
                      <LiveMatchCard
                        key={match.id}
                        match={match}
                      />
                    )
                  )}
                </div>

                {/* Bottom ad */}
                <div className="mt-8">
                  <SportsAd />
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function LiveHero({
  count,
}: {
  count: number;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-white p-5 dark:border-indigo-950/50 dark:bg-gray-900 sm:p-7">
      <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-indigo-100/70 blur-3xl dark:bg-indigo-950/30" />

      <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-red-600 dark:bg-red-950/30 dark:text-red-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
            Live now
          </div>

          <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white sm:text-3xl">
            Live football
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500 dark:text-gray-400">
            Follow today's matches with live
            scores, match status and updates in
            real time.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400">
            <Radio className="h-6 w-6" />
          </div>

          <div>
            <p className="text-2xl font-black text-gray-900 dark:text-white">
              {count}
            </p>

            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Live matches
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white px-6 py-16 text-center dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400">
        <Tv className="h-7 w-7" />
      </div>

      <h2 className="mt-5 text-lg font-extrabold text-gray-900 dark:text-white">
        No live matches right now
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500 dark:text-gray-400">
        There are currently no football matches
        being played. Check the fixtures to see
        what's coming up.
      </p>

      <AppLink
        href="/sports/fixtures"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-indigo-700"
      >
        <CalendarDays className="h-3.5 w-3.5" />
        View fixtures
      </AppLink>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map(
        (_, index) => (
          <div
            key={index}
            className="animate-pulse rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="h-5 w-20 rounded-full bg-gray-200 dark:bg-gray-800" />
              <div className="h-4 w-16 rounded bg-gray-100 dark:bg-gray-800" />
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
              <div className="space-y-2">
                <div className="ml-auto h-4 w-28 rounded bg-gray-200 dark:bg-gray-800" />
                <div className="ml-auto h-3 w-16 rounded bg-gray-100 dark:bg-gray-800" />
              </div>

              <div className="h-8 w-14 rounded bg-gray-200 dark:bg-gray-800" />

              <div className="space-y-2">
                <div className="h-4 w-28 rounded bg-gray-200 dark:bg-gray-800" />
                <div className="h-3 w-16 rounded bg-gray-100 dark:bg-gray-800" />
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
  onRetry: () => void;
}) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white px-6 py-14 text-center dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
        <Radio className="h-6 w-6 text-gray-400" />
      </div>

      <h2 className="mt-4 text-lg font-extrabold text-gray-900 dark:text-white">
        Unable to load live matches
      </h2>

      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        Something went wrong while retrieving
        the live scores.
      </p>

      <button
        type="button"
        onClick={onRetry}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-indigo-700"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Try again
      </button>
    </div>
  );
}