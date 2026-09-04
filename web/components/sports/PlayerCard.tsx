// src/components/sports/PlayerCard.tsx

"use client";

import AppLink from '@/components/AppLink';
import {
  ArrowRight,
  Goal,
  Shield,
  Trophy,
} from "lucide-react";

import type { PlayerStats as PlayerStatsType } from "@/utils/sports/types/sports";

interface PlayerCardProps {
  player: PlayerStatsType;
  href?: string;
  className?: string;
}

export default function PlayerCard({
  player,
  href,
  className = "",
}: PlayerCardProps) {
  const profile = player.player;

  const playerHref =
    href ?? `/sports/players/${profile.id}`;

  return (
    <AppLink
      href={playerHref}
      className={`group block overflow-hidden rounded-2xl border border-gray-200 bg-white transition duration-200 hover:-translate-y-0.5 hover:border-indigo-600 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-indigo-500 ${className}`}
    >
      {/* Player image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-gray-800">
        {profile.photo ? (
          <img
            src={profile.photo}
            alt={profile.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-100 dark:bg-gray-800">
            <span className="text-5xl font-black text-indigo-600 dark:text-indigo-400">
              {profile.name.charAt(0)}
            </span>
          </div>
        )}

        {/* Position */}
        {profile.position && (
          <span className="absolute left-3 top-3 rounded-full bg-indigo-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
            {profile.position}
          </span>
        )}

        {/* Rating */}
        {player.rating !== undefined &&
          player.rating !== null && (
            <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-gray-900 shadow-sm dark:bg-gray-900/95 dark:text-white">
              <Trophy className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
              {Number(player.rating).toFixed(1)}
            </div>
          )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="truncate text-base font-bold text-gray-900 transition group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
          {profile.name}
        </h3>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-3 divide-x divide-gray-200 rounded-xl bg-gray-50 py-3 dark:divide-gray-700 dark:bg-gray-800/70">
          <Stat
            icon={<Goal className="h-3.5 w-3.5" />}
            value={player.goals ?? 0}
            label="Goals"
          />

          <Stat
            icon={<Shield className="h-3.5 w-3.5" />}
            value={player.assists ?? 0}
            label="Assists"
          />

          <Stat
            icon={<Trophy className="h-3.5 w-3.5" />}
            value={player.appearances ?? 0}
            label="Apps"
          />
        </div>

        {/* View profile */}
        <div className="mt-4 flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400">
          <span>View profile</span>

          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
        </div>
      </div>
    </AppLink>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
        {icon}

        <span className="text-sm font-bold text-gray-900 dark:text-white">
          {value}
        </span>
      </div>

      <span className="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">
        {label}
      </span>
    </div>
  );
}