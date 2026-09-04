// src/lib/sports/teams.ts

import {
  getTeam as fetchTeam,
  getTeamMatches as fetchTeamMatches,
  getTeamPlayers as fetchTeamPlayers,
} from "@/lib/sports/api";

import type {
  Match,
  PlayerStats,
  TeamDetails,
  TeamPageData,
} from "@/utils/sports/types/sports";

export interface TeamMatchFilters {
  status?: "all" | "live" | "upcoming" | "finished";
  date?: string;
}

/**
 * Get a team's complete page data.
 */
export async function getTeam(
  teamId: string
): Promise<TeamPageData> {
  if (!teamId) {
    throw new Error("Team ID is required.");
  }

  return fetchTeam(teamId);
}

/**
 * Get matches for a specific team.
 */
export async function getTeamMatches(
  teamId: string,
  filters?: TeamMatchFilters
): Promise<Match[]> {
  if (!teamId) {
    throw new Error("Team ID is required.");
  }

  return fetchTeamMatches(teamId, filters);
}

/**
 * Get upcoming matches for a team.
 */
export async function getUpcomingTeamMatches(
  teamId: string
): Promise<Match[]> {
  return getTeamMatches(teamId, {
    status: "upcoming",
  });
}

/**
 * Get finished matches for a team.
 */
export async function getFinishedTeamMatches(
  teamId: string
): Promise<Match[]> {
  return getTeamMatches(teamId, {
    status: "finished",
  });
}

/**
 * Get currently live matches for a team.
 */
export async function getLiveTeamMatches(
  teamId: string
): Promise<Match[]> {
  return getTeamMatches(teamId, {
    status: "live",
  });
}

/**
 * Get a team's players.
 */
export async function getTeamPlayers(
  teamId: string
): Promise<PlayerStats[]> {
  if (!teamId) {
    throw new Error("Team ID is required.");
  }

  return fetchTeamPlayers(teamId) as Promise<PlayerStats[]>;
}

/**
 * Get the next scheduled match for a team.
 */
export async function getNextTeamMatch(
  teamId: string
): Promise<Match | null> {
  const matches = await getUpcomingTeamMatches(teamId);

  if (!matches.length) {
    return null;
  }

  return [...matches].sort(
    (a, b) =>
      new Date(a.date).getTime() -
      new Date(b.date).getTime()
  )[0];
}

/**
 * Get the team's most recent finished matches.
 */
export async function getRecentTeamMatches(
  teamId: string,
  limit = 5
): Promise<Match[]> {
  const matches = await getFinishedTeamMatches(teamId);

  return [...matches]
    .sort(
      (a, b) =>
        new Date(b.date).getTime() -
        new Date(a.date).getTime()
    )
    .slice(0, limit);
}

/**
 * Get basic team information from the full team response.
 */
export async function getTeamDetails(
  teamId: string
): Promise<TeamDetails> {
  const data = await getTeam(teamId);

  return data.team;
}