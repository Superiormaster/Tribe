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

  export async function getMatches(
  filters?: MatchFilters
  ): Promise<Match[]> {
  return fetchMatches(filters);
  }

  export async function getLiveMatches(): Promise<Match[]> {
  return fetchLiveMatches();
  }

  export async function getMatch(
  matchId: string
  ): Promise<MatchPageData> {
  if (!matchId) {
  throw new Error("Match ID is required.");
  }

return fetchMatch(matchId);
}

  export async function getTodayMatches(): Promise<Match[]> {
  const today = new Date().toISOString().split("T")[0];

return getMatches({
date: today,
});
}

  export async function getUpcomingMatches(
  filters?: Omit<MatchFilters, "status">
  ): Promise<Match[]> {
  return getMatches({
  ...filters,
  status: "upcoming",
  });
  }

  export async function getFinishedMatches(
  filters?: Omit<MatchFilters, "status">
  ): Promise<Match[]> {
  return getMatches({
  ...filters,
  status: "finished",
  });
  }

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