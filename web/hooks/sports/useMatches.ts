// src/hooks/sports/useMatches.ts

"use client";

import { useCallback, useEffect, useState } from "react";

import type { Match } from "@/utils/sports/types/sports";

type MatchFilter =
  | "all"
  | "live"
  | "upcoming"
  | "finished";

interface UseMatchesOptions {
  date?: string;
  competitionId?: string;
  teamId?: string;
  status?: MatchFilter;
  enabled?: boolean;
}

interface UseMatchesReturn {
  matches: Match[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export function useMatches({
  date,
  competitionId,
  teamId,
  status = "all",
  enabled = true,
}: UseMatchesOptions = {}): UseMatchesReturn {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMatches = useCallback(async () => {
    if (!enabled) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      if (date) {
        params.set("date", date);
      }

      if (competitionId) {
        params.set("competition", competitionId);
      }

      if (teamId) {
        params.set("team", teamId);
      }

      if (status !== "all") {
        params.set("status", status);
      }

      const query = params.toString();

      const url =
        `${API_URL}/api/sports/matches/` +
        (query ? `?${query}` : "");

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch matches (${response.status})`
        );
      }

      const data: Match[] | { matches: Match[] } =
        await response.json();

      const result = Array.isArray(data)
        ? data
        : data.matches ?? [];

      setMatches(result);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to load matches.";

      setError(message);
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }, [
    date,
    competitionId,
    teamId,
    status,
    enabled,
  ]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  return {
    matches,
    loading,
    error,
    refetch: fetchMatches,
  };
}