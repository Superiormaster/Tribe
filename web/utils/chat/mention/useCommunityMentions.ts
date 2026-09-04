import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { apiRequest } from "@/utils/api";
import {
  getMentionQuery,
  isMentionAll,
} from "./mentionUtils";

type MentionMember = {
  id: number;
  username: string;
  avatar?: string | null;
};

export function useCommunityMentions(
  communityId: number,
  value: string,
  cursor: number
) {
  const [members, setMembers] = useState<MentionMember[]>([]);
  const [query, setQuery] = useState("");
  const [mentionStart, setMentionStart] =
    useState<number | null>(null);

  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);

  const detected = getMentionQuery(
    value,
    cursor
  );

  const isMentioning =
    detected !== null &&
    !isMentionAll(detected.query);

  const isMentioningAll =
    detected !== null &&
    isMentionAll(detected.query);

  useEffect(() => {
    if (!detected) {
      setMembers([]);
      setQuery("");
      setMentionStart(null);
      setPage(1);
      setHasNext(false);
      return;
    }

    setQuery(detected.query);
    setMentionStart(detected.start);
  }, [
    value,
    cursor,
    detected?.query,
    detected?.start,
  ]);

  useEffect(() => {
    if (!communityId || !isMentioning) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);

      try {
        const res = await apiRequest(
          `api/chats/${communityId}/mention-members/?search=${encodeURIComponent(
            detected?.query || ""
          )}&page=1&page_size=20`
        );
        console.log("mention", res)

        if (cancelled) return;

        const results =
          Array.isArray(res?.results)
            ? res.results
            : [];

        setMembers(results);
        setPage(1);
        setHasNext(!!res?.next);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [
    communityId,
    detected?.query,
    isMentioning,
  ]);

  const loadMore = useCallback(async () => {
    if (
      loading ||
      !hasNext ||
      !isMentioning
    ) {
      return;
    }

    const nextPage = page + 1;

    setLoading(true);

    try {
      const res = await apiRequest(
        `api/chats/${communityId}/members/mention/?search=${encodeURIComponent(
          query
        )}&page=${nextPage}&page_size=20`
      );

      const results =
        Array.isArray(res?.results)
          ? res.results
          : [];

      setMembers(prev => [
        ...prev,
        ...results,
      ]);

      setPage(nextPage);
      setHasNext(!!res?.next);
    } finally {
      setLoading(false);
    }
  }, [
    communityId,
    query,
    page,
    hasNext,
    loading,
    isMentioning,
  ]);

  return {
    members,
    query,

    isMentioning,
    isMentioningAll,

    mentionStart,
    mentionEnd: cursor,

    loading,
    hasNext,

    loadMore,
  };
}