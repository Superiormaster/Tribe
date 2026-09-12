// src/components/sports/SportsMobileNav.tsx

"use client";

import AppLink from '@/components/AppLink';
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ChevronRight,
  Home,
  Radio,
  Trophy,
  Users,
} from "lucide-react";

interface SportsMobileNavProps {
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

export default function SportsMobileNav({
  className = "",
}: SportsMobileNavProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Sports navigation"
      className={`sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/95 lg:hidden ${className}`}
    >
      <div className="mx-auto flex max-w-7xl items-center overflow-x-auto px-3 scrollbar-none">
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
              className={`relative flex min-w-[76px] shrink-0 flex-col items-center justify-center gap-1 px-3 py-3 transition-colors ${
                active
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              <Icon
                className={`h-5 w-5 ${
                  active ? "stroke-[2.5]" : ""
                }`}
              />

              <span
                className={`text-[10px] font-semibold ${
                  active ? "font-bold" : ""
                }`}
              >
                {item.label}
              </span>

              {active && (
                <span className="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-indigo-600 dark:bg-indigo-400" />
              )}
            </AppLink>
          );
        })}

        {/* More */}
        <AppLink
          href="/sports/more"
          className={`flex min-w-[76px] shrink-0 flex-col items-center justify-center gap-1 px-3 py-3 text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white ${
            pathname.startsWith("/sports/more")
              ? "text-indigo-600 dark:text-indigo-400"
              : ""
          }`}
        >
          <ChevronRight className="h-5 w-5" />

          <span className="text-[10px] font-semibold">
            More
          </span>
        </AppLink>
      </div>
    </nav>
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