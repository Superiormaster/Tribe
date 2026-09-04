"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import type { Team } from "@/utils/sports/types/sports";

interface UseTeamsOptions {
  enabled?: boolean;
}

interface UseTeamsReturn {
  teams: Team[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export function useTeams({
  enabled = true,
}: UseTeamsOptions = {}): UseTeamsReturn {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] =
    useState<string | null>(null);

  const fetchTeams = useCallback(async () => {
    if (!enabled) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/api/sports/teams/`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch teams (${response.status})`
        );
      }

      const result = await response.json();

      const items = Array.isArray(result)
        ? result
        : Array.isArray(result?.teams)
        ? result.teams
        : Array.isArray(result?.results)
        ? result.results
        : [];

      setTeams(items);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to load teams.";

      setError(message);
      setTeams([]);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  return {
    teams,
    loading,
    error,
    refetch: fetchTeams,
  };
}