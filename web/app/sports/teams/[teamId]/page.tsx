"use client";

import AppLink from '@/components/AppLink';
import { useMemo } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronRight,
  RefreshCw,
  Trophy,
  Users,
} from "lucide-react";

import SportsHeader from "@/components/sports/SportsHeader";
import SportsSidebar from "@/components/sports/SportsSidebar";
import SportsMobileNav from "@/components/sports/SportsMobileNav";
import SportsAd from "@/components/sports/SportsAd";

import TeamHeader from "@/components/sports/TeamHeader";
import TeamForm from "@/components/sports/TeamForm";
import TeamMatches from "@/components/sports/TeamMatches";
import LeagueTable from "@/components/sports/LeagueTable";

import { useTeam } from "@/hooks/sports/useTeam";
import { useMatches } from "@/hooks/sports/useMatches";
import { useStandings } from "@/hooks/sports/useStandings";

interface TeamPageProps {
  params: {
    teamId: string;
  };
}

export default function TeamPage({
  params,
}: TeamPageProps) {
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
  
  const competitionId =
    team?.competition?.id;
  
  const {
    standings,
    loading: standingsLoading,
    error: standingsError,
    refetch: refetchStandings,
  } = useStandings({
    competitionId: competitionId
      ? String(competitionId)
      : undefined,
    enabled: Boolean(competitionId),
  });

  const teamMatches = useMemo(() => {
    if (!team || !matches) return [];

    return matches.filter((match: any) =>
      matchBelongsToTeam(match, team.id)
    );
  }, [team, matches]);

  const recentMatches = useMemo(() => {
    return teamMatches
      .filter(isFinishedMatch)
      .sort(sortByDateDescending)
      .slice(0, 5);
  }, [teamMatches]);
  
  const teamForm = useMemo(() => {
    if (!team) return [];
  
    return recentMatches.map((match: any) => {
      const homeTeam =
        match.home_team ??
        match.homeTeam;
  
      const awayTeam =
        match.away_team ??
        match.awayTeam;
  
      const homeId = String(
        homeTeam?.id ?? ""
      );
  
      const teamId = String(team.id);
  
      const isHome = homeId === teamId;
  
      const opponent = isHome
        ? awayTeam
        : homeTeam;
  
      const homeScore =
        match.home_score ??
        match.homeScore ??
        match.score?.home ??
        match.scores?.home ??
        0;
  
      const awayScore =
        match.away_score ??
        match.awayScore ??
        match.score?.away ??
        match.scores?.away ??
        0;
  
      let result: "W" | "D" | "L";
  
      if (homeScore === awayScore) {
        result = "D";
      } else if (
        (isHome && homeScore > awayScore) ||
        (!isHome && awayScore > homeScore)
      ) {
        result = "W";
      } else {
        result = "L";
      }
  
      return {
        matchId: String(match.id),
        opponent,
        isHome,
        result,
        score: {
          home: Number(homeScore),
          away: Number(awayScore),
        },
        date:
          match.date ??
          match.start_time ??
          match.startTime ??
          match.match_date ??
          "",
      };
    });
  }, [team, recentMatches]);

  const upcomingMatches = useMemo(() => {
    return teamMatches
      .filter(isUpcomingMatch)
      .sort(sortByDateAscending)
      .slice(0, 5);
  }, [teamMatches]);

  const liveMatches = useMemo(() => {
    return teamMatches.filter(isLiveMatch);
  }, [teamMatches]);

  const teamStanding = useMemo(() => {
    if (!team || !standings) return null;

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
  }, [team, standings]);

  const loading =
    teamLoading ||
    matchesLoading ||
    standingsLoading;

  const error =
    teamError ||
    matchesError ||
    standingsError;

  const handleRefresh = () => {
    refetchTeam?.();
    refetchMatches?.();
    refetchStandings?.();
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
        title={team.name ?? "Team"}
        subtitle="Team profile, fixtures, results and standings"
      />

      <SportsMobileNav />

      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex gap-8">
          <SportsSidebar />

          <section className="min-w-0 flex-1">
            {/* Top navigation */}
            <div className="mb-5 flex items-center justify-between">
              <AppLink
                href="/sports/teams"
                className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 transition hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400"
              >
                <ArrowLeft className="h-4 w-4" />
                All teams
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

            {/* Quick navigation */}
            <TeamNavigation
              teamId={params.teamId}
            />

            {/* Ad */}
            <div className="my-6">
              <SportsAd />
            </div>

            {/* Live matches */}
            {liveMatches.length > 0 && (
              <section className="mb-8">
                <SectionHeading
                  title="Live now"
                  href={`/sports/teams/${params.teamId}/matches`}
                  live
                />

                <div className="space-y-3">
                  {liveMatches.map(
                    (match: any) => (
                      <LiveMatchPreview
                        key={match.id}
                        match={match}
                      />
                    )
                  )}
                </div>
              </section>
            )}

            {/* Overview grid */}
            <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
              {/* Matches */}
              <section>
                <SectionHeading
                  title="Upcoming matches"
                  href={`/sports/teams/${params.teamId}/matches`}
                />

                {upcomingMatches.length > 0 ? (
                  <TeamMatches
                    matches={upcomingMatches}
                  />
                ) : (
                  <EmptyBox text="No upcoming matches." />
                )}
              </section>

              {/* Form */}
              <section>
                <SectionHeading
                  title="Recent form"
                  href={`/sports/teams/${params.teamId}/matches`}
                />

                <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                  <TeamForm
                    matches={recentMatches}
                    form={teamForm}
                    teamId={String(team.id)}
                  />
                </div>
              </section>
            </div>

            {/* Results */}
            <section className="mt-8">
              <SectionHeading
                title="Recent results"
                href={`/sports/teams/${params.teamId}/matches`}
              />

              {recentMatches.length > 0 ? (
                <TeamMatches
                  matches={recentMatches}
                />
              ) : (
                <EmptyBox text="No recent results." />
              )}
            </section>

            {/* League table */}
            <section className="mt-8">
              <SectionHeading
                title="League table"
                href={`/sports/teams/${params.teamId}/table`}
              />
            
              {competitionId ? (
                <LeagueTable
                  standings={standings ?? []}
                  loading={standingsLoading}
                  showViewAll
                  viewAllHref={`/sports/teams/${params.teamId}/table`}
                />
              ) : (
                <EmptyBox text="League standings are not available." />
              )}
            </section>

            {/* Team links */}
            <TeamResources
              teamId={params.teamId}
            />

            {/* Bottom ad */}
            <div className="mt-8">
              <SportsAd />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function TeamNavigation({
  teamId,
}: {
  teamId: string;
}) {
  const links = [
    {
      label: "Overview",
      href: `/sports/teams/${teamId}`,
      icon: Trophy,
    },
    {
      label: "Matches",
      href: `/sports/teams/${teamId}/matches`,
      icon: CalendarDays,
    },
    {
      label: "Table",
      href: `/sports/teams/${teamId}/table`,
      icon: Trophy,
    },
    {
      label: "Players",
      href: `/sports/teams/${teamId}/players`,
      icon: Users,
    },
  ];

  return (
    <div className="mt-5 overflow-x-auto">
      <div className="flex min-w-max gap-2">
        {links.map((item) => {
          const Icon = item.icon;

          return (
            <AppLink
              key={item.label}
              href={item.href}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-500 transition hover:border-indigo-600 hover:text-indigo-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-indigo-500 dark:hover:text-indigo-400"
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </AppLink>
          );
        })}
      </div>
    </div>
  );
}

function SectionHeading({
  title,
  href,
  live = false,
}: {
  title: string;
  href: string;
  live?: boolean;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {live && (
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
        )}

        <h2 className="text-base font-extrabold text-gray-900 dark:text-white">
          {title}
        </h2>
      </div>

      <AppLink
        href={href}
        className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 transition hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
      >
        View all
        <ChevronRight className="h-3.5 w-3.5" />
      </AppLink>
    </div>
  );
}

function LiveMatchPreview({
  match,
}: {
  match: any;
}) {
  const home =
    match.home_team ??
    match.homeTeam ??
    {};

  const away =
    match.away_team ??
    match.awayTeam ??
    {};

  const homeScore =
    match.home_score ??
    match.homeScore ??
    match.scores?.home ??
    0;

  const awayScore =
    match.away_score ??
    match.awayScore ??
    match.scores?.away ??
    0;

  return (
    <AppLink
      href={`/sports/matches/${match.id}`}
      className="block rounded-2xl border border-red-200 bg-white p-4 transition hover:border-red-300 dark:border-red-950/60 dark:bg-gray-900"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-red-600 dark:bg-red-950/30 dark:text-red-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
          Live
        </span>

        <span className="text-[10px] font-semibold text-gray-400">
          {getMatchMinute(match)}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <TeamSide
          team={home}
          score={homeScore}
          align="right"
        />

        <span className="text-xs font-bold text-gray-400">
          -
        </span>

        <TeamSide
          team={away}
          score={awayScore}
          align="left"
        />
      </div>
    </AppLink>
  );
}

function TeamSide({
  team,
  score,
  align,
}: {
  team: any;
  score: number | string;
  align: "left" | "right";
}) {
  return (
    <div
      className={`flex items-center gap-3 ${
        align === "right"
          ? "justify-end text-right"
          : "justify-start text-left"
      }`}
    >
      {align === "right" && (
        <div>
          <p className="text-sm font-extrabold text-gray-900 dark:text-white">
            {team.name ?? "Home"}
          </p>
        </div>
      )}

      <span className="text-xl font-black text-gray-900 dark:text-white">
        {score}
      </span>

      {align === "left" && (
        <div>
          <p className="text-sm font-extrabold text-gray-900 dark:text-white">
            {team.name ?? "Away"}
          </p>
        </div>
      )}
    </div>
  );
}

function TeamResources({
  teamId,
}: {
  teamId: string;
}) {
  return (
    <section className="mt-8">
      <div className="grid gap-3 sm:grid-cols-3">
        <ResourceLink
          href={`/sports/teams/${teamId}/matches`}
          icon={CalendarDays}
          title="All matches"
          description="Fixtures and results"
        />

        <ResourceLink
          href={`/sports/teams/${teamId}/table`}
          icon={Trophy}
          title="League table"
          description="Current standings"
        />

        <ResourceLink
          href={`/sports/teams/${teamId}/players`}
          icon={Users}
          title="Squad"
          description="Players and team roster"
        />
      </div>
    </section>
  );
}

function ResourceLink({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: any;
  title: string;
  description: string;
}) {
  return (
    <AppLink
      href={href}
      className="group rounded-2xl border border-gray-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:hover:border-indigo-900"
    >
      <div className="flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400">
          <Icon className="h-4 w-4" />
        </div>

        <ArrowRight className="h-4 w-4 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-600 dark:text-gray-700 dark:group-hover:text-indigo-400" />
      </div>

      <h3 className="mt-4 text-sm font-extrabold text-gray-900 dark:text-white">
        {title}
      </h3>

      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {description}
      </p>
    </AppLink>
  );
}

function EmptyBox({
  text,
}: {
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 py-10 text-center dark:border-gray-800 dark:bg-gray-900">
      <CalendarDays className="mx-auto h-7 w-7 text-gray-300 dark:text-gray-700" />

      <p className="mt-3 text-sm font-semibold text-gray-500 dark:text-gray-400">
        {text}
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <SportsHeader
        title="Team"
        subtitle="Loading team..."
      />

      <SportsMobileNav />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex gap-8">
          <SportsSidebar />

          <section className="min-w-0 flex-1 animate-pulse space-y-6">
            <div className="h-36 rounded-3xl bg-gray-200 dark:bg-gray-800" />

            <div className="flex gap-2">
              <div className="h-10 w-24 rounded-xl bg-gray-200 dark:bg-gray-800" />
              <div className="h-10 w-24 rounded-xl bg-gray-200 dark:bg-gray-800" />
              <div className="h-10 w-24 rounded-xl bg-gray-200 dark:bg-gray-800" />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
              <div className="h-80 rounded-2xl bg-gray-200 dark:bg-gray-800" />
              <div className="h-80 rounded-2xl bg-gray-200 dark:bg-gray-800" />
            </div>

            <div className="h-64 rounded-2xl bg-gray-200 dark:bg-gray-800" />
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
        title="Team"
        subtitle="Team information"
      />

      <SportsMobileNav />

      <main className="mx-auto max-w-2xl px-4 py-16">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
          <Trophy className="mx-auto h-9 w-9 text-gray-400" />

          <h1 className="mt-4 text-lg font-extrabold text-gray-900 dark:text-white">
            Unable to load team
          </h1>

          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            We couldn't retrieve this team's
            information right now.
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
        title="Team"
        subtitle="Team information"
      />

      <SportsMobileNav />

      <main className="mx-auto max-w-2xl px-4 py-16">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
          <Users className="mx-auto h-10 w-10 text-gray-400" />

          <h1 className="mt-4 text-lg font-extrabold text-gray-900 dark:text-white">
            Team not found
          </h1>

          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            We couldn't find the requested team.
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

  return (
    String(homeId) === String(teamId) ||
    String(awayId) === String(teamId)
  );
}

function getStatus(match: any) {
  const status =
    match.status?.short ??
    match.status?.type ??
    match.status?.name ??
    match.status;

  return String(status ?? "")
    .toLowerCase()
    .replace(/[-\s]+/g, "_");
}

function isLiveMatch(match: any) {
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
  ].includes(getStatus(match));
}

function isFinishedMatch(match: any) {
  return [
    "finished",
    "full_time",
    "fulltime",
    "ft",
    "completed",
    "after_extra_time",
    "after_penalties",
  ].includes(getStatus(match));
}

function isUpcomingMatch(match: any) {
  if (
    isLiveMatch(match) ||
    isFinishedMatch(match)
  ) {
    return false;
  }

  return true;
}

function getMatchTimestamp(match: any) {
  const date =
    match.start_time ??
    match.startTime ??
    match.date ??
    match.match_date ??
    match.kickoff ??
    match.kickoff_time;

  if (!date) return 0;

  const timestamp = new Date(date).getTime();

  return Number.isNaN(timestamp)
    ? 0
    : timestamp;
}

function sortByDateAscending(
  a: any,
  b: any
) {
  return (
    getMatchTimestamp(a) -
    getMatchTimestamp(b)
  );
}

function sortByDateDescending(
  a: any,
  b: any
) {
  return (
    getMatchTimestamp(b) -
    getMatchTimestamp(a)
  );
}

function getMatchMinute(match: any) {
  return (
    match.minute ??
    match.elapsed ??
    match.status?.elapsed ??
    match.status?.minute ??
    "LIVE"
  );
}