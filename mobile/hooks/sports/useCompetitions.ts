import { useCallback, useEffect, useState } from "react";

import type {
Competition,
} from "@/utils/sports/types/sports";

interface UseCompetitionsReturn {
competitions: Competition[];
loading: boolean;
error: string | null;
refetch: () => Promise<void>;
}

const API_URL =
process.env.EXPO_PUBLIC_API_URL || "";

export function useCompetitions(): UseCompetitionsReturn {
const [competitions, setCompetitions] = useState<Competition[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const fetchCompetitions = useCallback(async () => {
setLoading(true);
setError(null);

try {
  const response = await fetch(
    `${API_URL}/api/sports/competitions/`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch competitions (${response.status})`
    );
  }

  const result = await response.json();

  /*
   * Support either:
   *
   * [
   *   {...},
   *   {...}
   * ]
   *
   * or:
   *
   * {
   *   competitions: [...]
   * }
   *
   * or:
   *
   * {
   *   results: [...]
   * }
   */
  const items = Array.isArray(result)
    ? result
    : Array.isArray(result?.competitions)
    ? result.competitions
    : Array.isArray(result?.results)
    ? result.results
    : [];

  setCompetitions(items);
} catch (err) {
  const message =
    err instanceof Error
      ? err.message
      : "Failed to load competitions.";

  setError(message);
  setCompetitions([]);
} finally {
  setLoading(false);
}

}, []);

useEffect(() => {
fetchCompetitions();
}, [fetchCompetitions]);

return {
competitions,
loading,
error,
refetch: fetchCompetitions,
};
}