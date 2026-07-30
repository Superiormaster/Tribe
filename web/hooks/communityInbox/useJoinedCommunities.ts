'use client';

import { useState, useRef } from "react";
import { apiRequest } from "@/utils/api";
import { saveCommunityMeta } from "@/lib/communityMessageDB";

export type JoinedCommunity = {
  id: number;
  name: string;
  cover_image?: string;
};

export function useJoinedCommunities() {
  const [joinedCommunities, setJoinedCommunities] =
    useState<JoinedCommunity[]>([]);

  const [showJoinedCommunities, setShowJoinedCommunities] =
    useState(false);

  const [communityPage, setCommunityPage] =
    useState(1);

  const [hasMoreCommunities, setHasMoreCommunities] =
    useState(true);

  const [loadingCommunities, setLoadingCommunities] =
    useState(false);

  const communitiesRef =
    useRef<HTMLDivElement>(null);

  const fetchJoinedCommunities = async (
    page = 1
  ) => {
    if (loadingCommunities) return;

    try {
      setLoadingCommunities(true);

      const res = await apiRequest(
        `api/joined-communities/?page=${page}`
      );

      if (page === 1) {
        setJoinedCommunities(res.results);
      } else {
        setJoinedCommunities(prev => [
          ...prev,
          ...res.results,
        ]);
      }
  
      for (const community of res) {
        await saveCommunityMeta(
          community.id,
          community.name,
          community.cover_image
        );
      }

      setHasMoreCommunities(!!res.next);
      setCommunityPage(page);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCommunities(false);
    }
  };

  const handleCommunitiesScroll = () => {
    const el = communitiesRef.current;

    if (!el) return;

    const nearBottom =
      el.scrollTop + el.clientHeight >=
      el.scrollHeight - 200;

    if (
      nearBottom &&
      hasMoreCommunities &&
      !loadingCommunities
    ) {
      fetchJoinedCommunities(
        communityPage + 1
      );
    }
  };

  const openJoinedCommunities = async () => {
    setJoinedCommunities([]);
    setCommunityPage(1);
    setHasMoreCommunities(true);

    await fetchJoinedCommunities(1);

    setShowJoinedCommunities(true);
  };

  const closeJoinedCommunities = () => {
    setShowJoinedCommunities(false);
  };

  return {
    joinedCommunities,
    showJoinedCommunities,

    communityPage,
    setCommunityPage,
    hasMoreCommunities,
    setHasMoreCommunities,
    loadingCommunities,

    communitiesRef,

    setJoinedCommunities,
    setShowJoinedCommunities,

    fetchJoinedCommunities,
    handleCommunitiesScroll,

    openJoinedCommunities,
    closeJoinedCommunities,
  };
}