"use client";

import AppLink from '@/components/AppLink';
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  RefreshCw,
  Trophy,
} from "lucide-react";

import SportsHeader from "@/components/sports/SportsHeader";
import SportsSidebar from "@/components/sports/SportsSidebar";
import SportsMobileNav from "@/components/sports/SportsMobileNav";
import SportsAd from "@/components/sports/SportsAd";

import CompetitionHeader from "@/components/sports/CompetitionHeader";
import LeagueTable from "@/components/sports/LeagueTable";
import UpcomingMatchCard from "@/components/sports/UpcomingMatchCard";
import ResultMatchCard from "@/components/sports/ResultMatchCard";

import { useCompetition } from "@/hooks/sports/useCompetition";
import { useMatches } from "@/hooks/sports/useMatches";
import { useStandings } from "@/hooks/sports/useStandings";

interface CompetitionPageProps {
  params: {
    competitionId: string;
  };
}

type Tab =
  | "overview"
  | "matches"
  | "standings";

export default function CompetitionPage({
  params,
}: CompetitionPageProps) {
  const [activeTab, setActiveTab] =
    useState<Tab>("overview");

  const {
    competition,
    loading: competitionLoading,
    error: competitionError,
    refetch: refetchCompetition,
  } = useCompetition({
    competitionId: params.competitionId,
  });
  
  const {
    matches,
    loading: matchesLoading,
    refetch: refetchMatches,
  } = useMatches({
    competitionId: params.competitionId,
  });
  
  const {
    standings,
    loading: standingsLoading,
    error: standingsError,
    refetch: refetchStandings,
  } = useStandings({
    competitionId: params.competitionId,
  });
  
  const competitionMatches = matches;

  const upcomingMatches = useMemo(() => {
    return competitionMatches.filter(
      isUpcomingMatch
    );
  }, [competitionMatches]);

  const results = useMemo(() => {
    return competitionMatches.filter(
      isFinishedMatch
    );
  }, [competitionMatches]);
  
  const loading =
    competitionLoading ||
    matchesLoading ||
    standingsLoading;
  
  const handleRefresh = () => {
    refetchCompetition?.();
    refetchMatches?.();
    refetchStandings?.();
  };

  if (competitionLoading) {
    return <LoadingPage />;
  }

  if (competitionError) {
    return (
      <ErrorPage
        onRetry={handleRefresh}
      />
    );
  }

  if (!competition) {
    return <NotFoundPage />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <SportsHeader
        title={
          competition.name ?? "Competition"
        }
        subtitle="Competition centre"
      />

      <SportsMobileNav />

      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex gap-8">
          <SportsSidebar />

          <section className="min-w-0 flex-1">
            {/* Back button */}
            <div className="mb-5 flex items-center justify-between">
              <AppLink
                href="/sports/competitions"
                className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 transition hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400"
              >
                <ArrowLeft className="h-4 w-4" />
                All competitions
              </AppLink>

              <button
                type="button"
                onClick={handleRefresh}
                disabled={loading}
                className="flex h-9 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold text-gray-500 transition hover:border-indigo-600 hover:text-indigo-600 disabled:opacity-60 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-indigo-500 dark:hover:text-indigo-400"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${
                    loading
                      ? "animate-spin"
                      : ""
                  }`}
                />
                Refresh
              </button>
            </div>

            {/* Competition header */}
            <CompetitionHeader
              competition={competition}
            />

            {/* Ad */}
            <div className="my-6">
              <SportsAd />
            </div>

            {/* Tabs */}
            <div className="overflow-x-auto border-b border-gray-200 dark:border-gray-800">
              <div className="flex min-w-max">
                <TabButton
                  label="Overview"
                  active={activeTab === "overview"}
                  onClick={() =>
                    setActiveTab("overview")
                  }
                />

                <TabButton
                  label="Matches"
                  active={activeTab === "matches"}
                  onClick={() =>
                    setActiveTab("matches")
                  }
                />

                <TabButton
                  label="Standings"
                  active={
                    activeTab === "standings"
                  }
                  onClick={() =>
                    setActiveTab("standings")
                  }
                />
              </div>
            </div>

            {/* Content */}
            <div className="mt-6">
              {activeTab === "overview" && (
                <Overview
                  competition={competition}
                  upcomingMatches={upcomingMatches}
                  results={results}
                  onMatches={() =>
                    setActiveTab("matches")
                  }
                  onStandings={() =>
                    setActiveTab("standings")
                  }
                />
              )}

              {activeTab === "matches" && (
                <MatchesTab
                  upcomingMatches={
                    upcomingMatches
                  }
                  results={results}
                />
              )}

              {activeTab === "standings" && (
                <StandingsTab
                  standings={standings}
                  loading={standingsLoading}
                />
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function Overview({
  competition,
  upcomingMatches,
  results,
  onMatches,
  onStandings,
}: {
  competition: any;
  upcomingMatches: any[];
  results: any[];
  onMatches: () => void;
  onStandings: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Competition information */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 p-2 dark:bg-indigo-950/30">
            {competition.logo ? (
              <img
                src={competition.logo}
                alt=""
                className="h-full w-full object-contain"
              />
            ) : (
              <Trophy className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            )}
          </div>

          <div>
            <h2 className="text-base font-extrabold text-gray-900 dark:text-white">
              {competition.name}
            </h2>

            {(competition.country?.name ||
              competition.country) && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {competition.country?.name ??
                  competition.country}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <StatBox
            label="Upcoming"
            value={upcomingMatches.length}
          />

          <StatBox
            label="Results"
            value={results.length}
          />

          <StatBox
            label="Season"
            value={
              competition.season?.name ??
              competition.season ??
              "Current"
            }
          />
        </div>
      </section>

      {/* Quick links */}
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onMatches}
          className="group rounded-2xl border border-gray-200 bg-white p-5 text-left transition hover:border-indigo-500 dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400">
              <CalendarDays className="h-5 w-5" />
            </div>

            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
              View
            </span>
          </div>

          <h3 className="mt-4 text-sm font-extrabold text-gray-900 dark:text-white">
            Fixtures & Results
          </h3>

          <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
            Follow upcoming fixtures and
            completed matches.
          </p>
        </button>

        <button
          type="button"
          onClick={onStandings}
          className="group rounded-2xl border border-gray-200 bg-white p-5 text-left transition hover:border-indigo-500 dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400">
              <Trophy className="h-5 w-5" />
            </div>

            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
              View
            </span>
          </div>

          <h3 className="mt-4 text-sm font-extrabold text-gray-900 dark:text-white">
            League Table
          </h3>

          <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
            See teams, positions, points and
            season standings.
          </p>
        </button>
      </div>

      {/* Upcoming */}
      {upcomingMatches.length > 0 && (
        <section>
          <SectionTitle
            title="Upcoming Matches"
            count={upcomingMatches.length}
          />

          <div className="grid gap-3 md:grid-cols-2">
            {upcomingMatches
              .slice(0, 4)
              .map((match) => (
                <UpcomingMatchCard
                  key={match.id}
                  match={match}
                />
              ))}
          </div>
        </section>
      )}
    </div>
  );
}

function MatchesTab({
  upcomingMatches,
  results,
}: {
  upcomingMatches: any[];
  results: any[];
}) {
  return (
    <div className="space-y-8">
      <section>
        <SectionTitle
          title="Upcoming Matches"
          count={upcomingMatches.length}
        />

        {upcomingMatches.length === 0 ? (
          <EmptyInline text="No upcoming matches available." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {upcomingMatches.map(
              (match) => (
                <UpcomingMatchCard
                  key={match.id}
                  match={match}
                />
              )
            )}
          </div>
        )}
      </section>

      <section>
        <SectionTitle
          title="Recent Results"
          count={results.length}
        />

        {results.length === 0 ? (
          <EmptyInline text="No results available." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {results.map((match) => (
              <ResultMatchCard
                key={match.id}
                match={match}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StandingsTab({
  standings,
  loading,
}: {
  standings: any[];
  loading: boolean;
}) {
  return (
    <section>
      <div className="mb-4">
        <h2 className="text-base font-extrabold text-gray-900 dark:text-white">
          League Table
        </h2>

        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Current competition standings.
        </p>
      </div>

      <LeagueTable
        standings={standings}
        loading={loading}
      />
    </section>
  );
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative px-5 py-3 text-xs font-bold transition ${
        active
          ? "text-indigo-600 dark:text-indigo-400"
          : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
      }`}
    >
      {label}

      {active && (
        <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
      )}
    </button>
  );
}

function SectionTitle({
  title,
  count,
}: {
  title: string;
  count: number;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-sm font-extrabold text-gray-900 dark:text-white">
        {title}
      </h2>

      <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500">
        {count}{" "}
        {count === 1
          ? "match"
          : "matches"}
      </span>
    </div>
  );
}

function StatBox({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
        {label}
      </p>

      <p className="mt-1 text-lg font-extrabold text-gray-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function EmptyInline({
  text,
}: {
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 py-10 text-center dark:border-gray-800 dark:bg-gray-900">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {text}
      </p>
    </div>
  );
}

function LoadingPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <SportsHeader
        title="Competition"
        subtitle="Loading competition..."
      />

      <SportsMobileNav />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex gap-8">
          <SportsSidebar />

          <section className="min-w-0 flex-1">
            <div className="animate-pulse rounded-3xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-gray-200 dark:bg-gray-800" />

                <div className="space-y-3">
                  <div className="h-4 w-48 rounded bg-gray-200 dark:bg-gray-800" />
                  <div className="h-3 w-28 rounded bg-gray-100 dark:bg-gray-800" />
                </div>
              </div>

              <div className="mt-8 h-10 rounded-xl bg-gray-100 dark:bg-gray-800" />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function ErrorPage({
  onRetry,
}: {
  onRetry: () => void;
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <SportsHeader
        title="Competition"
        subtitle="Competition centre"
      />

      <SportsMobileNav />

      <main className="mx-auto max-w-2xl px-4 py-16">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
          <RefreshCw className="mx-auto h-8 w-8 text-gray-400" />

          <h1 className="mt-4 text-lg font-extrabold text-gray-900 dark:text-white">
            Unable to load competition
          </h1>

          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Something went wrong while loading
            this competition.
          </p>

          <button
            type="button"
            onClick={onRetry}
            className="mt-5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700"
          >
            Try again
          </button>
        </div>
      </main>
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <SportsHeader
        title="Competition"
        subtitle="Competition centre"
      />

      <SportsMobileNav />

      <main className="mx-auto max-w-2xl px-4 py-16">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
          <Trophy className="mx-auto h-10 w-10 text-gray-400" />

          <h1 className="mt-4 text-lg font-extrabold text-gray-900 dark:text-white">
            Competition not found
          </h1>

          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            The competition you're looking for
            could not be found.
          </p>

          <AppLink
            href="/sports/competitions"
            className="mt-5 inline-flex rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700"
          >
            Browse competitions
          </AppLink>
        </div>
      </main>
    </div>
  );
}

function isFinishedMatch(match: any) {
  const status = normalizeStatus(
    match.status
  );

  return status === "finished";
}

function isUpcomingMatch(match: any) {
  const status = normalizeStatus(
    match.status
  );

  return (
    status === "scheduled" ||
    status === "delayed" ||
    status === "unknown"
  );
}

function normalizeStatus(
  status?: string
) {
  if (!status) return "unknown";

  const value = status
    .toLowerCase()
    .replace(/[-\s]+/g, "_");

  if (
    [
      "finished",
      "full_time",
      "fulltime",
      "ft",
      "completed",
    ].includes(value)
  ) {
    return "finished";
  }

  if (
    [
      "scheduled",
      "upcoming",
      "not_started",
      "notstarted",
      "fixture",
    ].includes(value)
  ) {
    return "scheduled";
  }

  if (value === "delayed") {
    return "delayed";
  }

  return "unknown";
}