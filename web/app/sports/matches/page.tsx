"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  Search,
} from "lucide-react";

import SportsHeader from "@/components/sports/SportsHeader";
import SportsSidebar from "@/components/sports/SportsSidebar";
import SportsMobileNav from "@/components/sports/SportsMobileNav";
import MatchCard from "@/components/sports/MatchCard";
import LiveMatchCard from "@/components/sports/LiveMatchCard";
import UpcomingMatchCard from "@/components/sports/UpcomingMatchCard";
import ResultMatchCard from "@/components/sports/ResultMatchCard";
import SportsAd from "@/components/sports/SportsAd";

import { useMatches } from "@/hooks/sports/useMatches";
import { useLiveMatches } from "@/hooks/sports/useLiveMatches";

type MatchFilter =
  | "all"
  | "live"
  | "upcoming"
  | "results";

type DateFilter =
  | "yesterday"
  | "today"
  | "tomorrow";

export default function MatchesPage() {
  const [filter, setFilter] =
    useState<MatchFilter>("all");

  const [dateFilter, setDateFilter] =
    useState<DateFilter>("today");

  const [search, setSearch] = useState("");

  const date = useMemo(() => {
    const value = new Date();

    if (dateFilter === "yesterday") {
      value.setDate(value.getDate() - 1);
    }

    if (dateFilter === "tomorrow") {
      value.setDate(value.getDate() + 1);
    }

    return formatApiDate(value);
  }, [dateFilter]);

  const {
    matches,
    loading: matchesLoading,
    error: matchesError,
    refetch: refetchMatches,
  } = useMatches({
    date,
  });

  const {
    matches: liveMatches,
    loading: liveLoading,
    refetch: refetchLive,
  } = useLiveMatches();

  const allMatches = useMemo(() => {
    return matches ?? [];
  }, [matches]);

  const filteredMatches = useMemo(() => {
    let result = allMatches;

    if (filter === "live") {
      result = result.filter((match) =>
        isLiveMatch(match)
      );
    }

    if (filter === "upcoming") {
      result = result.filter((match) =>
        isUpcomingMatch(match)
      );
    }

    if (filter === "results") {
      result = result.filter((match) =>
        isFinishedMatch(match)
      );
    }

    if (search.trim()) {
      const query = search
        .trim()
        .toLowerCase();

      result = result.filter((match) => {
        const home =
          match.homeTeam?.name?.toLowerCase() ??
          "";

        const away =
          match.awayTeam?.name?.toLowerCase() ??
          "";

        const competition =
          match.competition?.name?.toLowerCase() ??
          "";

        return (
          home.includes(query) ||
          away.includes(query) ||
          competition.includes(query)
        );
      });
    }

    return result;
  }, [allMatches, filter, search]);

  const visibleLiveMatches = useMemo(() => {
    if (search.trim()) {
      const query = search
        .trim()
        .toLowerCase();

      return (liveMatches ?? []).filter(
        (match) => {
          const home =
            match.homeTeam?.name?.toLowerCase() ??
            "";

          const away =
            match.awayTeam?.name?.toLowerCase() ??
            "";

          const competition =
            match.competition?.name?.toLowerCase() ??
            "";

          return (
            home.includes(query) ||
            away.includes(query) ||
            competition.includes(query)
          );
        }
      );
    }

    return liveMatches ?? [];
  }, [liveMatches, search]);

  const loading =
    matchesLoading ||
    (filter === "live" && liveLoading);

  const error =
    matchesError &&
    filter !== "live";

  const handleRefresh = () => {
    refetchMatches?.();

    if (filter === "live") {
      refetchLive?.();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <SportsHeader
        title="Matches"
        subtitle="Live scores, fixtures and results"
      />

      <SportsMobileNav />

      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex gap-8">
          <SportsSidebar />

          <section className="min-w-0 flex-1">
            {/* Header */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400">
                    <CalendarDays className="h-5 w-5" />
                  </div>

                  <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">
                    Matches
                  </h1>
                </div>

                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Follow football matches, scores
                  and upcoming fixtures.
                </p>
              </div>

              <button
                type="button"
                onClick={handleRefresh}
                disabled={loading}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-xs font-bold text-gray-600 transition hover:border-indigo-600 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-indigo-500 dark:hover:text-indigo-400"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    loading
                      ? "animate-spin"
                      : ""
                  }`}
                />
                Refresh
              </button>
            </div>

            {/* Search */}
            <div className="mb-5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                <input
                  type="search"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search teams or competitions..."
                  className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Main filters */}
            <div className="mb-5 overflow-x-auto">
              <div className="flex min-w-max gap-2">
                <FilterButton
                  label="All"
                  active={filter === "all"}
                  onClick={() =>
                    setFilter("all")
                  }
                />

                <FilterButton
                  label="Live"
                  active={filter === "live"}
                  onClick={() =>
                    setFilter("live")
                  }
                  live
                />

                <FilterButton
                  label="Upcoming"
                  active={filter === "upcoming"}
                  onClick={() =>
                    setFilter("upcoming")
                  }
                />

                <FilterButton
                  label="Results"
                  active={filter === "results"}
                  onClick={() =>
                    setFilter("results")
                  }
                />
              </div>
            </div>

            {/* Date selector */}
            {filter !== "live" && (
              <DateSelector
                selectedDate={dateFilter}
                onChange={setDateFilter}
              />
            )}

            {/* Ad */}
            <div className="mb-6">
              <SportsAd />
            </div>

            {/* Content */}
            {loading ? (
              <LoadingState />
            ) : error ? (
              <ErrorState
                onRetry={handleRefresh}
              />
            ) : filter === "live" ? (
              <LiveSection
                matches={visibleLiveMatches}
              />
            ) : filter === "results" ? (
              <ResultsSection
                matches={filteredMatches}
              />
            ) : filter === "upcoming" ? (
              <UpcomingSection
                matches={filteredMatches}
              />
            ) : (
              <AllMatchesSection
                matches={filteredMatches}
              />
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Sections                                                                    */
/* -------------------------------------------------------------------------- */

function LiveSection({
  matches,
}: {
  matches: any[];
}) {
  if (matches.length === 0) {
    return (
      <EmptyState
        title="No live matches"
        description="There are no live matches available right now."
      />
    );
  }

  return (
    <section>
      <SectionHeader
        title="Live Matches"
        count={matches.length}
        live
      />

      <div className="grid gap-3 md:grid-cols-2">
        {matches.map((match) => (
          <LiveMatchCard
            key={match.id}
            match={match}
          />
        ))}
      </div>
    </section>
  );
}

function UpcomingSection({
  matches,
}: {
  matches: any[];
}) {
  const upcoming = matches.filter(
    isUpcomingMatch
  );

  if (upcoming.length === 0) {
    return (
      <EmptyState
        title="No upcoming matches"
        description="There are no upcoming matches for the selected date."
      />
    );
  }

  return (
    <section>
      <SectionHeader
        title="Upcoming Matches"
        count={upcoming.length}
      />

      <div className="grid gap-3 md:grid-cols-2">
        {upcoming.map((match) => (
          <UpcomingMatchCard
            key={match.id}
            match={match}
          />
        ))}
      </div>
    </section>
  );
}

function ResultsSection({
  matches,
}: {
  matches: any[];
}) {
  const results = matches.filter(
    isFinishedMatch
  );

  if (results.length === 0) {
    return (
      <EmptyState
        title="No results"
        description="There are no completed matches for the selected date."
      />
    );
  }

  return (
    <section>
      <SectionHeader
        title="Match Results"
        count={results.length}
      />

      <div className="grid gap-3 md:grid-cols-2">
        {results.map((match) => (
          <ResultMatchCard
            key={match.id}
            match={match}
          />
        ))}
      </div>
    </section>
  );
}

function AllMatchesSection({
  matches,
}: {
  matches: any[];
}) {
  if (matches.length === 0) {
    return (
      <EmptyState
        title="No matches found"
        description="No matches match your current filters."
      />
    );
  }

  const grouped = groupByCompetition(
    matches
  );

  return (
    <div className="space-y-6">
      {grouped.map((group) => (
        <section key={group.key}>
          <SectionHeader
            title={group.name}
            count={group.matches.length}
            logo={group.logo}
          />

          <div className="grid gap-3 md:grid-cols-2">
            {group.matches.map((match) => {
              if (isLiveMatch(match)) {
                return (
                  <LiveMatchCard
                    key={match.id}
                    match={match}
                  />
                );
              }

              if (isFinishedMatch(match)) {
                return (
                  <ResultMatchCard
                    key={match.id}
                    match={match}
                  />
                );
              }

              return (
                <UpcomingMatchCard
                  key={match.id}
                  match={match}
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* UI                                                                          */
/* -------------------------------------------------------------------------- */

function SectionHeader({
  title,
  count,
  logo,
  live = false,
}: {
  title: string;
  count: number;
  logo?: string;
  live?: boolean;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white p-1.5 dark:border-gray-800 dark:bg-gray-900">
          {logo ? (
            <img
              src={logo}
              alt=""
              className="h-full w-full object-contain"
            />
          ) : live ? (
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
          ) : (
            <Filter className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          )}
        </div>

        <div className="min-w-0">
          <h2 className="truncate text-sm font-extrabold text-gray-900 dark:text-white">
            {title}
          </h2>

          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            {count}{" "}
            {count === 1
              ? "match"
              : "matches"}
          </p>
        </div>
      </div>

      {live && (
        <span className="flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-bold uppercase text-red-600 dark:bg-red-950/30 dark:text-red-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
          Live
        </span>
      )}
    </div>
  );
}

function FilterButton({
  label,
  active,
  onClick,
  live = false,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  live?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
        active
          ? "bg-indigo-600 text-white shadow-sm"
          : "border border-gray-200 bg-white text-gray-500 hover:border-indigo-600 hover:text-indigo-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-indigo-500 dark:hover:text-indigo-400"
      }`}
    >
      {live && (
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            active
              ? "bg-white"
              : "bg-red-500"
          }`}
        />
      )}

      {label}
    </button>
  );
}

function DateSelector({
  selectedDate,
  onChange,
}: {
  selectedDate: DateFilter;
  onChange: (date: DateFilter) => void;
}) {
  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center">
        <button
          type="button"
          onClick={() =>
            onChange("yesterday")
          }
          className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-3.5 text-xs font-bold transition ${
            selectedDate === "yesterday"
              ? "bg-indigo-600 text-white"
              : "text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
          }`}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Yesterday
        </button>

        <button
          type="button"
          onClick={() => onChange("today")}
          className={`flex flex-1 items-center justify-center gap-1.5 border-x border-gray-200 px-3 py-3.5 text-xs font-bold transition dark:border-gray-800 ${
            selectedDate === "today"
              ? "bg-indigo-600 text-white"
              : "text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
          }`}
        >
          <CalendarDays className="h-3.5 w-3.5" />
          Today
        </button>

        <button
          type="button"
          onClick={() =>
            onChange("tomorrow")
          }
          className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-3.5 text-xs font-bold transition ${
            selectedDate === "tomorrow"
              ? "bg-indigo-600 text-white"
              : "text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
          }`}
        >
          Tomorrow
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* States                                                                      */
/* -------------------------------------------------------------------------- */

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

              <div className="h-6 w-14 rounded-full bg-gray-100 dark:bg-gray-800" />
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

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 py-14 text-center dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
        <CalendarDays className="h-6 w-6 text-gray-400 dark:text-gray-500" />
      </div>

      <h2 className="mt-4 text-base font-bold text-gray-900 dark:text-white">
        {title}
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
        {description}
      </p>
    </div>
  );
}

function ErrorState({
  onRetry,
}: {
  onRetry: () => void;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 py-12 text-center dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
        <RefreshCw className="h-5 w-5 text-gray-500" />
      </div>

      <h2 className="mt-4 text-base font-bold text-gray-900 dark:text-white">
        Unable to load matches
      </h2>

      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        We couldn't retrieve the matches right
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

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function isLiveMatch(match: any) {
  const status = normalizeStatus(
    match.status
  );

  return (
    status === "live" ||
    status === "halftime"
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
      "live",
      "in_play",
      "inplay",
      "playing",
      "first_half",
      "second_half",
    ].includes(value)
  ) {
    return "live";
  }

  if (
    ["halftime", "half_time", "ht"].includes(
      value
    )
  ) {
    return "halftime";
  }

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

function groupByCompetition(
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
          "Other Matches",
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