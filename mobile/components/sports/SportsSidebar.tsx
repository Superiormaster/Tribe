// src/components/sports/SportsSidebar.tsx

"use client";

import AppLink from '@/components/AppLink';
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ChevronRight,
  CircleDot,
  Home,
  Newspaper,
  Search,
  Trophy,
  Users,
} from "lucide-react";

interface SportsSidebarProps {
  className?: string;
}

const MAIN_NAV = [
  {
    label: "Sports Home",
    href: "/sports",
    icon: Home,
  },
  {
    label: "Live Matches",
    href: "/sports/live",
    icon: CircleDot,
  },
  {
    label: "Today's Matches",
    href: "/sports/matches/today",
    icon: CalendarDays,
  },
  {
    label: "Results",
    href: "/sports/results",
    icon: Trophy,
  },
];

const DISCOVER_NAV = [
  {
    label: "Competitions",
    href: "/sports/competitions",
    icon: Trophy,
  },
  {
    label: "Teams",
    href: "/sports/teams",
    icon: Users,
  },
  {
    label: "Players",
    href: "/sports/players",
    icon: Users,
  },
  {
    label: "Sports News",
    href: "/sports/news",
    icon: Newspaper,
  },
];

export default function SportsSidebar({
  className = "",
}: SportsSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`hidden w-64 shrink-0 lg:block ${className}`}
    >
      <div className="sticky top-6 space-y-5">
        {/* Search */}
        <div className="rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
          <AppLink
            href="/sports/search"
            className="flex h-10 items-center gap-2 rounded-xl bg-gray-50 px-3 text-sm text-gray-500 transition hover:bg-indigo-50 hover:text-indigo-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-400"
          >
            <Search className="h-4 w-4" />

            <span className="font-medium">
              Search sports
            </span>
          </AppLink>
        </div>

        {/* Main navigation */}
        <SidebarSection title="Sports">
          {MAIN_NAV.map((item) => (
            <SidebarItem
              key={item.href}
              {...item}
              active={isActive(
                pathname,
                item.href
              )}
            />
          ))}
        </SidebarSection>

        {/* Discover */}
        <SidebarSection title="Discover">
          {DISCOVER_NAV.map((item) => (
            <SidebarItem
              key={item.href}
              {...item}
              active={isActive(
                pathname,
                item.href
              )}
            />
          ))}
        </SidebarSection>

        {/* Join Tribe CTA */}
        <div className="overflow-hidden rounded-2xl bg-indigo-600 p-5 text-white">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
            <Trophy className="h-5 w-5" />
          </div>

          <h3 className="text-sm font-extrabold">
            Join Tribe
          </h3>

          <p className="mt-1.5 text-xs leading-5 text-indigo-100">
            Follow your favourite teams, discuss
            matches and connect with other fans.
          </p>

          <AppLink
            href="/main/login"
            className="mt-4 flex items-center justify-between rounded-xl bg-white px-3 py-2.5 text-xs font-bold text-indigo-600 transition hover:bg-indigo-50"
          >
            Join now
            <ChevronRight className="h-4 w-4" />
          </AppLink>
        </div>
      </div>
    </aside>
  );
}

function SidebarSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 px-3 text-[10px] font-extrabold uppercase tracking-wider text-gray-400 dark:text-gray-500">
        {title}
      </h2>

      <nav className="space-y-1">
        {children}
      </nav>
    </section>
  );
}

function SidebarItem({
  label,
  href,
  icon: Icon,
  active,
}: {
  label: string;
  href: string;
  icon: React.ElementType;
  active: boolean;
}) {
  return (
    <AppLink
      href={href}
      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
        active
          ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
      }`}
    >
      <Icon
        className={`h-4 w-4 shrink-0 ${
          active
            ? "stroke-[2.5]"
            : ""
        }`}
      />

      <span className="min-w-0 flex-1 truncate">
        {label}
      </span>

      <ChevronRight
        className={`h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100 ${
          active ? "opacity-100" : ""
        }`}
      />
    </AppLink>
  );
}

function isActive(
  pathname: string | null,
  href: string
) {
  if (!pathname) return false;

  if (href === "/sports") {
    return pathname === "/sports";
  }

  return (
    pathname === href ||
    pathname.startsWith(`${href}/`)
  );
}