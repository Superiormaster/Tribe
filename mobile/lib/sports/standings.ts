// src/lib/sports/standings.ts

import { getStandings as fetchStandings } from "@/lib/sports/api";

import type {
  CompetitionTable,
  StandingRow,
} from "@/utils/sports/types/sports";

/**
 * Get the league standings for a competition.
 */
export async function getStandings(
  competitionId: string,
  season?: string
): Promise<StandingRow[]> {
  if (!competitionId) {
    throw new Error("Competition ID is required.");
  }

  return fetchStandings(competitionId, season);
}

/**
 * Get complete competition table information.
 */
export async function getCompetitionTable(
  competitionId: string,
  season?: string
): Promise<CompetitionTable> {
  if (!competitionId) {
    throw new Error("Competition ID is required.");
  }

  const standings = await getStandings(
    competitionId,
    season
  );

  return {
    competition: {
      id: competitionId,
      name: "",
    },
    season: season ?? "",
    standings,
  };
}

/**
 * Find a team's position in the standings.
 */
export async function getTeamStanding(
  competitionId: string,
  teamId: string,
  season?: string
): Promise<StandingRow | null> {
  if (!competitionId) {
    throw new Error("Competition ID is required.");
  }

  if (!teamId) {
    throw new Error("Team ID is required.");
  }

  const standings = await getStandings(
    competitionId,
    season
  );

  return (
    standings.find(
      (standing) => standing.team.id === teamId
    ) ?? null
  );
}

/**
 * Get the top teams from a competition.
 */
export async function getTopStandings(
  competitionId: string,
  limit = 5,
  season?: string
): Promise<StandingRow[]> {
  const standings = await getStandings(
    competitionId,
    season
  );

  return standings.slice(0, Math.max(0, limit));
}

/**
 * Get standings sorted by points.
 */
export async function getStandingsByPoints(
  competitionId: string,
  season?: string
): Promise<StandingRow[]> {
  const standings = await getStandings(
    competitionId,
    season
  );

  return [...standings].sort(
    (a, b) =>
      b.points - a.points ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor
  );
}

/**
 * Get a team's current position.
 */
export async function getTeamPosition(
  competitionId: string,
  teamId: string,
  season?: string
): Promise<number | null> {
  const standing = await getTeamStanding(
    competitionId,
    teamId,
    season
  );

  return standing?.position ?? null;
}