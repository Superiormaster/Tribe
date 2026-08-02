'use client';

import { useEffect, useState } from "react";
import { apiRequest } from "@/utils/api";

type Mode = "global" | "community" | "reel";

interface UseCommunityPermissionsProps {
  selectedCommunity: number | null;
  setMode: (mode: Mode) => void;
}

export function useCommunityPermissions({
  selectedCommunity,
  setMode,
}: UseCommunityPermissionsProps) {
  const [communityData, setCommunityData] = useState<any>(null);

  const [permissions, setPermissions] = useState({
    allow_reels: false,
    allow_videos: false,
  });

  const [loadingCommunity, setLoadingCommunity] =
    useState(false);

  useEffect(() => {
    if (!selectedCommunity) {
      setCommunityData(null);

      setPermissions({
        allow_reels: false,
        allow_videos: false,
      });

      return;
    }

    let cancelled = false;

    async function fetchCommunity() {
      try {
        setLoadingCommunity(true);

        const data = await apiRequest(
          `api/communities/${selectedCommunity}/`
        );

        if (cancelled) return;

        setCommunityData(data);

        setPermissions(data.permissions);

        setMode(
          data.permissions.allow_reels
            ? "reel"
            : "community"
        );
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) {
          setLoadingCommunity(false);
        }
      }
    }

    fetchCommunity();

    return () => {
      cancelled = true;
    };
  }, [selectedCommunity]);

  return {
    communityData,
    permissions,
    loadingCommunity,
  };
}