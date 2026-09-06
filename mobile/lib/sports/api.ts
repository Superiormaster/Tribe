import type {
Competition,
CompetitionPageData,
Match,
MatchPageData,
SportsNews,
StandingRow,
TeamDetails,
TeamPageData,
} from "@/utils/sports/types/sports";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "";

const SPORTS_API_BASE = "${API_URL}/api/sports";

interface RequestOptions {
method?: string;
headers?: Record<string, string>;
params?: Record<string, string | number | undefined>;
body?: BodyInit | null;
}

async function request<T>(
endpoint: string,
options: RequestOptions = {}
): Promise<T> {
const { params, ...fetchOptions } = options;

const searchParams = new URLSearchParams();

if (params) {
Object.entries(params).forEach(([key, value]) => {
if (value !== undefined && value !== null) {
searchParams.set(key, String(value));
}
});
}

const query = searchParams.toString();

const url =
"${SPORTS_API_BASE}${endpoint}" +
(query ? "?${query}" : "");

const response = await fetch(url, {
...fetchOptions,
headers: {
Accept: "application/json",
...fetchOptions.headers,
},
});

if (!response.ok) {
let message = "Sports API request failed (${response.status})";

try {
  const errorData = await response.json();

  if (typeof errorData?.detail === "string") {
    message = errorData.detail;
  } else if (typeof errorData?.message === "string") {
    message = errorData.message;
  }
} catch {
  // Keep the default error message.
}

throw new Error(message);

}

return response.json();
}

export async function getMatches(params?: {
date?: string;
competition?: string;
team?: string;
status?: string;
}): Promise<Match[]> {
const data = await request<Match[] | { matches: Match[] }>(
"/matches/",
{
params,
}
);

return Array.isArray(data) ? data : data.matches ?? [];
}

export async function getLiveMatches(): Promise<Match[]> {
const data = await request<Match[] | { matches: Match[] }>(
"/matches/live/",
);

return Array.isArray(data) ? data : data.matches ?? [];
}

export async function getMatch(
matchId: string
): Promise<MatchPageData> {
return request<MatchPageData>(
"/matches/${matchId}/"
);
}

export async function getTeam(
teamId: string
): Promise<TeamPageData> {
return request<TeamPageData>(
"/teams/${teamId}/"
);
}

export async function getTeamMatches(
teamId: string,
params?: {
status?: string;
date?: string;
}
): Promise<Match[]> {
const data = await request<Match[] | { matches: Match[] }>(
"/teams/${teamId}/matches/",
{
params,
}
);

return Array.isArray(data) ? data : data.matches ?? [];
}

export async function getTeamPlayers(
teamId: string
): Promise<NonNullable<TeamDetails["players"]>> {
const data = await request<
NonNullable<TeamDetails["players"]> |
{ players?: NonNullable<TeamDetails["players"]> }

«("/teams/${teamId}/players/");»

return Array.isArray(data)
? data
: data.players ?? [];
}

export async function getCompetitions(): Promise<Competition[]> {
const data = await request<
Competition[] | { competitions: Competition[] }

«("/competitions/");»

return Array.isArray(data)
? data
: data.competitions ?? [];
}

export async function getCompetition(
competitionId: string
): Promise<CompetitionPageData> {
return request<CompetitionPageData>(
"/competitions/${competitionId}/"
);
}

export async function getCompetitionMatches(
competitionId: string,
params?: {
date?: string;
status?: string;
season?: string;
}
): Promise<Match[]> {
const data = await request<
Match[] | { matches: Match[] }

«(
"/competitions/${competitionId}/matches/",
{
params,
}
);»

return Array.isArray(data)
? data
: data.matches ?? [];
}

export async function getStandings(
competitionId: string,
season?: string
): Promise<StandingRow[]> {
const data = await request<
StandingRow[] | {
standings: StandingRow[];
}

«(
"/competitions/${competitionId}/standings/",
{
params: {
season,
},
}
);»

return Array.isArray(data)
? data
: data.standings ?? [];
}

export async function getSportsNews(params?: {
competition?: string;
team?: string;
limit?: number;
}): Promise<SportsNews[]> {
const data = await request<
SportsNews[] | { news: SportsNews[] }

«("/news/", {
params,
});»

return Array.isArray(data)
? data
: data.news ?? [];
}

export async function getSportsDashboard(): Promise<{
liveMatches: Match[];
upcomingMatches: Match[];
recentResults: Match[];
news: SportsNews[];
popularCompetitions: Competition[];
}> {
return request(
"/dashboard/"
);
}