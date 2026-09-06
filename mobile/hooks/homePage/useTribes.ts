import {
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";

import { apiRequest } from "@/utils/api";

export function useTribes(
  filter: "all" | "tribes"
) {
  const [tribes, setTribes] =
    useState<any[]>([]);

  const [
    selectedTribe,
    setSelectedTribe,
  ] = useState<number | null>(
    null
  );

  const [
    showAllTribes,
    setShowAllTribes,
  ] = useState(false);

  const [
    loadingTribes,
    setLoadingTribes,
  ] = useState(false);

  const [
    tribesError,
    setTribesError,
  ] = useState<any>(null);

  const fetchUserTribes =
    useCallback(async () => {
      if (
        filter !== "tribes"
      ) {
        setTribes([]);
        setSelectedTribe(
          null
        );
        setShowAllTribes(
          false
        );

        return;
      }

      try {
        setLoadingTribes(
          true
        );

        setTribesError(
          null
        );

        const data =
          await apiRequest(
            "api/tribes/"
          );

        setTribes(
          data ?? []
        );

        if (
          data?.length
        ) {
          setSelectedTribe(
            prev =>
              prev ??
              data[0].id
          );
        } else {
          setSelectedTribe(
            null
          );
        }
      } catch (err) {
        console.error(
          "Failed to fetch tribes",
          err
        );

        setTribesError(
          err
        );
      } finally {
        setLoadingTribes(
          false
        );
      }
    }, [filter]);

  useEffect(() => {
    void fetchUserTribes();
  }, [fetchUserTribes]);

  const visibleTribes =
    useMemo(
      () =>
        showAllTribes
          ? tribes
          : tribes.slice(
              0,
              3
            ),
      [
        tribes,
        showAllTribes,
      ]
    );

  const currentTribe =
    useMemo(
      () =>
        tribes.find(
          (tribe: any) =>
            tribe.id ===
            selectedTribe
        ) ?? null,
      [
        tribes,
        selectedTribe,
      ]
    );

  return {
    tribes,
    setTribes,

    selectedTribe,
    setSelectedTribe,

    showAllTribes,
    setShowAllTribes,

    visibleTribes,
    currentTribe,

    loadingTribes,
    tribesError,

    fetchUserTribes,
  };
}