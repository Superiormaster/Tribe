"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { Match } from "@/utils/sports/types/sports";
import { LIVE_MATCH_REFRESH_INTERVAL } from "@/utils/sports/constants/sports";

interface UseLiveMatchesOptions {
  enabled?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseLiveMatchesReturn {
  matches: Match[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export function useLiveMatches({
  enabled = true,
  autoRefresh = true,
  refreshInterval = LIVE_MATCH_REFRESH_INTERVAL,
}: UseLiveMatchesOptions = {}): UseLiveMatchesReturn {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  const fetchLiveMatches = useCallback(async () => {
    if (!enabled) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/api/sports/matches/live/`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch live matches (${response.status})`
        );
      }

      const data: Match[] | { matches: Match[] } =
        await response.json();

      const liveMatches = Array.isArray(data)
        ? data
        : data.matches ?? [];

      setMatches(liveMatches);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to load live matches.";

      setError(message);
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    fetchLiveMatches();

    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        fetchLiveMatches();
      }, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [
    enabled,
    autoRefresh,
    refreshInterval,
    fetchLiveMatches,
  ]);

  return {
    matches,
    loading,
    error,
    refetch: fetchLiveMatches,
  };
}