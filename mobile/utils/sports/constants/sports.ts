// src/constants/sports.ts

import type { Competition, MatchStatus } from "@/utils/sports/types/sports";

export const SPORTS_PRIMARY_COLOR = "indigo-600";

export const SPORTS_ROUTES = {
  home: "/sports",
  live: "/sports/live",
  fixtures: "/sports/fixtures",
  results: "/sports/results",
  competitions: "/sports/competitions",
  teams: "/sports/teams",
  matches: "/sports/matches",
} as const;

export const SPORTS_NAV_ITEMS = [
  {
    label: "Sports",
    href: SPORTS_ROUTES.home,
  },
  {
    label: "Live",
    href: SPORTS_ROUTES.live,
  },
  {
    label: "Fixtures",
    href: SPORTS_ROUTES.fixtures,
  },
  {
    label: "Results",
    href: SPORTS_ROUTES.results,
  },
  {
    label: "Competitions",
    href: SPORTS_ROUTES.competitions,
  },
] as const;

export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  scheduled: "Upcoming",
  live: "Live",
  halftime: "Half-time",
  finished: "FT",
  postponed: "Postponed",
  cancelled: "Cancelled",
  suspended: "Suspended",
};

export const MATCH_STATUS_COLORS: Record<MatchStatus, string> = {
  scheduled: "text-gray-500 dark:text-gray-400",
  live: "text-red-600 dark:text-red-400",
  halftime: "text-amber-600 dark:text-amber-400",
  finished: "text-gray-500 dark:text-gray-400",
  postponed: "text-orange-600 dark:text-orange-400",
  cancelled: "text-red-600 dark:text-red-400",
  suspended: "text-orange-600 dark:text-orange-400",
};

export const MATCH_EVENT_LABELS = {
  goal: "Goal",
  own_goal: "Own Goal",
  penalty_goal: "Penalty",
  missed_penalty: "Missed Penalty",
  yellow_card: "Yellow Card",
  red_card: "Red Card",
  second_yellow: "Second Yellow",
  substitution: "Substitution",
  var: "VAR",
  kickoff: "Kick-off",
  halftime: "Half-time",
  fulltime: "Full-time",
} as const;

export const POPULAR_COMPETITIONS: Competition[] = [
  {
    id: "premier-league",
    name: "Premier League",
    shortName: "Premier League",
    country: "England",
    countryCode: "GB",
  },
  {
    id: "champions-league",
    name: "UEFA Champions League",
    shortName: "Champions League",
    country: "Europe",
    countryCode: "EU",
  },
  {
    id: "la-liga",
    name: "La Liga",
    shortName: "La Liga",
    country: "Spain",
    countryCode: "ES",
  },
  {
    id: "serie-a",
    name: "Serie A",
    shortName: "Serie A",
    country: "Italy",
    countryCode: "IT",
  },
  {
    id: "bundesliga",
    name: "Bundesliga",
    shortName: "Bundesliga",
    country: "Germany",
    countryCode: "DE",
  },
  {
    id: "ligue-1",
    name: "Ligue 1",
    shortName: "Ligue 1",
    country: "France",
    countryCode: "FR",
  },
];

export const SPORTS_DATE_FILTERS = [
  {
    label: "Yesterday",
    value: "yesterday",
  },
  {
    label: "Today",
    value: "today",
  },
  {
    label: "Tomorrow",
    value: "tomorrow",
  },
] as const;

export const TEAM_PAGE_TABS = [
  {
    label: "Overview",
    value: "overview",
  },
  {
    label: "Matches",
    value: "matches",
  },
  {
    label: "Table",
    value: "table",
  },
  {
    label: "News",
    value: "news",
  },
  {
    label: "Players",
    value: "players",
  },
] as const;

export const COMPETITION_PAGE_TABS = [
  {
    label: "Overview",
    value: "overview",
  },
  {
    label: "Matches",
    value: "matches",
  },
  {
    label: "Table",
    value: "table",
  },
  {
    label: "News",
    value: "news",
  },
] as const;

export const MATCH_PAGE_TABS = [
  {
    label: "Overview",
    value: "overview",
  },
  {
    label: "Events",
    value: "events",
  },
  {
    label: "Statistics",
    value: "statistics",
  },
  {
    label: "Lineups",
    value: "lineups",
  },
] as const;

export const SPORTS_LIMITS = {
  featuredMatches: 5,
  liveMatches: 20,
  upcomingMatches: 10,
  recentResults: 10,
  news: 6,
  popularCompetitions: 8,
  teamForm: 5,
  standings: 20,
  topPlayers: 10,
} as const;

export const LIVE_MATCH_REFRESH_INTERVAL = 30_000;

export const SPORTS_CACHE_TIMES = {
  liveMatches: 15_000,
  fixtures: 60_000,
  results: 300_000,
  standings: 300_000,
  teams: 3_600_000,
  competitions: 86_400_000,
} as const;

export const SPORTS_THEME = {
  primary: {
    light: "indigo-600",
    dark: "indigo-500",
  },
  background: {
    light: "gray-50",
    dark: "gray-950",
  },
  card: {
    light: "white",
    dark: "gray-900",
  },
  border: {
    light: "gray-200",
    dark: "gray-800",
  },
  muted: {
    light: "gray-500",
    dark: "gray-400",
  },
} as const;