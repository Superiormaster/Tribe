// src/components/sports/TeamHeader.tsx

"use client";

import AppLink from '@/components/AppLink';
import {
  ArrowLeft,
  CalendarDays,
  Globe2,
  Shield,
  Trophy,
} from "lucide-react";

import type { TeamDetails } from "@/utils/sports/types/sports";

interface TeamHeaderProps {
  team: TeamDetails;
  backHref?: string;
  showBackButton?: boolean;
  className?: string;
}

export default function TeamHeader({
  team,
  backHref = "/sports/teams",
  showBackButton = true,
  className = "",
}: TeamHeaderProps) {
  return (
    <section
      className={`relative overflow-hidden rounded-3xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 ${className}`}
    >
      {/* Decorative background */}
      <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-indigo-600/10" />
      <div className="absolute -bottom-32 -left-20 h-64 w-64 rounded-full bg-gray-200/50 dark:bg-gray-800/50" />

      <div className="relative px-5 py-6 sm:px-8 sm:py-8">
        {showBackButton && (
          <AppLink
            href={backHref}
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-gray-500 transition hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Teams
          </AppLink>
        )}

        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          {/* Team logo */}
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 p-4 shadow-sm sm:h-28 sm:w-28 dark:border-gray-700 dark:bg-gray-800">
            {team.logo ? (
              <img
                src={team.logo}
                alt={team.name}
                className="h-full w-full object-contain"
              />
            ) : (
              <Shield className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
            )}
          </div>

          {/* Team information */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                <Shield className="h-3.5 w-3.5" />
                Team
              </span>

              {team.shortName &&
                team.shortName !== team.name && (
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                    {team.shortName}
                  </span>
                )}
            </div>

            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl lg:text-4xl dark:text-white">
              {team.name}
            </h1>

            {team.country && (
              <p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">
                {team.country}
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
              {team.country && (
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Globe2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>{team.country}</span>
                </div>
              )}

              {team.founded && (
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <CalendarDays className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Founded {team.founded}</span>
                </div>
              )}

              {team.competition && (
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Trophy className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />

                  <AppLink
                    href={`/sports/competitions/${team.competition.id}`}
                    className="transition hover:text-indigo-600 dark:hover:text-indigo-400"
                  >
                    {team.competition.name}
                  </AppLink>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <TeamNavigation teamId={team.id} />
    </section>
  );
}

function TeamNavigation({
  teamId,
}: {
  teamId: string | number;
}) {
  const links = [
    {
      label: "Overview",
      href: `/sports/teams/${teamId}`,
    },
    {
      label: "Matches",
      href: `/sports/teams/${teamId}/matches`,
    },
    {
      label: "Results",
      href: `/sports/teams/${teamId}/results`,
    },
    {
      label: "Squad",
      href: `/sports/teams/${teamId}/squad`,
    },
    {
      label: "Stats",
      href: `/sports/teams/${teamId}/stats`,
    },
  ];

  return (
    <nav className="flex overflow-x-auto border-t border-gray-200 px-4 dark:border-gray-800 sm:px-6">
      {links.map((link) => (
        <AppLink
          key={link.href}
          href={link.href}
          className="whitespace-nowrap border-b-2 border-transparent px-4 py-4 text-sm font-semibold text-gray-500 transition hover:border-indigo-600 hover:text-indigo-600 dark:text-gray-400 dark:hover:border-indigo-400 dark:hover:text-indigo-400"
        >
          {link.label}
        </AppLink>
      ))}
    </nav>
  );
}