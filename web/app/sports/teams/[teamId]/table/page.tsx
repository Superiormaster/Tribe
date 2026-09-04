"use client";

import AppLink from '@/components/AppLink';
import { useMemo } from "react";
import {
  ArrowLeft,
  RefreshCw,
  Trophy,
} from "lucide-react";

import SportsHeader from "@/components/sports/SportsHeader";
import SportsSidebar from "@/components/sports/SportsSidebar";
import SportsMobileNav from "@/components/sports/SportsMobileNav";
import SportsAd from "@/components/sports/SportsAd";

import TeamHeader from "@/components/sports/TeamHeader";
import LeagueTable from "@/components/sports/LeagueTable";

import { useTeam } from "@/hooks/sports/useTeam";
import { useStandings } from "@/hooks/sports/useStandings";

interface TeamTablePageProps {
  params: {
    teamId: string;
  };
}

export default function TeamTablePage({
  params,
}: TeamTablePageProps) {
  const {
    team,
    loading: teamLoading,
    error: teamError,
    refetch: refetchTeam,
  } = useTeam({
    teamId: params.teamId,
  });

  const competitionId =
    team?.competition?.id;

  const {
    standings,
    competition: standingsCompetition,
    loading: standingsLoading,
    error: standingsError,
    refetch: refetchStandings,
  } = useStandings({
    competitionId: competitionId
      ? String(competitionId)
      : undefined,
    enabled: Boolean(competitionId),
  });

  const teamStanding = useMemo(() => {
    if (!standings.length || !team) {
      return null;
    }

    return standings.find((standing: any) => {
      const standingTeam =
        standing.team ??
        standing.teams ??
        standing;

      return (
        String(
          standingTeam?.id ??
            standingTeam?.team_id
        ) === String(team.id)
      );
    });
  }, [standings, team]);

  const competition = useMemo(() => {
    return (
      standingsCompetition ??
      team?.competition ??
      null
    );
  }, [standingsCompetition, team]);

  const loading =
    teamLoading || standingsLoading;

  const error =
    teamError || standingsError;

  const handleRefresh = () => {
    void refetchTeam();
    void refetchStandings();
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
        title={`${team.name ?? "Team"} Table`}
        subtitle="League position and standings"
      />

      <SportsMobileNav />

      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex gap-8">
          <SportsSidebar />

          <section className="min-w-0 flex-1">
            {/* Back + refresh */}
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
            <div className="mb-5">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400">
                  <Trophy className="h-5 w-5" />
                </div>

                <div>
                  <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">
                    League Table
                  </h1>

                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {competition?.name ??
                      team.competition?.name ??
                      "Current standings"}
                  </p>
                </div>
              </div>
            </div>

            {/* Team position summary */}
            {teamStanding && (
              <TeamPositionCard
                standing={teamStanding}
              />
            )}

            {/* League table */}
            <div className="mt-6">
              <LeagueTable
                standings={standings}
                loading={standingsLoading}
                showViewAll={false}
              />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function TeamPositionCard({
  standing,
}: {
  standing: any;
}) {
  const position =
    standing.position ??
    standing.rank ??
    standing.place ??
    "-";

  const played =
    standing.played ??
    standing.matches_played ??
    standing.games_played ??
    0;

  const points =
    standing.points ??
    standing.pts ??
    0;

  const wins =
    standing.wins ??
    standing.won ??
    0;

  const draws =
    standing.draws ??
    standing.draw ??
    0;

  const losses =
    standing.losses ??
    standing.lost ??
    0;

  const goalDifference =
    standing.goal_difference ??
    standing.goalDifference ??
    standing.gd ??
    0;

  return (
    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 dark:border-indigo-950/50 dark:bg-indigo-950/20">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
            Current Position
          </p>

          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-black text-gray-900 dark:text-white">
              {position}
            </span>

            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              place
            </span>
          </div>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm dark:bg-gray-900 dark:text-indigo-400">
          <Trophy className="h-5 w-5" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
        <MiniStat
          label="Played"
          value={played}
        />

        <MiniStat
          label="Points"
          value={points}
        />

        <MiniStat
          label="Wins"
          value={wins}
        />

        <MiniStat
          label="Draws"
          value={draws}
        />

        <MiniStat
          label="Losses"
          value={losses}
        />

        <MiniStat
          label="GD"
          value={formatGoalDifference(
            goalDifference
          )}
        />
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl bg-white/80 p-3 dark:bg-gray-900/70">
      <p className="text-[9px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-extrabold text-gray-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function formatGoalDifference(
  value: string | number
) {
  const number = Number(value);

  if (Number.isNaN(number)) {
    return value;
  }

  if (number > 0) {
    return `+${number}`;
  }

  return number;
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <SportsHeader
        title="League Table"
        subtitle="Loading standings..."
      />

      <SportsMobileNav />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex gap-8">
          <SportsSidebar />

          <section className="min-w-0 flex-1">
            <div className="animate-pulse space-y-5">
              <div className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-2xl bg-gray-200 dark:bg-gray-800" />

                  <div className="space-y-3">
                    <div className="h-4 w-48 rounded bg-gray-200 dark:bg-gray-800" />
                    <div className="h-3 w-28 rounded bg-gray-100 dark:bg-gray-800" />
                  </div>
                </div>
              </div>

              <div className="h-32 rounded-2xl bg-gray-200 dark:bg-gray-800" />

              <div className="h-96 rounded-2xl bg-gray-200 dark:bg-gray-800" />
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
        title="League Table"
        subtitle="Standings"
      />

      <SportsMobileNav />

      <main className="mx-auto max-w-2xl px-4 py-16">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
          <Trophy className="mx-auto h-9 w-9 text-gray-400" />

          <h1 className="mt-4 text-lg font-extrabold text-gray-900 dark:text-white">
            Unable to load standings
          </h1>

          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            We couldn't retrieve the league
            table right now.
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
        title="League Table"
        subtitle="Team standings"
      />

      <SportsMobileNav />

      <main className="mx-auto max-w-2xl px-4 py-16">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
          <Trophy className="mx-auto h-10 w-10 text-gray-400" />

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