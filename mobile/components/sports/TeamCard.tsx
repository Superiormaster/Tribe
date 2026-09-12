// src/components/sports/TeamCard.tsx

"use client";

import AppLink from '@/components/AppLink';
import {
  ArrowRight,
  Globe2,
  Shield,
  Trophy,
} from "lucide-react";

import type { Team } from "@/utils/sports/types/sports";

interface TeamCardProps {
  team: Team;
  href?: string;
  className?: string;
}

export default function TeamCard({
  team,
  href,
  className = "",
}: TeamCardProps) {
  const teamHref =
    href ?? `/sports/teams/${team.id}`;

  return (
    <AppLink
      href={teamHref}
      className={`group block overflow-hidden rounded-2xl border border-gray-200 bg-white transition duration-200 hover:-translate-y-0.5 hover:border-indigo-600 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-indigo-500 ${className}`}
    >
      {/* Top section */}
      <div className="relative overflow-hidden bg-gray-50 px-5 py-6 dark:bg-gray-800/60">
        {/* Decorative circle */}
        <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-indigo-600/10 transition duration-300 group-hover:scale-125" />

        <div className="relative flex items-center justify-between gap-4">
          {/* Team logo */}
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            {team.logo ? (
              <img
                src={team.logo}
                alt={team.name}
                className="h-full w-full object-contain transition duration-300 group-hover:scale-105"
              />
            ) : (
              <Shield className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
            )}
          </div>

          {/* Arrow */}
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-gray-400 transition group-hover:bg-indigo-600 group-hover:text-white dark:bg-gray-900 dark:text-gray-500 dark:group-hover:bg-indigo-600">
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-gray-900 transition group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
            {team.name}
          </h3>

          {team.shortName &&
            team.shortName !== team.name && (
              <p className="mt-1 truncate text-xs font-medium text-gray-500 dark:text-gray-400">
                {team.shortName}
              </p>
            )}
        </div>

        {/* Team metadata */}
        <div className="mt-4 space-y-2">
          {team.country && (
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Globe2 className="h-3.5 w-3.5 shrink-0 text-indigo-600 dark:text-indigo-400" />

              <span className="truncate">
                {team.country}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            View team
          </span>

          <Shield className="h-4 w-4 text-gray-300 transition group-hover:text-indigo-600 dark:text-gray-600 dark:group-hover:text-indigo-400" />
        </div>
      </div>
    </AppLink>
  );
}