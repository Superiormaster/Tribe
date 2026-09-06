// src/types/sports.ts

export type MatchStatus =
  | "scheduled"
  | "live"
  | "halftime"
  | "finished"
  | "postponed"
  | "cancelled"
  | "suspended";

export type MatchEventType =
  | "goal"
  | "own_goal"
  | "penalty_goal"
  | "missed_penalty"
  | "yellow_card"
  | "red_card"
  | "second_yellow"
  | "substitution"
  | "var"
  | "kickoff"
  | "halftime"
  | "fulltime";

export type MatchPeriod =
  | "first_half"
  | "second_half"
  | "extra_time_first_half"
  | "extra_time_second_half"
  | "penalties";

export interface Competition {
  id: string;
  name: string;
  shortName?: string;
  country?: string;
  countryCode?: string;
  logo?: string;
  season?: string;
}

export interface Team {
  id: string;
  name: string;
  shortName?: string;
  code?: string;
  logo?: string;
  country?: string;
  countryCode?: string;
}

export interface Player {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  photo?: string;
  position?: string;
  number?: number;
  nationality?: string;
  nationalityCode?: string;
}

export interface MatchScore {
  home: number;
  away: number;
  halftimeHome?: number;
  halftimeAway?: number;
  extraTimeHome?: number;
  extraTimeAway?: number;
  penaltiesHome?: number;
  penaltiesAway?: number;
}

export interface MatchEvent {
  id: string;
  type: MatchEventType;
  minute: number;
  extraMinute?: number;

  teamId?: string;
  player?: Player;
  assistPlayer?: Player;

  description?: string;
  period?: MatchPeriod;
}

export interface MatchStats {
  possession?: {
    home: number;
    away: number;
  };

  shots?: {
    home: number;
    away: number;
  };

  shotsOnTarget?: {
    home: number;
    away: number;
  };

  corners?: {
    home: number;
    away: number;
  };

  fouls?: {
    home: number;
    away: number;
  };

  offsides?: {
    home: number;
    away: number;
  };

  yellowCards?: {
    home: number;
    away: number;
  };

  redCards?: {
    home: number;
    away: number;
  };
}

export interface LineupPlayer extends Player {
  starter: boolean;
  position?: string;
  rating?: number;
}

export interface TeamLineup {
  team: Team;
  formation?: string;
  starters: LineupPlayer[];
  substitutes: LineupPlayer[];
  coach?: {
    id: string;
    name: string;
    photo?: string;
  };
}

export interface MatchLineups {
  home: TeamLineup;
  away: TeamLineup;
}

export interface Match {
  id: string;

  competition: Competition;

  homeTeam: Team;
  awayTeam: Team;

  status: MatchStatus;

  date: string;
  kickoffTime: string;

  venue?: string;
  referee?: string;

  score?: MatchScore;

  minute?: number;

  events?: MatchEvent[];

  statistics?: MatchStats;

  lineups?: MatchLineups;
}

export interface StandingRow {
  position: number;
  team: Team;

  played: number;
  wins: number;
  draws: number;
  losses: number;

  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;

  points: number;

  form?: MatchResult[];
}

export type MatchResult = "W" | "D" | "L";

export interface CompetitionTable {
  competition: Competition;
  season: string;
  standings: StandingRow[];
}

export interface TeamForm {
  matchId: string;
  opponent: Team;
  isHome: boolean;
  result: MatchResult;
  score: MatchScore;
  date: string;
}

export interface TeamDetails extends Team {
  founded?: number;
  stadium?: string;
  stadiumCapacity?: number;
  coach?: {
    id: string;
    name: string;
    photo?: string;
  };
  competition?: Competition;
  players?: PlayerStats[];
  squad?: Player[];
  roster?: Player[];
}

export interface PlayerStats {
  player: Player;

  appearances?: number;
  starts?: number;
  minutes?: number;

  goals?: number;
  assists?: number;

  shots?: number;
  shotsOnTarget?: number;

  yellowCards?: number;
  redCards?: number;

  rating?: number;
}

export interface SportsNews {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  image?: string;

  category?: string;
  tags?: string[];

  publishedAt: string;

  team?: Team;
  competition?: Competition;
}

export interface FeaturedMatch {
  match: Match;
  title?: string;
  description?: string;
  image?: string;
}

export interface SportsPageData {
  liveMatches: Match[];
  upcomingMatches: Match[];
  recentResults: Match[];
  featuredMatches: FeaturedMatch[];
  popularCompetitions: Competition[];
  news: SportsNews[];
}

export interface MatchPageData {
  match: Match;
  relatedNews?: SportsNews[];
  relatedMatches?: Match[];
}

export interface TeamPageData {
  team: TeamDetails;
  nextMatch?: Match;
  recentMatches: Match[];
  form: TeamForm[];
  news: SportsNews[];
  players?: PlayerStats[];
}

export interface CompetitionPageData {
  competition: Competition;
  upcomingMatches: Match[];
  recentResults: Match[];
  standings: StandingRow[];
  topPlayers?: PlayerStats[];
  news: SportsNews[];
}