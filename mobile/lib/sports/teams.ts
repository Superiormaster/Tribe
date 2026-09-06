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

  export async function getTeam(
  teamId: string
  ): Promise<TeamPageData> {
  if (!teamId) {
  throw new Error("Team ID is required.");
  }

return fetchTeam(teamId);
}

  export async function getTeamMatches(
  teamId: string,
  filters?: TeamMatchFilters
  ): Promise<Match[]> {
  if (!teamId) {
  throw new Error("Team ID is required.");
  }

return fetchTeamMatches(teamId, filters);
}

  export async function getUpcomingTeamMatches(
  teamId: string
  ): Promise<Match[]> {
  return getTeamMatches(teamId, {
  status: "upcoming",
  });
  }

  export async function getFinishedTeamMatches(
  teamId: string
  ): Promise<Match[]> {
  return getTeamMatches(teamId, {
  status: "finished",
  });
  }

  export async function getLiveTeamMatches(
  teamId: string
  ): Promise<Match[]> {
  return getTeamMatches(teamId, {
  status: "live",
  });
  }

  export async function getTeamPlayers(
  teamId: string
  ): Promise<PlayerStats[]> {
  if (!teamId) {
  throw new Error("Team ID is required.");
  }

return fetchTeamPlayers(teamId) as Promise<PlayerStats[]>;
}

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

  export async function getTeamDetails(
  teamId: string
  ): Promise<TeamDetails> {
  const data = await getTeam(teamId);

return data.team;
}