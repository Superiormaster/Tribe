"use client";

import AppLink from '@/components/AppLink';
import { FormEvent, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Search,
  Trophy,
  User,
  Users,
  ChevronRight,
  X,
} from "lucide-react";

import SportsHeader from "@/components/sports/SportsHeader";
import SportsSidebar from "@/components/sports/SportsSidebar";
import SportsMobileNav from "@/components/sports/SportsMobileNav";
import SportsAd from "@/components/sports/SportsAd";

import { useTeams } from "@/hooks/sports/useTeams";
import { useCompetitions } from "@/hooks/sports/useCompetitions";
import { useMatches } from "@/hooks/sports/useMatches";

type SearchTab =
  | "all"
  | "teams"
  | "competitions"
  | "matches";

export default function SportsSearchPage() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] =
    useState("");

  const [activeTab, setActiveTab] =
    useState<SearchTab>("all");

  const {
    teams = [],
    loading: teamsLoading,
  } = useTeams();

  const {
    competitions = [],
    loading: competitionsLoading,
  } = useCompetitions();

  const {
    matches = [],
    loading: matchesLoading,
  } = useMatches();

  const isLoading =
    teamsLoading ||
    competitionsLoading ||
    matchesLoading;

  const normalizedQuery =
    submittedQuery.trim().toLowerCase();

  const filteredTeams = useMemo(() => {
    if (!normalizedQuery) return [];

    return teams
      .filter((team: any) => {
        const name =
          team.name ??
          team.team_name ??
          "";

        const shortName =
          team.short_name ??
          team.shortName ??
          "";

        return (
          String(name)
            .toLowerCase()
            .includes(normalizedQuery) ||
          String(shortName)
            .toLowerCase()
            .includes(normalizedQuery)
        );
      })
      .slice(0, 8);
  }, [teams, normalizedQuery]);

  const filteredCompetitions = useMemo(() => {
    if (!normalizedQuery) return [];

    return competitions
      .filter((competition: any) => {
        const name =
          competition.name ??
          competition.competition_name ??
          "";

        return String(name)
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .slice(0, 8);
  }, [competitions, normalizedQuery]);

  const filteredMatches = useMemo(() => {
    if (!normalizedQuery) return [];

    return matches
      .filter((match: any) => {
        const home =
          match.home_team?.name ??
          match.homeTeam?.name ??
          "";

        const away =
          match.away_team?.name ??
          match.awayTeam?.name ??
          "";

        const competition =
          match.competition?.name ??
          match.league?.name ??
          "";

        return (
          String(home)
            .toLowerCase()
            .includes(normalizedQuery) ||
          String(away)
            .toLowerCase()
            .includes(normalizedQuery) ||
          String(competition)
            .toLowerCase()
            .includes(normalizedQuery)
        );
      })
      .slice(0, 8);
  }, [matches, normalizedQuery]);

  const totalResults =
    filteredTeams.length +
    filteredCompetitions.length +
    filteredMatches.length;

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSubmittedQuery(query.trim());
    setActiveTab("all");
  }

  function clearSearch() {
    setQuery("");
    setSubmittedQuery("");
    setActiveTab("all");
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <SportsHeader
        title="Search Sports"
        subtitle="Find teams, competitions and matches"
      />

      <SportsMobileNav />

      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex gap-8">
          <SportsSidebar />

          <section className="min-w-0 flex-1">
            {/* Back */}
            <AppLink
              href="/sports"
              className="mb-5 inline-flex items-center gap-2 text-xs font-bold text-gray-500 transition hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400"
            >
              <ArrowLeft className="h-4 w-4" />
              Sports home
            </AppLink>

            {/* Search box */}
            <div className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 sm:p-7">
              <div className="mx-auto max-w-3xl">
                <div className="mb-5 text-center">
                  <h1 className="text-2xl font-black text-gray-900 dark:text-white">
                    Search sports
                  </h1>

                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Search for teams, competitions or
                    matches.
                  </p>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

                    <input
                      type="search"
                      value={query}
                      onChange={(event) =>
                        setQuery(event.target.value)
                      }
                      placeholder="Search Arsenal, Premier League..."
                      className="h-14 w-full rounded-2xl border border-gray-200 bg-gray-50 pl-12 pr-24 text-sm font-medium text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:focus:border-indigo-500"
                    />

                    {query && (
                      <button
                        type="button"
                        onClick={clearSearch}
                        className="absolute right-20 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-white"
                        aria-label="Clear search"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}

                    <button
                      type="submit"
                      className="absolute right-2 top-2 h-10 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white transition hover:bg-indigo-700"
                    >
                      Search
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Ad */}
            <div className="my-6">
              <SportsAd />
            </div>

            {/* Results */}
            {!submittedQuery ? (
              <SearchSuggestions />
            ) : (
              <div>
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">
                      Search results
                    </h2>

                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Results for "
                      {submittedQuery}"
                    </p>
                  </div>

                  {!isLoading && (
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-[10px] font-bold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                      {totalResults} results
                    </span>
                  )}
                </div>

                <SearchTabs
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  teams={filteredTeams.length}
                  competitions={
                    filteredCompetitions.length
                  }
                  matches={filteredMatches.length}
                />

                {isLoading ? (
                  <LoadingState />
                ) : totalResults === 0 ? (
                  <EmptyState query={submittedQuery} />
                ) : (
                  <SearchResults
                    activeTab={activeTab}
                    teams={filteredTeams}
                    competitions={
                      filteredCompetitions
                    }
                    matches={filteredMatches}
                  />
                )}
              </div>
            )}

            <div className="mt-8">
              <SportsAd />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function SearchSuggestions() {
  const suggestions = [
    {
      icon: Users,
      title: "Search teams",
      description:
        "Find football clubs and national teams.",
    },
    {
      icon: Trophy,
      title: "Search competitions",
      description:
        "Find leagues, cups and tournaments.",
    },
    {
      icon: CalendarDays,
      title: "Search matches",
      description:
        "Find fixtures and previous results.",
    },
  ];

  return (
    <div>
      <h2 className="mb-4 text-base font-extrabold text-gray-900 dark:text-white">
        What are you looking for?
      </h2>

      <div className="grid gap-3 sm:grid-cols-3">
        {suggestions.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.title}
              className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400">
                <Icon className="h-5 w-5" />
              </div>

              <h3 className="mt-4 text-sm font-extrabold text-gray-900 dark:text-white">
                {item.title}
              </h3>

              <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                {item.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SearchTabs({
  activeTab,
  setActiveTab,
  teams,
  competitions,
  matches,
}: {
  activeTab: SearchTab;
  setActiveTab: (tab: SearchTab) => void;
  teams: number;
  competitions: number;
  matches: number;
}) {
  const tabs = [
    {
      key: "all" as SearchTab,
      label: "All",
      count: teams + competitions + matches,
    },
    {
      key: "teams" as SearchTab,
      label: "Teams",
      count: teams,
    },
    {
      key: "competitions" as SearchTab,
      label: "Competitions",
      count: competitions,
    },
    {
      key: "matches" as SearchTab,
      label: "Matches",
      count: matches,
    },
  ];

  return (
    <div className="mb-5 overflow-x-auto border-b border-gray-200 dark:border-gray-800">
      <div className="flex min-w-max">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() =>
              setActiveTab(tab.key)
            }
            className={`relative flex items-center gap-2 px-4 py-3 text-xs font-bold transition ${
              activeTab === tab.key
                ? "text-indigo-600 dark:text-indigo-400"
                : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            {tab.label}

            <span
              className={`rounded-full px-1.5 py-0.5 text-[9px] ${
                activeTab === tab.key
                  ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400"
                  : "bg-gray-100 text-gray-400 dark:bg-gray-800"
              }`}
            >
              {tab.count}
            </span>

            {activeTab === tab.key && (
              <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function SearchResults({
  activeTab,
  teams,
  competitions,
  matches,
}: {
  activeTab: SearchTab;
  teams: any[];
  competitions: any[];
  matches: any[];
}) {
  if (activeTab === "teams") {
    return (
      <div className="space-y-2">
        {teams.map((team) => (
          <TeamResult
            key={team.id}
            team={team}
          />
        ))}
      </div>
    );
  }

  if (activeTab === "competitions") {
    return (
      <div className="space-y-2">
        {competitions.map(
          (competition) => (
            <CompetitionResult
              key={competition.id}
              competition={competition}
            />
          )
        )}
      </div>
    );
  }

  if (activeTab === "matches") {
    return (
      <div className="space-y-2">
        {matches.map((match) => (
          <MatchResult
            key={match.id}
            match={match}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {teams.length > 0 && (
        <ResultSection
          title="Teams"
          href="/sports/teams"
        >
          {teams.slice(0, 5).map((team) => (
            <TeamResult
              key={team.id}
              team={team}
            />
          ))}
        </ResultSection>
      )}

      {competitions.length > 0 && (
        <ResultSection
          title="Competitions"
          href="/sports/competitions"
        >
          {competitions
            .slice(0, 5)
            .map((competition) => (
              <CompetitionResult
                key={competition.id}
                competition={competition}
              />
            ))}
        </ResultSection>
      )}

      {matches.length > 0 && (
        <ResultSection
          title="Matches"
          href="/sports/matches"
        >
          {matches.slice(0, 5).map((match) => (
            <MatchResult
              key={match.id}
              match={match}
            />
          ))}
        </ResultSection>
      )}
    </div>
  );
}

function ResultSection({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-extrabold text-gray-900 dark:text-white">
          {title}
        </h2>

        <AppLink
          href={href}
          className="text-xs font-bold text-indigo-600 dark:text-indigo-400"
        >
          View all
        </AppLink>
      </div>

      <div className="space-y-2">
        {children}
      </div>
    </section>
  );
}

function TeamResult({
  team,
}: {
  team: any;
}) {
  const logo =
    team.logo ??
    team.logo_url ??
    team.logoUrl ??
    team.image;

  return (
    <AppLink
      href={`/sports/teams/${team.id}`}
      className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-indigo-200 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:hover:border-indigo-900"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
        {logo ? (
          <img
            src={logo}
            alt=""
            className="h-8 w-8 object-contain"
          />
        ) : (
          <Users className="h-5 w-5 text-gray-400" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-extrabold text-gray-900 dark:text-white">
          {team.name ??
            team.team_name ??
            "Unknown team"}
        </h3>

        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {team.country?.name ??
            team.country ??
            team.short_name ??
            "Football team"}
        </p>
      </div>

      <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
    </AppLink>
  );
}

function CompetitionResult({
  competition,
}: {
  competition: any;
}) {
  const logo =
    competition.logo ??
    competition.logo_url ??
    competition.logoUrl ??
    competition.image;

  return (
    <AppLink
      href={`/sports/competitions/${competition.id}`}
      className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-indigo-200 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:hover:border-indigo-900"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-indigo-50 dark:bg-indigo-950/30">
        {logo ? (
          <img
            src={logo}
            alt=""
            className="h-8 w-8 object-contain"
          />
        ) : (
          <Trophy className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-extrabold text-gray-900 dark:text-white">
          {competition.name ??
            competition.competition_name ??
            "Competition"}
        </h3>

        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {competition.country?.name ??
            competition.country ??
            competition.type ??
            "Football competition"}
        </p>
      </div>

      <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
    </AppLink>
  );
}

function MatchResult({
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
    match.scores?.home;

  const awayScore =
    match.away_score ??
    match.awayScore ??
    match.scores?.away;

  return (
    <AppLink
      href={`/sports/matches/${match.id}`}
      className="block rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-indigo-200 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:hover:border-indigo-900"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
          {match.competition?.name ??
            match.league?.name ??
            "Football"}
        </span>

        <span className="text-[10px] font-semibold text-gray-400">
          {formatMatchDate(match)}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <p className="truncate text-right text-sm font-extrabold text-gray-900 dark:text-white">
          {home.name ?? "Home"}
        </p>

        <div className="text-center">
          <p className="text-sm font-black text-gray-900 dark:text-white">
            {homeScore ?? "-"}{" "}
            <span className="text-gray-400">
              :
            </span>{" "}
            {awayScore ?? "-"}
          </p>
        </div>

        <p className="truncate text-left text-sm font-extrabold text-gray-900 dark:text-white">
          {away.name ?? "Away"}
        </p>
      </div>
    </AppLink>
  );
}

function EmptyState({
  query,
}: {
  query: string;
}) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white px-6 py-16 text-center dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
        <Search className="h-6 w-6 text-gray-400" />
      </div>

      <h2 className="mt-4 text-lg font-extrabold text-gray-900 dark:text-white">
        No results found
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500 dark:text-gray-400">
        We couldn't find anything matching "
        {query}". Try another team, competition or
        match.
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map(
        (_, index) => (
          <div
            key={index}
            className="h-20 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800"
          />
        )
      )}
    </div>
  );
}

function formatMatchDate(match: any) {
  const value =
    match.start_time ??
    match.startTime ??
    match.date ??
    match.match_date ??
    match.kickoff;

  if (!value) return "Upcoming";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Upcoming";
  }

  return date.toLocaleDateString(
    undefined,
    {
      day: "numeric",
      month: "short",
    }
  );
}