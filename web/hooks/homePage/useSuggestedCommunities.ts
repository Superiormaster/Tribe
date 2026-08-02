'use client';

import { useState, useEffect, useCallback } from "react";
import { apiRequest } from "@/utils/api";

export function useSuggestedCommunities(
  filter: "all" | "tribes"
) {
  const [suggestedCommunities, setSuggestedCommunities] =
    useState<any[]>([]);

  const [loadingSuggested, setLoadingSuggested] =
    useState(false);

  const [suggestedError, setSuggestedError] =
    useState<any>(null);

  const fetchSuggested = useCallback(async () => {
    if (filter !== "all") {
      setSuggestedCommunities([]);
      return;
    }

    try {
      setLoadingSuggested(true);
      setSuggestedError(null);

      const data = await apiRequest(
        "api/communities/explore/"
      );

      setSuggestedCommunities(data ?? []);
    } catch (err) {
      console.error(err);
      setSuggestedError(err);
    } finally {
      setLoadingSuggested(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchSuggested();
  }, [fetchSuggested]);

  return {
    suggestedCommunities,
    loadingSuggested,
    suggestedError,
    fetchSuggested,
    setSuggestedCommunities,
  };
}