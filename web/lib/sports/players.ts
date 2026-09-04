// src/lib/sports/players.ts

import { getTeamPlayers as fetchTeamPlayers } from "@/lib/sports/api";

import type {
  Player,
  PlayerStats,
} from "@/utils/sports/types/sports";

/**
 * Get all players for a team.
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
 * Find a player by ID within a team's squad.
 */
export async function getTeamPlayer(
  teamId: string,
  playerId: string
): Promise<PlayerStats | null> {
  if (!teamId) {
    throw new Error("Team ID is required.");
  }

  if (!playerId) {
    throw new Error("Player ID is required.");
  }

  const players = await getTeamPlayers(teamId);

  return (
    players.find(
      (player) => player.player.id === playerId
    ) ?? null
  );
}

/**
 * Get players filtered by position.
 */
export async function getPlayersByPosition(
  teamId: string,
  position: string
): Promise<PlayerStats[]> {
  if (!teamId) {
    throw new Error("Team ID is required.");
  }

  const players = await getTeamPlayers(teamId);

  const normalizedPosition = position
    .trim()
    .toLowerCase();

  return players.filter((player) =>
    player.player.position
      ?.toLowerCase()
      .includes(normalizedPosition)
  );
}

/**
 * Get goal scorers from a team's squad statistics.
 */
export async function getTopScorers(
  teamId: string,
  limit = 5
): Promise<PlayerStats[]> {
  const players = await getTeamPlayers(teamId);

  return [...players]
    .sort(
      (a, b) =>
        (b.goals ?? 0) -
        (a.goals ?? 0)
    )
    .slice(0, Math.max(0, limit));
}

/**
 * Get the players with the most assists.
 */
export async function getTopAssists(
  teamId: string,
  limit = 5
): Promise<PlayerStats[]> {
  const players = await getTeamPlayers(teamId);

  return [...players]
    .sort(
      (a, b) =>
        (b.assists ?? 0) -
        (a.assists ?? 0)
    )
    .slice(0, Math.max(0, limit));
}

/**
 * Get players with the most appearances.
 */
export async function getMostAppearances(
  teamId: string,
  limit = 5
): Promise<PlayerStats[]> {
  const players = await getTeamPlayers(teamId);

  return [...players]
    .sort(
      (a, b) =>
        (b.appearances ?? 0) -
        (a.appearances ?? 0)
    )
    .slice(0, Math.max(0, limit));
}

/**
 * Get players with the highest ratings.
 */
export async function getTopRatedPlayers(
  teamId: string,
  limit = 5
): Promise<PlayerStats[]> {
  const players = await getTeamPlayers(teamId);

  return [...players]
    .filter(
      (player) =>
        player.rating !== undefined &&
        player.rating !== null
    )
    .sort(
      (a, b) =>
        (b.rating ?? 0) -
        (a.rating ?? 0)
    )
    .slice(0, Math.max(0, limit));
}

/**
 * Get a player's basic profile from their statistics.
 */
export async function getPlayerProfile(
  teamId: string,
  playerId: string
): Promise<Player | null> {
  const player = await getTeamPlayer(
    teamId,
    playerId
  );

  return player?.player ?? null;
}