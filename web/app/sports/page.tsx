"use client";

import AppLink from '@/components/AppLink';
import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  Radio,
  Trophy,
} from "lucide-react";

import SportsHeader from "@/components/sports/SportsHeader";
import SportsSidebar from "@/components/sports/SportsSidebar";
import SportsMobileNav from "@/components/sports/SportsMobileNav";
import SportsAd from "@/components/sports/SportsAd";

import FeaturedMatch from "@/components/sports/FeaturedMatch";
import LiveMatches from "@/components/sports/LiveMatches";
import TodayFixtures from "@/components/sports/TodayFixtures";
import UpcomingMatches from "@/components/sports/UpcomingMatches";
import PopularCompetitions from "@/components/sports/PopularCompetitions";
import SportsNewsList from "@/components/sports/SportsNewsList";
import JoinTribeCTA from "@/components/sports/JoinTribeCTA";

export default function SportsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <SportsHeader
        title="Sports"
        subtitle="Live scores, fixtures, results and football news"
      />

      <SportsMobileNav />

      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex gap-8">
          {/* Desktop sidebar */}
          <SportsSidebar />

          {/* Main content */}
          <section className="min-w-0 flex-1">
            {/* Hero / featured match */}
            <section>
              <FeaturedMatch />
            </section>

            {/* Ad */}
            <div className="my-6">
              <SportsAd />
            </div>

            {/* Live matches */}
            <section>
              <SectionHeader
                title="Live Matches"
                icon={<Radio className="h-4 w-4" />}
                href="/sports/live"
                live
              />

              <LiveMatches />
            </section>

            {/* Today's fixtures */}
            <section className="mt-8">
              <SectionHeader
                title="Today's Fixtures"
                icon={
                  <CalendarDays className="h-4 w-4" />
                }
                href="/sports/fixtures"
              />

              <TodayFixtures />
            </section>

            {/* Ad */}
            <div className="my-8">
              <SportsAd />
            </div>

            {/* Upcoming */}
            <section>
              <SectionHeader
                title="Upcoming Matches"
                icon={
                  <CalendarDays className="h-4 w-4" />
                }
                href="/sports/fixtures"
              />

              <UpcomingMatches />
            </section>

            {/* Competitions */}
            <section className="mt-8">
              <SectionHeader
                title="Popular Competitions"
                icon={
                  <Trophy className="h-4 w-4" />
                }
                href="/sports/competitions"
              />

              <PopularCompetitions />
            </section>

            {/* News + sidebar content */}
            <div className="mt-8 grid gap-8 xl:grid-cols-[1fr_320px]">
              {/* Sports news */}
              <section>
                <SectionHeader
                  title="Sports News"
                  href="/sports/news"
                />

                <SportsNewsList />
              </section>

              {/* Right column */}
              <aside className="space-y-6">
                <JoinTribeCTA />

                <SportsAd />
              </aside>
            </div>

            {/* Bottom CTA */}
            <div className="mt-8">
              <JoinTribeCTA />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function SectionHeader({
  title,
  href,
  icon,
  live = false,
}: {
  title: string;
  href?: string;
  icon?: React.ReactNode;
  live?: boolean;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {live ? (
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-50 text-red-500 dark:bg-red-950/30 dark:text-red-400">
            <span className="relative">
              {icon}

              <span className="absolute -right-1 -top-1 h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
            </span>
          </span>
        ) : icon ? (
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400">
            {icon}
          </span>
        ) : null}

        <h2 className="text-base font-extrabold text-gray-900 dark:text-white">
          {title}
        </h2>
      </div>

      {href && (
        <AppLink
          href={href}
          className="group inline-flex items-center gap-1 text-xs font-bold text-indigo-600 transition hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          View all
          <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
        </AppLink>
      )}
    </div>
  );
}