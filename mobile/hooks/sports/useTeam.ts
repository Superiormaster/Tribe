import { useCallback, useEffect, useState } from "react";

import type {
TeamDetails,
TeamPageData,
} from "@/utils/sports/types/sports";

interface UseTeamOptions {
teamId?: string;
enabled?: boolean;
}

interface UseTeamReturn {
team: TeamDetails | null;
data: TeamPageData | null;
loading: boolean;
error: string | null;
refetch: () => Promise<void>;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL || "";

export function useTeam({
teamId,
enabled = true,
}: UseTeamOptions): UseTeamReturn {
const [team, setTeam] = useState<TeamDetails | null>(null);
const [data, setData] = useState<TeamPageData | null>(null);

const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const fetchTeam = useCallback(async () => {
if (!teamId || !enabled) {
return;
}

setLoading(true);
setError(null);

try {
  const response = await fetch(
    `${API_URL}/api/sports/teams/${teamId}/`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch team (${response.status})`
    );
  }

  const result: TeamPageData = await response.json();

  setData(result);
  setTeam(result.team ?? null);
} catch (err) {
  const message =
    err instanceof Error
      ? err.message
      : "Failed to load team.";

  setError(message);
  setTeam(null);
  setData(null);
} finally {
  setLoading(false);
}

}, [teamId, enabled]);

useEffect(() => {
fetchTeam();
}, [fetchTeam]);

return {
team,
data,
loading,
error,
refetch: fetchTeam,
};
}