"use client";

import { useCallback, useEffect, useState } from "react";

import type {
  CompetitionTable,
  StandingRow,
} from "@/utils/sports/types/sports";

interface UseStandingsOptions {
  competitionId?: string;
  season?: string;
  enabled?: boolean;
}

interface UseStandingsReturn {
  standings: StandingRow[];
  competition: CompetitionTable["competition"] | null;
  season: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "";

export function useStandings({
  competitionId,
  season,
  enabled = true,
}: UseStandingsOptions): UseStandingsReturn {
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [competition, setCompetition] =
    useState<CompetitionTable["competition"] | null>(null);
  const [currentSeason, setCurrentSeason] =
    useState<string | null>(season ?? null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStandings = useCallback(async () => {
    if (!competitionId || !enabled) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      if (season) {
        params.set("season", season);
      }

      const query = params.toString();

      const url =
        `${API_URL}/api/sports/competitions/${competitionId}/standings/` +
        (query ? `?${query}` : "");

      const response = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch standings (${response.status})`
        );
      }

      const data: CompetitionTable = await response.json();

      setStandings(data.standings ?? []);
      setCompetition(data.competition ?? null);
      setCurrentSeason(data.season ?? season ?? null);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to load standings.";

      setError(message);
      setStandings([]);
      setCompetition(null);
    } finally {
      setLoading(false);
    }
  }, [competitionId, season, enabled]);

  useEffect(() => {
    fetchStandings();
  }, [fetchStandings]);

  return {
    standings,
    competition,
    season: currentSeason,
    loading,
    error,
    refetch: fetchStandings,
  };
}