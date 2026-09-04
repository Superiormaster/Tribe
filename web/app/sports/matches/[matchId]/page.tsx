// src/app/sports/matches/[matchId]/page.tsx

"use client";

import { useMemo, useState } from "react";
import AppLink from '@/components/AppLink';
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  MapPin,
  RefreshCw,
  Share2,
  Trophy,
} from "lucide-react";

import SportsHeader from "@/components/sports/SportsHeader";
import SportsSidebar from "@/components/sports/SportsSidebar";
import SportsMobileNav from "@/components/sports/SportsMobileNav";
import SportsAd from "@/components/sports/SportsAd";

import MatchScore from "@/components/sports/MatchScore";
import MatchStatus from "@/components/sports/MatchStatus";
import MatchCountdown from "@/components/sports/MatchCountdown";
import MatchEvents from "@/components/sports/MatchEvents";
import MatchStats from "@/components/sports/MatchStats";
import MatchLineups from "@/components/sports/MatchLineups";

import { useMatches } from "@/hooks/sports/useMatches";

interface MatchPageProps {
  params: {
    matchId: string;
  };
}

type Tab =
  | "overview"
  | "events"
  | "stats"
  | "lineups";

export default function MatchPage({
  params,
}: MatchPageProps) {
  const [activeTab, setActiveTab] =
    useState<Tab>("overview");

  const {
    matches,
    loading: isLoading,
    error,
    refetch,
  } = useMatches();

  const match = useMemo(() => {
    return (matches ?? []).find(
      (item) =>
        String(item.id) ===
        String(params.matchId)
    );
  }, [matches, params.matchId]);

  if (isLoading) {
    return <LoadingPage />;
  }

  if (error) {
    return (
      <ErrorPage
        onRetry={() => refetch?.()}
      />
    );
  }

  if (!match) {
    return <NotFoundPage />;
  }

  const status = normalizeStatus(
    match.status
  );

  const isUpcoming =
    status === "scheduled" ||
    status === "unknown";

  const isLive =
    status === "live" ||
    status === "halftime";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <SportsHeader
        title="Match Centre"
        subtitle="Live scores, events, stats and lineups"
      />

      <SportsMobileNav />

      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex gap-8">
          <SportsSidebar />

          <section className="min-w-0 flex-1">
            {/* Back + actions */}
            <div className="mb-5 flex items-center justify-between gap-3">
              <AppLink
                href="/sports/matches"
                className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 transition hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to matches
              </AppLink>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => refetch?.()}
                  disabled={isLoading}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition hover:border-indigo-600 hover:text-indigo-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-indigo-500 dark:hover:text-indigo-400"
                  aria-label="Refresh match"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${
                      isLoading
                        ? "animate-spin"
                        : ""
                    }`}
                  />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleShare(match)
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition hover:border-indigo-600 hover:text-indigo-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-indigo-500 dark:hover:text-indigo-400"
                  aria-label="Share match"
                >
                  <Share2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Competition */}
            {match.competition && (
              <div className="mb-4 flex items-center justify-center gap-2">
                {match.competition.logo ? (
                  <img
                    src={match.competition.logo}
                    alt=""
                    className="h-6 w-6 object-contain"
                  />
                ) : (
                  <Trophy className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                )}

                <AppLink
                  href={`/sports/competitions/${match.competition.id}`}
                  className="text-sm font-bold text-gray-600 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400"
                >
                  {match.competition.name}
                </AppLink>
              </div>
            )}

            {/* Match score */}
            <MatchScore
              homeTeam={match.homeTeam}
              awayTeam={match.awayTeam}
              homeScore={match.score?.home}
              awayScore={match.score?.away}
              homeHalfTimeScore={
                match.score?.halftimeHome
              }
              awayHalfTimeScore={
                match.score?.halftimeAway
              }
              status={match.status}
              minute={getMinute(match)}
              extraMinute={getExtraMinute(
                match
              )}
              competitionName={
                match.competition?.name
              }
              competitionLogo={
                match.competition?.logo
              }
              matchDate={match.date}
              venue={match.venue}
              showCompetition={false}
              showVenue={false}
              clickable={false}
            />

            {/* Match information */}
            <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs text-gray-500 dark:text-gray-400">
                {match.date && (
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span>
                      {formatDate(match.date)}
                    </span>
                  </div>
                )}

                {match.date && (
                  <div className="flex items-center gap-1.5">
                    <Clock3 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span>
                      {formatTime(match.date)}
                    </span>
                  </div>
                )}

                {match.venue && (
                  <div className="flex max-w-full items-center gap-1.5">
                    <MapPin className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                    <span className="truncate">
                      {match.venue}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Upcoming countdown */}
            {isUpcoming &&
              match.date && (
                <div className="mt-4">
                  <MatchCountdown
                    matchDate={match.date}
                    homeTeamName={match.homeTeam?.name}
                    awayTeamName={match.awayTeam?.name}
                    homeTeamLogo={match.homeTeam?.logo}
                    awayTeamLogo={match.awayTeam?.logo}
                    competitionName={match.competition?.name}
                    status={match.status}
                  />
                </div>
              )}

            {/* Live status */}
            {isLive && (
              <div className="mt-4">
                <MatchStatus
                  status={match.status}
                  minute={getMinute(match)}
                />
              </div>
            )}

            {/* Ad */}
            <div className="my-6">
              <SportsAd />
            </div>

            {/* Tabs */}
            <div className="overflow-x-auto border-b border-gray-200 dark:border-gray-800">
              <div className="flex min-w-max gap-1">
                <TabButton
                  label="Overview"
                  active={activeTab === "overview"}
                  onClick={() =>
                    setActiveTab("overview")
                  }
                />

                <TabButton
                  label="Events"
                  active={activeTab === "events"}
                  onClick={() =>
                    setActiveTab("events")
                  }
                />

                <TabButton
                  label="Stats"
                  active={activeTab === "stats"}
                  onClick={() =>
                    setActiveTab("stats")
                  }
                />

                <TabButton
                  label="Lineups"
                  active={activeTab === "lineups"}
                  onClick={() =>
                    setActiveTab("lineups")
                  }
                />
              </div>
            </div>

            {/* Tab content */}
            <div className="mt-5">
              {activeTab === "overview" && (
                <Overview
                  match={match}
                />
              )}

              {activeTab === "events" && (
                <MatchEvents
                  events={match.events ?? []}
                  homeTeamId={match.homeTeam?.id}
                  awayTeamId={match.awayTeam?.id}
                  homeTeamName={match.homeTeam?.name ?? "Home"}
                  awayTeamName={match.awayTeam?.name ?? "Away"}
                />
              )}

              {activeTab === "stats" && (
                <MatchStats
                  match={match}
                />
              )}

              {activeTab === "lineups" && (
                <MatchLineups
                  match={match}
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
  match,
}: {
  match: any;
}) {
  const hasScore =
    match.score?.home !== undefined &&
    match.score?.away !== undefined;

  return (
    <div className="space-y-5">
      {/* Quick summary */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-gray-900 dark:text-white">
            Match overview
          </h2>

          {match.status && (
            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold uppercase text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400">
              {formatStatus(match.status)}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <InfoBox
            label="Home"
            value={match.homeTeam.name}
          />

          <InfoBox
            label="Away"
            value={match.awayTeam.name}
          />

          {hasScore && (
            <>
              <InfoBox
                label="Half time"
                value={
                  match.score?.halftimeHome !==
                    undefined &&
                  match.score?.halftimeAway !==
                    undefined
                    ? `${match.score.halftimeHome} - ${match.score.halftimeAway}`
                    : "—"
                }
              />

              <InfoBox
                label="Full time"
                value={`${match.score.home} - ${match.score.away}`}
              />
            </>
          )}
        </div>
      </section>

      {/* Match notes */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-sm font-extrabold text-gray-900 dark:text-white">
          About this match
        </h2>

        <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
          Follow the match centre for live scores,
          match events, statistics and lineups.
        </p>
      </section>
    </div>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-bold text-gray-900 dark:text-white">
        {value}
      </p>
    </div>
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
      className={`relative px-4 py-3 text-xs font-bold transition ${
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

function LoadingPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <SportsHeader
        title="Match Centre"
        subtitle="Loading match information..."
      />

      <SportsMobileNav />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex gap-8">
          <SportsSidebar />

          <section className="min-w-0 flex-1">
            <div className="animate-pulse rounded-3xl border border-gray-200 bg-white p-8 dark:border-gray-800 dark:bg-gray-900">
              <div className="mx-auto h-4 w-32 rounded bg-gray-200 dark:bg-gray-800" />

              <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-5">
                <div className="flex justify-end">
                  <div className="h-16 w-16 rounded-full bg-gray-200 dark:bg-gray-800" />
                </div>

                <div className="h-10 w-24 rounded-xl bg-gray-200 dark:bg-gray-800" />

                <div className="h-16 w-16 rounded-full bg-gray-200 dark:bg-gray-800" />
              </div>

              <div className="mx-auto mt-8 h-10 max-w-md rounded-xl bg-gray-100 dark:bg-gray-800" />
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
  onRetry?: () => void;
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <SportsHeader
        title="Match Centre"
        subtitle="Match information"
      />

      <SportsMobileNav />

      <main className="mx-auto max-w-2xl px-4 py-16">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
          <RefreshCw className="mx-auto h-8 w-8 text-gray-400" />

          <h1 className="mt-4 text-lg font-extrabold text-gray-900 dark:text-white">
            Unable to load match
          </h1>

          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Something went wrong while loading
            this match.
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
        title="Match Centre"
        subtitle="Match information"
      />

      <SportsMobileNav />

      <main className="mx-auto max-w-2xl px-4 py-16">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
          <Trophy className="mx-auto h-10 w-10 text-gray-400" />

          <h1 className="mt-4 text-lg font-extrabold text-gray-900 dark:text-white">
            Match not found
          </h1>

          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            The match you're looking for could
            not be found.
          </p>

          <AppLink
            href="/sports/matches"
            className="mt-5 inline-flex rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700"
          >
            Browse matches
          </AppLink>
        </div>
      </main>
    </div>
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

  if (value === "postponed") {
    return "postponed";
  }

  if (
    value === "cancelled" ||
    value === "canceled"
  ) {
    return "cancelled";
  }

  return "unknown";
}

function getMinute(match: any) {
  return (
    match.minute ??
    match.elapsed ??
    undefined
  );
}

function getExtraMinute(match: any) {
  return (
    match.extraMinute ??
    undefined
  );
}

function formatDate(date?: string) {
  if (!date) return "";

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    return "";
  }

  return value.toLocaleDateString(
    undefined,
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );
}

function formatTime(date?: string) {
  if (!date) return "";

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    return "";
  }

  return value.toLocaleTimeString(
    undefined,
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function formatStatus(status?: string) {
  if (!status) return "";

  return status
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) =>
      char.toUpperCase()
    );
}

async function handleShare(match: any) {
  const url =
    typeof window !== "undefined"
      ? window.location.href
      : "";

  const title = `${match.homeTeam.name} vs ${match.awayTeam.name}`;

  if (
    typeof navigator !== "undefined" &&
    navigator.share
  ) {
    try {
      await navigator.share({
        title,
        text: `Follow ${title} on Tribe Sports`,
        url,
      });
    } catch {
      // User cancelled the share dialog.
    }

    return;
  }

  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    url
  ) {
    try {
      await navigator.clipboard.writeText(
        url
      );
    } catch {
      // Clipboard may be unavailable.
    }
  }
}