// src/lib/sports/matches.ts

import {
  getLiveMatches as fetchLiveMatches,
  getMatch as fetchMatch,
  getMatches as fetchMatches,
} from "@/lib/sports/api";

import type { Match, MatchPageData } from "@/utils/sports/types/sports";

export interface MatchFilters {
  date?: string;
  competition?: string;
  team?: string;
  status?: "all" | "live" | "upcoming" | "finished";
}

/**
 * Get matches using optional filters.
 */
export async function getMatches(
  filters?: MatchFilters
): Promise<Match[]> {
  return fetchMatches(filters);
}

/**
 * Get all currently live matches.
 */
export async function getLiveMatches(): Promise<Match[]> {
  return fetchLiveMatches();
}

/**
 * Get a single match and its related information.
 */
export async function getMatch(
  matchId: string
): Promise<MatchPageData> {
  if (!matchId) {
    throw new Error("Match ID is required.");
  }

  return fetchMatch(matchId);
}

/**
 * Get today's matches.
 */
export async function getTodayMatches(): Promise<Match[]> {
  const today = new Date().toISOString().split("T")[0];

  return getMatches({
    date: today,
  });
}

/**
 * Get upcoming matches.
 */
export async function getUpcomingMatches(
  filters?: Omit<MatchFilters, "status">
): Promise<Match[]> {
  return getMatches({
    ...filters,
    status: "upcoming",
  });
}

/**
 * Get finished matches.
 */
export async function getFinishedMatches(
  filters?: Omit<MatchFilters, "status">
): Promise<Match[]> {
  return getMatches({
    ...filters,
    status: "finished",
  });
}

/**
 * Get matches for a specific competition.
 */
export async function getCompetitionMatches(
  competitionId: string,
  filters?: Omit<MatchFilters, "competition">
): Promise<Match[]> {
  if (!competitionId) {
    throw new Error("Competition ID is required.");
  }

  return getMatches({
    ...filters,
    competition: competitionId,
  });
}

/**
 * Get matches for a specific team.
 */
export async function getTeamMatches(
  teamId: string,
  filters?: Omit<MatchFilters, "team">
): Promise<Match[]> {
  if (!teamId) {
    throw new Error("Team ID is required.");
  }

  return getMatches({
    ...filters,
    team: teamId,
  });
}