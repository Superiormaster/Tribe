"use client";

import AppLink from '@/components/AppLink';
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";

import SportsHeader from "@/components/sports/SportsHeader";
import SportsSidebar from "@/components/sports/SportsSidebar";
import SportsMobileNav from "@/components/sports/SportsMobileNav";
import SportsAd from "@/components/sports/SportsAd";

import TeamHeader from "@/components/sports/TeamHeader";
import PlayerCard from "@/components/sports/PlayerCard";

import { useTeam } from "@/hooks/sports/useTeam";
import type { Player } from "@/utils/sports/types/sports";

interface TeamPlayersPageProps {
  params: {
    teamId: string;
  };
}

export default function TeamPlayersPage({
  params,
}: TeamPlayersPageProps) {
  const [search, setSearch] = useState("");
  const [position, setPosition] =
    useState("all");

  const {
    team,
    data,
    loading: teamLoading,
    error: teamError,
    refetch: refetchTeam,
  } = useTeam({
    teamId: params.teamId,
  });

  const players = useMemo<Player[]>(() => {
    if (!data?.players) return [];
  
    return data.players.map((item) => item.player);
  }, [data]);

  const positions = useMemo(() => {
    const values = new Set<string>();

    players.forEach((player: any) => {
      const value =
        player.position ??
        player.position_name;

      if (value) {
        values.add(String(value));
      }
    });

    return Array.from(values);
  }, [players]);

  const filteredPlayers = useMemo(() => {
    let result = players;

    if (position !== "all") {
      result = result.filter((player: any) => {
        const playerPosition =
          player.position ??
          player.position_name ??
          "";

        return (
          String(playerPosition)
            .toLowerCase() ===
          position.toLowerCase()
        );
      });
    }

    if (search.trim()) {
      const query = search
        .trim()
        .toLowerCase();

      result = result.filter((player: any) => {
        const name =
          player.name?.toLowerCase() ?? "";

        const number = String(
          player.number ?? ""
        ).toLowerCase();

        const playerPosition =
          player.position?.toLowerCase() ??
          player.position_name?.toLowerCase() ??
          "";

        return (
          name.includes(query) ||
          number.includes(query) ||
          playerPosition.includes(query)
        );
      });
    }

    return result;
  }, [players, search, position]);

  if (teamLoading) {
    return <LoadingState />;
  }

  if (teamError) {
    return (
      <ErrorState
        onRetry={() => refetchTeam?.()}
      />
    );
  }

  if (!team) {
    return <NotFoundState />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <SportsHeader
        title={`${team.name ?? "Team"} Players`}
        subtitle="Squad and player information"
      />

      <SportsMobileNav />

      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex gap-8">
          <SportsSidebar />

          <section className="min-w-0 flex-1">
            {/* Back */}
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
                onClick={() => refetchTeam?.()}
                disabled={teamLoading}
                className="inline-flex h-9 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold text-gray-500 transition hover:border-indigo-600 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-indigo-500 dark:hover:text-indigo-400"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </button>
            </div>

            {/* Team header */}
            <TeamHeader team={team} />

            {/* Ad */}
            <div className="my-6">
              <SportsAd />
            </div>

            {/* Page title */}
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400">
                    <Users className="h-5 w-5" />
                  </div>

                  <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">
                    Squad
                  </h1>
                </div>

                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {players.length}{" "}
                  {players.length === 1
                    ? "player"
                    : "players"}
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                <input
                  type="search"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search players..."
                  className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Position filters */}
            {positions.length > 0 && (
              <div className="mb-6 overflow-x-auto">
                <div className="flex min-w-max gap-2">
                  <PositionButton
                    label="All"
                    active={position === "all"}
                    onClick={() =>
                      setPosition("all")
                    }
                  />

                  {positions.map((item) => (
                    <PositionButton
                      key={item}
                      label={item}
                      active={
                        position.toLowerCase() ===
                        item.toLowerCase()
                      }
                      onClick={() =>
                        setPosition(item)
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Players */}
            {filteredPlayers.length === 0 ? (
              <EmptyState
                search={search}
                position={position}
              />
            ) : (
              <PlayersGrid
                players={filteredPlayers}
              />
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function PlayersGrid({
  players,
}: {
  players: any[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {players.map((player) => (
        <PlayerCard
          key={player.id}
          player={player}
        />
      ))}
    </div>
  );
}

function PositionButton({
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
      className={`rounded-xl px-4 py-2.5 text-xs font-bold transition ${
        active
          ? "bg-indigo-600 text-white shadow-sm"
          : "border border-gray-200 bg-white text-gray-500 hover:border-indigo-600 hover:text-indigo-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-indigo-500 dark:hover:text-indigo-400"
      }`}
    >
      {label}
    </button>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <SportsHeader
        title="Players"
        subtitle="Loading squad..."
      />

      <SportsMobileNav />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex gap-8">
          <SportsSidebar />

          <section className="min-w-0 flex-1">
            <div className="mb-6 animate-pulse rounded-3xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-gray-200 dark:bg-gray-800" />

                <div className="space-y-3">
                  <div className="h-4 w-48 rounded bg-gray-200 dark:bg-gray-800" />
                  <div className="h-3 w-28 rounded bg-gray-100 dark:bg-gray-800" />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 9 }).map(
                (_, index) => (
                  <div
                    key={index}
                    className="animate-pulse rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded-full bg-gray-200 dark:bg-gray-800" />

                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-28 rounded bg-gray-200 dark:bg-gray-800" />
                        <div className="h-2.5 w-20 rounded bg-gray-100 dark:bg-gray-800" />
                      </div>
                    </div>

                    <div className="mt-5 h-8 w-full rounded-xl bg-gray-100 dark:bg-gray-800" />
                  </div>
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
        title="Players"
        subtitle="Squad information"
      />

      <SportsMobileNav />

      <main className="mx-auto max-w-2xl px-4 py-16">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
          <RefreshCw className="mx-auto h-8 w-8 text-gray-400" />

          <h1 className="mt-4 text-lg font-extrabold text-gray-900 dark:text-white">
            Unable to load squad
          </h1>

          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            We couldn't retrieve the team
            players right now.
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
        title="Players"
        subtitle="Squad information"
      />

      <SportsMobileNav />

      <main className="mx-auto max-w-2xl px-4 py-16">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
          <Users className="mx-auto h-10 w-10 text-gray-400" />

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

function EmptyState({
  search,
  position,
}: {
  search: string;
  position: string;
}) {
  const filtered =
    search || position !== "all";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 py-14 text-center dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
        <Users className="h-6 w-6 text-gray-400 dark:text-gray-500" />
      </div>

      <h2 className="mt-4 text-base font-extrabold text-gray-900 dark:text-white">
        {filtered
          ? "No players found"
          : "No squad available"}
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
        {filtered
          ? "Try changing your search or position filter."
          : "Player information is not available for this team yet."}
      </p>
    </div>
  );
}