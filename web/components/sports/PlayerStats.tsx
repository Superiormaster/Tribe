// src/components/sports/PlayerStats.tsx

"use client";

import AppLink from '@/components/AppLink';
import {
  ArrowRight,
  BarChart3,
  Goal,
  Shield,
  Trophy,
} from "lucide-react";

import type { PlayerStats as PlayerStatsType } from "@/utils/sports/types/sports";

interface PlayerStatsProps {
  players?: PlayerStatsType[];
  title?: string;
  limit?: number;
  loading?: boolean;
  showViewAll?: boolean;
  viewAllHref?: string;
}

export default function PlayerStats({
  players = [],
  title = "Player Stats",
  limit = 5,
  loading = false,
  showViewAll = true,
  viewAllHref = "/sports/players",
}: PlayerStatsProps) {
  const visiblePlayers = players.slice(0, limit);

  return (
    <section className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/30">
              <BarChart3 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>

            <h2 className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
              {title}
            </h2>
          </div>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Top performers and player statistics
          </p>
        </div>

        {showViewAll && (
          <AppLink
            href={viewAllHref}
            className="hidden items-center gap-1 text-sm font-semibold text-indigo-600 transition hover:text-indigo-700 sm:flex dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            View all
            <ArrowRight className="h-4 w-4" />
          </AppLink>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        {loading ? (
          <LoadingState />
        ) : visiblePlayers.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {visiblePlayers.map((player, index) => (
              <PlayerRow
                key={player.player.id}
                player={player}
                position={index + 1}
              />
            ))}
          </div>
        )}
      </div>

      {showViewAll && (
        <AppLink
          href={viewAllHref}
          className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-indigo-600 transition hover:bg-gray-50 sm:hidden dark:border-gray-800 dark:bg-gray-900 dark:text-indigo-400 dark:hover:bg-gray-800"
        >
          View all players
          <ArrowRight className="h-4 w-4" />
        </AppLink>
      )}
    </section>
  );
}

function PlayerRow({
  player,
  position,
}: {
  player: PlayerStatsType;
  position: number;
}) {
  const stats = player.player;

  return (
    <AppLink
      href={`/sports/players/${stats.id}`}
      className="group flex items-center gap-3 p-4 transition hover:bg-gray-50 dark:hover:bg-gray-800/50"
    >
      {/* Position */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center">
        {position <= 3 ? (
          <Trophy
            className={`h-4 w-4 ${
              position === 1
                ? "text-indigo-600 dark:text-indigo-400"
                : "text-gray-400 dark:text-gray-500"
            }`}
          />
        ) : (
          <span className="text-sm font-bold text-gray-400 dark:text-gray-500">
            {position}
          </span>
        )}
      </div>

      {/* Avatar */}
      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        {stats.photo ? (
          <img
            src={stats.photo}
            alt={stats.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
            {stats.name.charAt(0)}
          </span>
        )}
      </div>

      {/* Player */}
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-bold text-gray-900 transition group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
          {stats.name}
        </h3>

        <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          {stats.position && (
            <span>{stats.position}</span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="hidden items-center gap-5 sm:flex">
        <Stat
          icon={<Goal className="h-3.5 w-3.5" />}
          label="Goals"
          value={player.goals ?? 0}
        />

        <Stat
          icon={<Shield className="h-3.5 w-3.5" />}
          label="Assists"
          value={player.assists ?? 0}
        />

        {player.rating !== undefined &&
          player.rating !== null && (
            <div className="min-w-[42px] text-center">
              <span className="block text-sm font-bold text-gray-900 dark:text-white">
                {Number(player.rating).toFixed(1)}
              </span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500">
                Rating
              </span>
            </div>
          )}
      </div>

      {/* Mobile goals */}
      <div className="text-right sm:hidden">
        <span className="block text-sm font-bold text-gray-900 dark:text-white">
          {player.goals ?? 0}
        </span>

        <span className="text-[10px] text-gray-400 dark:text-gray-500">
          Goals
        </span>
      </div>

      <ArrowRight className="h-4 w-4 shrink-0 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-600 dark:text-gray-600 dark:group-hover:text-indigo-400" />
    </AppLink>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="min-w-[42px] text-center">
      <div className="flex items-center justify-center gap-1 text-indigo-600 dark:text-indigo-400">
        {icon}

        <span className="text-sm font-bold text-gray-900 dark:text-white">
          {value}
        </span>
      </div>

      <span className="text-[10px] text-gray-400 dark:text-gray-500">
        {label}
      </span>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-800">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="flex animate-pulse items-center gap-3 p-4"
        >
          <div className="h-8 w-8 rounded bg-gray-200 dark:bg-gray-800" />

          <div className="h-11 w-11 rounded-full bg-gray-200 dark:bg-gray-800" />

          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-800" />
          </div>

          <div className="h-5 w-10 rounded bg-gray-200 dark:bg-gray-800" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="px-6 py-12 text-center">
      <BarChart3 className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />

      <h3 className="mt-3 font-semibold text-gray-900 dark:text-gray-100">
        No player statistics
      </h3>

      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Player statistics will appear here when available.
      </p>
    </div>
  );
}