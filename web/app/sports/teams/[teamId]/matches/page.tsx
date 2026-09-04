"use client";

import AppLink from '@/components/AppLink';
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  RefreshCw,
} from "lucide-react";

import SportsHeader from "@/components/sports/SportsHeader";
import SportsSidebar from "@/components/sports/SportsSidebar";
import SportsMobileNav from "@/components/sports/SportsMobileNav";
import SportsAd from "@/components/sports/SportsAd";

import TeamHeader from "@/components/sports/TeamHeader";
import UpcomingMatchCard from "@/components/sports/UpcomingMatchCard";
import ResultMatchCard from "@/components/sports/ResultMatchCard";
import LiveMatchCard from "@/components/sports/LiveMatchCard";

import { useTeam } from "@/hooks/sports/useTeam";
import { useMatches } from "@/hooks/sports/useMatches";

interface TeamMatchesPageProps {
  params: {
    teamId: string;
  };
}

type MatchTab = "all" | "upcoming" | "results";

export default function TeamMatchesPage({
  params,
}: TeamMatchesPageProps) {
  const [activeTab, setActiveTab] =
    useState<MatchTab>("all");

  const {
    team,
    loading: teamLoading,
    error: teamError,
    refetch: refetchTeam,
  } = useTeam({
    teamId: params.teamId,
  });

  const {
    matches,
    loading: matchesLoading,
    error: matchesError,
    refetch: refetchMatches,
  } = useMatches();

  const teamMatches = useMemo(() => {
    if (!matches || !team) return [];

    return matches.filter((match: any) =>
      matchBelongsToTeam(match, team.id)
    );
  }, [matches, team]);

  const liveMatches = useMemo(() => {
    return teamMatches.filter(isLiveMatch);
  }, [teamMatches]);

  const upcomingMatches = useMemo(() => {
    return teamMatches
      .filter(isUpcomingMatch)
      .sort(sortByDateAscending);
  }, [teamMatches]);

  const results = useMemo(() => {
    return teamMatches
      .filter(isFinishedMatch)
      .sort(sortByDateDescending);
  }, [teamMatches]);

  const displayedMatches = useMemo(() => {
    switch (activeTab) {
      case "upcoming":
        return upcomingMatches;

      case "results":
        return results;

      default:
        return [
          ...liveMatches,
          ...upcomingMatches,
          ...results,
        ];
    }
  }, [
    activeTab,
    liveMatches,
    upcomingMatches,
    results,
  ]);

  const loading =
    teamLoading || matchesLoading;

  const error =
    teamError || matchesError;

  const handleRefresh = () => {
    refetchTeam?.();
    refetchMatches?.();
  };

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <ErrorState
        onRetry={handleRefresh}
      />
    );
  }

  if (!team) {
    return <NotFoundState />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <SportsHeader
        title={`${team.name ?? "Team"} Matches`}
        subtitle="Fixtures, results and live matches"
      />

      <SportsMobileNav />

      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex gap-8">
          <SportsSidebar />

          <section className="min-w-0 flex-1">
            {/* Navigation */}
            <div className="mb-5 flex items-center justify-between">
              <AppLink
                href={`/sports/teams/${params.teamId}`}
                className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 transition hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to team
              </AppLink>

              <button
                type="button"
                onClick={handleRefresh}
                disabled={loading}
                className="inline-flex h-9 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold text-gray-500 transition hover:border-indigo-600 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-indigo-500 dark:hover:text-indigo-400"
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

            {/* Team header */}
            <TeamHeader team={team} />

            {/* Ad */}
            <div className="my-6">
              <SportsAd />
            </div>

            {/* Page heading */}
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400">
                <CalendarDays className="h-5 w-5" />
              </div>

              <div>
                <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">
                  Matches
                </h1>

                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {teamMatches.length}{" "}
                  {teamMatches.length === 1
                    ? "match"
                    : "matches"}
                </p>
              </div>
            </div>

            {/* Summary */}
            <MatchSummary
              live={liveMatches.length}
              upcoming={upcomingMatches.length}
              results={results.length}
            />

            {/* Tabs */}
            <div className="mb-6 mt-6 overflow-x-auto border-b border-gray-200 dark:border-gray-800">
              <div className="flex min-w-max">
                <TabButton
                  label="All"
                  count={teamMatches.length}
                  active={activeTab === "all"}
                  onClick={() =>
                    setActiveTab("all")
                  }
                />

                <TabButton
                  label="Upcoming"
                  count={upcomingMatches.length}
                  active={
                    activeTab === "upcoming"
                  }
                  onClick={() =>
                    setActiveTab("upcoming")
                  }
                />

                <TabButton
                  label="Results"
                  count={results.length}
                  active={
                    activeTab === "results"
                  }
                  onClick={() =>
                    setActiveTab("results")
                  }
                />
              </div>
            </div>

            {/* Matches */}
            {displayedMatches.length === 0 ? (
              <EmptyState
                tab={activeTab}
              />
            ) : (
              <div className="space-y-3">
                {displayedMatches.map(
                  (match: any) => (
                    <TeamMatchItem
                      key={match.id}
                      match={match}
                    />
                  )
                )}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function TeamMatchItem({
  match,
}: {
  match: any;
}) {
  if (isLiveMatch(match)) {
    return (
      <LiveMatchCard
        match={match}
      />
    );
  }

  if (isFinishedMatch(match)) {
    return (
      <ResultMatchCard
        match={match}
      />
    );
  }

  return (
    <UpcomingMatchCard
      match={match}
    />
  );
}

function MatchSummary({
  live,
  upcoming,
  results,
}: {
  live: number;
  upcoming: number;
  results: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <SummaryCard
        label="Live"
        value={live}
        live
      />

      <SummaryCard
        label="Upcoming"
        value={upcoming}
      />

      <SummaryCard
        label="Results"
        value={results}
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  live = false,
}: {
  label: string;
  value: number;
  live?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-2">
        {live && (
          <span className="h-2 w-2 rounded-full bg-red-500" />
        )}

        <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
          {label}
        </span>
      </div>

      <p className="mt-1 text-xl font-black text-gray-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function TabButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex items-center gap-2 px-5 py-3 text-xs font-bold transition ${
        active
          ? "text-indigo-600 dark:text-indigo-400"
          : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
      }`}
    >
      {label}

      <span
        className={`rounded-full px-1.5 py-0.5 text-[9px] ${
          active
            ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400"
            : "bg-gray-100 text-gray-400 dark:bg-gray-800"
        }`}
      >
        {count}
      </span>

      {active && (
        <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
      )}
    </button>
  );
}

function EmptyState({
  tab,
}: {
  tab: MatchTab;
}) {
  const message =
    tab === "upcoming"
      ? "No upcoming matches found."
      : tab === "results"
        ? "No completed matches found."
        : "No matches found for this team.";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 py-14 text-center dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
        <CalendarDays className="h-6 w-6 text-gray-400 dark:text-gray-500" />
      </div>

      <h2 className="mt-4 text-base font-extrabold text-gray-900 dark:text-white">
        No matches
      </h2>

      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        {message}
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <SportsHeader
        title="Matches"
        subtitle="Loading fixtures..."
      />

      <SportsMobileNav />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex gap-8">
          <SportsSidebar />

          <section className="min-w-0 flex-1">
            <div className="animate-pulse space-y-5">
              <div className="h-28 rounded-3xl bg-gray-200 dark:bg-gray-800" />

              <div className="grid grid-cols-3 gap-2">
                <div className="h-20 rounded-2xl bg-gray-200 dark:bg-gray-800" />
                <div className="h-20 rounded-2xl bg-gray-200 dark:bg-gray-800" />
                <div className="h-20 rounded-2xl bg-gray-200 dark:bg-gray-800" />
              </div>

              {Array.from({ length: 5 }).map(
                (_, index) => (
                  <div
                    key={index}
                    className="h-28 rounded-2xl bg-gray-200 dark:bg-gray-800"
                  />
                )
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function ErrorState({
  onRetry,
}: {
  onRetry: () => void;
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <SportsHeader
        title="Matches"
        subtitle="Team fixtures and results"
      />

      <SportsMobileNav />

      <main className="mx-auto max-w-2xl px-4 py-16">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
          <CalendarDays className="mx-auto h-9 w-9 text-gray-400" />

          <h1 className="mt-4 text-lg font-extrabold text-gray-900 dark:text-white">
            Unable to load matches
          </h1>

          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            We couldn't retrieve this team's
            matches right now.
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
      </main>
    </div>
  );
}

function NotFoundState() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <SportsHeader
        title="Matches"
        subtitle="Team fixtures"
      />

      <SportsMobileNav />

      <main className="mx-auto max-w-2xl px-4 py-16">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
          <CalendarDays className="mx-auto h-10 w-10 text-gray-400" />

          <h1 className="mt-4 text-lg font-extrabold text-gray-900 dark:text-white">
            Team not found
          </h1>

          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            We couldn't find this team.
          </p>

          <AppLink
            href="/sports"
            className="mt-5 inline-flex rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-indigo-700"
          >
            Back to sports
          </AppLink>
        </div>
      </main>
    </div>
  );
}

function matchBelongsToTeam(
  match: any,
  teamId: string | number
) {
  const homeId =
    match.home_team?.id ??
    match.homeTeam?.id ??
    match.home_team_id ??
    match.homeTeamId;

  const awayId =
    match.away_team?.id ??
    match.awayTeam?.id ??
    match.away_team_id ??
    match.awayTeamId;

  const teams = match.teams ?? [];

  return (
    String(homeId) === String(teamId) ||
    String(awayId) === String(teamId) ||
    teams.some(
      (item: any) =>
        String(
          item.id ??
            item.team_id
        ) === String(teamId)
    )
  );
}

function getStatus(match: any) {
  const raw =
    match.status?.short ??
    match.status?.type ??
    match.status?.name ??
    match.status;

  return String(raw ?? "")
    .toLowerCase()
    .replace(/[-\s]+/g, "_");
}

function isLiveMatch(match: any) {
  const status = getStatus(match);

  return [
    "live",
    "in_play",
    "inplay",
    "1h",
    "2h",
    "ht",
    "et",
    "aet",
    "pen",
    "extra_time",
    "first_half",
    "second_half",
  ].includes(status);
}

function isFinishedMatch(match: any) {
  const status = getStatus(match);

  return [
    "finished",
    "full_time",
    "fulltime",
    "ft",
    "completed",
    "after_extra_time",
    "after_penalties",
  ].includes(status);
}

function isUpcomingMatch(match: any) {
  const status = getStatus(match);

  if (isLiveMatch(match)) {
    return false;
  }

  if (isFinishedMatch(match)) {
    return false;
  }

  return [
    "",
    "scheduled",
    "upcoming",
    "not_started",
    "notstarted",
    "fixture",
    "ns",
    "delayed",
    "postponed",
  ].includes(status);
}

function getMatchDate(match: any) {
  return (
    match.start_time ??
    match.startTime ??
    match.date ??
    match.match_date ??
    match.kickoff ??
    match.kickoff_time ??
    null
  );
}

function getTimestamp(match: any) {
  const value = getMatchDate(match);

  if (!value) return 0;

  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp)
    ? 0
    : timestamp;
}

function sortByDateAscending(
  a: any,
  b: any
) {
  return (
    getTimestamp(a) -
    getTimestamp(b)
  );
}

function sortByDateDescending(
  a: any,
  b: any
) {
  return (
    getTimestamp(b) -
    getTimestamp(a)
  );
}