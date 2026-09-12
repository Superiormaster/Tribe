// src/components/sports/SportsHeader.tsx

"use client";

import AppLink from '@/components/AppLink';
import { usePathname } from "next/navigation";
import { useNavigation } from "@/utils/useNavigation"
import Image from "next/image";
import { tribe2 } from "@/assets";
import {
  CalendarDays,
  ChevronDown,
  Home,
  Radio,
  Search,
  Trophy,
  Users,
} from "lucide-react";

interface SportsHeaderProps {
  title?: string;
  subtitle?: string;
  showSearch?: boolean;
  showNavigation?: boolean;
  className?: string;
}

const NAV_ITEMS = [
  {
    label: "Home",
    href: "/sports",
    icon: Home,
  },
  {
    label: "Live",
    href: "/sports/live",
    icon: Radio,
  },
  {
    label: "Matches",
    href: "/sports/matches",
    icon: CalendarDays,
  },
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
];

export default function SportsHeader({
  title = "Sports",
  subtitle = "Follow matches, results, teams and competitions",
  showSearch = true,
  showNavigation = true,
  className = "",
}: SportsHeaderProps) {
  const pathname = usePathname();
  const { push, replace } = useNavigation();

  return (
    <header
      className={`w-full border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950 ${className}`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Top section */}
        <div className="flex min-h-[72px] items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            {/* Logo */}
            <AppLink
              href="/sports"
              aria-label="Tribe Sports"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 shadow-sm transition hover:bg-indigo-700"
            >
              <Image
                src={tribe2}
                alt="Tribe Sports"
                className="h-full w-full object-cover"
              />
            </AppLink>

            {/* Title */}
            <div className="min-w-0">
              <h1 className="truncate text-lg font-extrabold text-gray-900 dark:text-white sm:text-xl">
                {title}
              </h1>

              <p className="hidden truncate text-xs text-gray-500 dark:text-gray-400 sm:block">
                {subtitle}
              </p>
            </div>
          </div>

          {/* Search */}
          {showSearch && (
            <button
              type="button"
              onClick={() => push(`/sports/search/`)}
              aria-label="Search sports"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-500 transition hover:border-indigo-600 hover:text-indigo-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-indigo-500 dark:hover:text-indigo-400 sm:w-auto sm:gap-2 sm:px-3"
            >
              <Search className="h-4 w-4" />

              <span className="hidden text-xs font-semibold sm:inline">
                Search
              </span>
            </button>
          )}
        </div>

        {/* Desktop navigation */}
        {showNavigation && (
          <div className="hidden items-center gap-1 overflow-x-auto lg:flex">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(
                pathname,
                item.href
              );

              return (
                <AppLink
                  key={item.href}
                  href={item.href}
                  className={`relative flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors ${
                    active
                      ? "text-indigo-600 dark:text-indigo-400"
                      : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 ${
                      active ? "stroke-[2.5]" : ""
                    }`}
                  />

                  {item.label}

                  {active && (
                    <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                  )}
                </AppLink>
              );
            })}

            {/* More dropdown trigger */}
            <button
              type="button"
              className="flex items-center gap-1 px-4 py-3 text-sm font-semibold text-gray-500 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              More
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </header>
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