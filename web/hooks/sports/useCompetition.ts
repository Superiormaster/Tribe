"use client";

import { useCallback, useEffect, useState } from "react";

import type {
  Competition,
  CompetitionPageData,
} from "@/utils/sports/types/sports";

interface UseCompetitionOptions {
  competitionId?: string;
  enabled?: boolean;
}

interface UseCompetitionReturn {
  competition: Competition | null;
  data: CompetitionPageData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export function useCompetition({
  competitionId,
  enabled = true,
}: UseCompetitionOptions): UseCompetitionReturn {
  const [competition, setCompetition] =
    useState<Competition | null>(null);

  const [data, setData] =
    useState<CompetitionPageData | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] =
    useState<string | null>(null);

  const fetchCompetition = useCallback(async () => {
    if (!competitionId || !enabled) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/api/sports/competitions/${competitionId}/`,
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
          `Failed to fetch competition (${response.status})`
        );
      }

      const result: CompetitionPageData =
        await response.json();

      setData(result);
      setCompetition(result.competition ?? null);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to load competition.";

      setError(message);
      setCompetition(null);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [competitionId, enabled]);

  useEffect(() => {
    fetchCompetition();
  }, [fetchCompetition]);

  return {
    competition,
    data,
    loading,
    error,
    refetch: fetchCompetition,
  };
}