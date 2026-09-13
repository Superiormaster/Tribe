"use client";

import {
  createContext,
  useContext,
  useState,
  useRef,
} from "react";

import { useHomeFeed } from "@/hooks/homePage/useHomeFeed";
import { useHomeInitialization } from "@/hooks/homePage/useHomeInitialization";
import { useTribes } from "@/hooks/homePage/useTribes";

type FeedFilter = "all" | "tribes";

interface HomeFeedContextValue {
  filter: FeedFilter;
  setFilter: React.Dispatch<
    React.SetStateAction<FeedFilter>
  >;

  tribes: any[];
  selectedTribe: number | null;
  setSelectedTribe: React.Dispatch<
    React.SetStateAction<number | null>
  >;

  showAllTribes: boolean;
  setShowAllTribes: React.Dispatch<
    React.SetStateAction<boolean>
  >;

  visibleTribes: any[];
  currentTribe: any;
  loadingTribes: boolean;
  tribesError: any;

  feed: ReturnType<typeof useHomeFeed>;
  cacheReady: boolean;
}

const HomeFeedContext =
  createContext<HomeFeedContextValue | null>(null);

export function HomeFeedProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [filter, setFilter] =
    useState<FeedFilter>("all");
  const initializedFeedsRef =
    useRef<Set<string>>(new Set());

  const tribesState = useTribes(filter);

  const {
    tribes,
    selectedTribe,
    setSelectedTribe,
    showAllTribes,
    setShowAllTribes,
    visibleTribes,
    currentTribe,
    loadingTribes,
    tribesError,
  } = tribesState;

  /*
   * Feed consumes the selected tribe from useTribes.
   */
  const feed = useHomeFeed({
    filter,
    selectedTribe,
  });

  const { cacheReady } =
    useHomeInitialization({
      filter,
      selectedTribe,
      initializedFeedsRef,

      setPosts: feed.setPosts,
      resetFeedState: feed.resetFeedState,
      setReels: feed.setReels,
      setLoading: feed.setLoading,
      setInitialLoad: feed.setInitialLoad,

      hasCacheRef: feed.hasCacheRef,

      fetchPosts: feed.fetchPosts,
      fetchReels: feed.fetchReels,

      protectedPostIdsRef:
        feed.protectedPostIdsRef,
    });

  return (
    <HomeFeedContext.Provider
      value={{
        filter,
        setFilter,

        tribes,
        selectedTribe,
        setSelectedTribe,

        showAllTribes,
        setShowAllTribes,

        visibleTribes,
        currentTribe,
        loadingTribes,
        tribesError,

        feed,
        cacheReady,
      }}
    >
      {children}
    </HomeFeedContext.Provider>
  );
}

export function useHomeFeedContext() {
  const context =
    useContext(HomeFeedContext);

  if (!context) {
    throw new Error(
      "useHomeFeedContext must be used inside HomeFeedProvider"
    );
  }

  return context;
}