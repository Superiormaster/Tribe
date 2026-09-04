// src/components/sports/CompetitionHeader.tsx

"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Globe2,
  Trophy,
} from "lucide-react";
import AppLink from '@/components/AppLink';

import type { Competition } from "@/utils/sports/types/sports";

interface CompetitionHeaderProps {
  competition: Competition;
  backHref?: string;
  showBackButton?: boolean;
  className?: string;
}

export default function CompetitionHeader({
  competition,
  backHref = "/sports/competitions",
  showBackButton = true,
  className = "",
}: CompetitionHeaderProps) {
  return (
    <section
      className={`relative overflow-hidden rounded-3xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 ${className}`}
    >
      {/* Decorative background */}
      <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-indigo-600/10" />
      <div className="absolute -bottom-32 -left-20 h-64 w-64 rounded-full bg-gray-200/50 dark:bg-gray-800/50" />

      <div className="relative px-5 py-6 sm:px-8 sm:py-8">
        {/* Back button */}
        {showBackButton && (
          <AppLink
            href={backHref}
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-gray-500 transition hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Competitions
          </AppLink>
        )}

        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          {/* Competition logo */}
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 p-4 shadow-sm sm:h-28 sm:w-28 dark:border-gray-700 dark:bg-gray-800">
            {competition.logo ? (
              <img
                src={competition.logo}
                alt={competition.name}
                className="h-full w-full object-contain"
              />
            ) : (
              <Trophy className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
            )}
          </div>

          {/* Information */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                <Trophy className="h-3.5 w-3.5" />
                Competition
              </span>

              {competition.season && (
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  {competition.season}
                </span>
              )}
            </div>

            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl lg:text-4xl dark:text-white">
              {competition.name}
            </h1>

            {competition.shortName &&
              competition.shortName !==
                competition.name && (
                <p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">
                  {competition.shortName}
                </p>
              )}

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
              {competition.country && (
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Globe2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>{competition.country}</span>
                </div>
              )}

              {competition.season && (
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <CalendarDays className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>{competition.season} Season</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <CompetitionNavigation competitionId={competition.id} />
    </section>
  );
}

function CompetitionNavigation({
  competitionId,
}: {
  competitionId: string | number;
}) {
  const links = [
    {
      label: "Overview",
      href: `/sports/competitions/${competitionId}`,
    },
    {
      label: "Fixtures",
      href: `/sports/competitions/${competitionId}/fixtures`,
    },
    {
      label: "Results",
      href: `/sports/competitions/${competitionId}/results`,
    },
    {
      label: "Standings",
      href: `/sports/competitions/${competitionId}/standings`,
    },
    {
      label: "Teams",
      href: `/sports/competitions/${competitionId}/teams`,
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