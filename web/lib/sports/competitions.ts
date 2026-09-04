// src/lib/sports/competitions.ts

import {
  getCompetitions as fetchCompetitions,
  getCompetition as fetchCompetition,
  getCompetitionMatches as fetchCompetitionMatches,
} from "@/lib/sports/api";

import type {
  Competition,
  CompetitionPageData,
  Match,
} from "@/utils/sports/types/sports";

export interface CompetitionMatchFilters {
  date?: string;
  status?: "all" | "live" | "upcoming" | "finished";
  season?: string;
}

/**
 * Get all available competitions.
 */
export async function getCompetitions(): Promise<Competition[]> {
  return fetchCompetitions();
}

/**
 * Get a single competition with its page data.
 */
export async function getCompetition(
  competitionId: string
): Promise<CompetitionPageData> {
  if (!competitionId) {
    throw new Error("Competition ID is required.");
  }

  return fetchCompetition(competitionId);
}

/**
 * Get matches for a competition.
 */
export async function getCompetitionMatches(
  competitionId: string,
  filters?: CompetitionMatchFilters
): Promise<Match[]> {
  if (!competitionId) {
    throw new Error("Competition ID is required.");
  }

  return fetchCompetitionMatches(
    competitionId,
    filters
  );
}

/**
 * Get upcoming matches for a competition.
 */
export async function getUpcomingCompetitionMatches(
  competitionId: string,
  season?: string
): Promise<Match[]> {
  return getCompetitionMatches(competitionId, {
    status: "upcoming",
    season,
  });
}

/**
 * Get finished matches for a competition.
 */
export async function getFinishedCompetitionMatches(
  competitionId: string,
  season?: string
): Promise<Match[]> {
  return getCompetitionMatches(competitionId, {
    status: "finished",
    season,
  });
}

/**
 * Get currently live matches for a competition.
 */
export async function getLiveCompetitionMatches(
  competitionId: string,
  season?: string
): Promise<Match[]> {
  return getCompetitionMatches(competitionId, {
    status: "live",
    season,
  });
}

/**
 * Find a competition by ID from a list of competitions.
 */
export async function findCompetition(
  competitionId: string
): Promise<Competition | null> {
  if (!competitionId) {
    return null;
  }

  const competitions = await getCompetitions();

  return (
    competitions.find(
      (competition) =>
        competition.id === competitionId
    ) ?? null
  );
}

/**
 * Get competitions from a specific country.
 */
export async function getCompetitionsByCountry(
  countryCode: string
): Promise<Competition[]> {
  if (!countryCode) {
    return [];
  }

  const competitions = await getCompetitions();

  const normalizedCode = countryCode
    .trim()
    .toUpperCase();

  return competitions.filter(
    (competition) =>
      competition.countryCode?.toUpperCase() ===
      normalizedCode
  );
}

/**
 * Search competitions by name.
 */
export async function searchCompetitions(
  query: string
): Promise<Competition[]> {
  if (!query.trim()) {
    return [];
  }

  const competitions = await getCompetitions();

  const normalizedQuery = query
    .trim()
    .toLowerCase();

  return competitions.filter((competition) => {
    const name = competition.name.toLowerCase();
    const shortName =
      competition.shortName?.toLowerCase() ?? "";

    return (
      name.includes(normalizedQuery) ||
      shortName.includes(normalizedQuery)
    );
  });
}