// src/components/sports/MatchLineups.tsx

"use client";

import {
  ArrowRightLeft,
  CircleDot,
  Shirt,
  Users,
} from "lucide-react";

import type { Match, Player } from "@/utils/sports/types/sports";

interface MatchLineupsProps {
  match: Match;
  homePlayers?: Player[];
  awayPlayers?: Player[];
  homeFormation?: string;
  awayFormation?: string;
  loading?: boolean;
}

interface LineupPlayer extends Player {
  starter?: boolean;
  substitute?: boolean;
  position?: string;
  shirtNumber?: number;
}

export default function MatchLineups({
  match,
  homePlayers = [],
  awayPlayers = [],
  homeFormation,
  awayFormation,
  loading = false,
}: MatchLineupsProps) {
  if (loading) {
    return <LoadingState />;
  }

  if (
    homePlayers.length === 0 &&
    awayPlayers.length === 0
  ) {
    return <EmptyState />;
  }

  return (
    <section className="w-full">
      <div className="mb-5 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/30">
          <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
            Match Lineups
          </h2>

          <p className="text-sm text-gray-500 dark:text-gray-400">
            Starting XI and substitutes
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TeamLineup
          team={match.homeTeam}
          players={homePlayers}
          formation={homeFormation}
          side="home"
        />

        <TeamLineup
          team={match.awayTeam}
          players={awayPlayers}
          formation={awayFormation}
          side="away"
        />
      </div>
    </section>
  );
}

function TeamLineup({
  team,
  players,
  formation,
  side,
}: {
  team: Match["homeTeam"];
  players: Player[];
  formation?: string;
  side: "home" | "away";
}) {
  const lineupPlayers =
    players as LineupPlayer[];

  const starters = lineupPlayers.filter(
    (player) =>
      player.starter !== false &&
      !player.substitute
  );

  const substitutes = lineupPlayers.filter(
    (player) => player.substitute
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      {/* Team header */}
      <div className="border-b border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-1.5 dark:bg-gray-900">
              {team.logo ? (
                <img
                  src={team.logo}
                  alt={team.name}
                  className="h-full w-full object-contain"
                />
              ) : (
                <Shirt className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              )}
            </div>

            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold text-gray-900 dark:text-white">
                {team.name}
              </h3>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                {side === "home"
                  ? "Home"
                  : "Away"}
              </p>
            </div>
          </div>

          {formation && (
            <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
              {formation}
            </span>
          )}
        </div>
      </div>

      {/* Starting XI */}
      <div className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <CircleDot className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />

          <h4 className="text-sm font-bold text-gray-900 dark:text-white">
            Starting XI
          </h4>

          <span className="text-xs text-gray-400 dark:text-gray-500">
            {starters.length}
          </span>
        </div>

        {starters.length > 0 ? (
          <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-100 dark:divide-gray-800 dark:border-gray-800">
            {starters.map((player, index) => (
              <PlayerRow
                key={`${player.id}-${index}`}
                player={player}
              />
            ))}
          </div>
        ) : (
          <NoPlayers text="Starting lineup unavailable" />
        )}

        {/* Substitutes */}
        {substitutes.length > 0 && (
          <div className="mt-6">
            <div className="mb-3 flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-gray-400 dark:text-gray-500" />

              <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                Substitutes
              </h4>

              <span className="text-xs text-gray-400 dark:text-gray-500">
                {substitutes.length}
              </span>
            </div>

            <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-100 dark:divide-gray-800 dark:border-gray-800">
              {substitutes.map((player, index) => (
                <PlayerRow
                  key={`${player.id}-${index}`}
                  player={player}
                  substitute
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PlayerRow({
  player,
  substitute = false,
}: {
  player: LineupPlayer;
  substitute?: boolean;
}) {
  const playerName =
    player.name || "Unknown player";

  return (
    <div className="flex items-center gap-3 px-3 py-3 transition hover:bg-gray-50 dark:hover:bg-gray-800/50">
      {/* Shirt number */}
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gray-100 text-xs font-bold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
        {player.shirtNumber ??
          player.number ??
          "—"}
      </div>

      {/* Player image */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        {player.photo ? (
          <img
            src={player.photo}
            alt={playerName}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
            {playerName.charAt(0)}
          </span>
        )}
      </div>

      {/* Name */}
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm font-semibold ${
            substitute
              ? "text-gray-600 dark:text-gray-400"
              : "text-gray-900 dark:text-white"
          }`}
        >
          {playerName}
        </p>

        {player.position && (
          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            {player.position}
          </p>
        )}
      </div>

      {substitute && (
        <span className="text-[10px] font-semibold uppercase text-gray-400 dark:text-gray-500">
          SUB
        </span>
      )}
    </div>
  );
}

function NoPlayers({
  text,
}: {
  text: string;
}) {
  return (
    <div className="rounded-xl bg-gray-50 px-4 py-6 text-center dark:bg-gray-800/50">
      <Users className="mx-auto h-6 w-6 text-gray-300 dark:text-gray-600" />

      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        {text}
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <section className="w-full">
      <div className="mb-5 flex items-center gap-2">
        <div className="h-8 w-8 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />

        <div className="space-y-2">
          <div className="h-5 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          <div className="h-3 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {[1, 2].map((team) => (
          <div
            key={team}
            className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800"
          >
            <div className="h-20 animate-pulse bg-gray-100 dark:bg-gray-800" />

            <div className="space-y-3 p-4">
              {Array.from({ length: 8 }).map(
                (_, index) => (
                  <div
                    key={index}
                    className="flex animate-pulse items-center gap-3"
                  >
                    <div className="h-7 w-7 rounded-md bg-gray-200 dark:bg-gray-800" />
                    <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-800" />
                    <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-800" />
                  </div>
                )
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center dark:border-gray-800 dark:bg-gray-900">
      <Users className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />

      <h3 className="mt-3 font-semibold text-gray-900 dark:text-white">
        Lineups unavailable
      </h3>

      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Match lineups have not been published yet.
      </p>
    </div>
  );
}