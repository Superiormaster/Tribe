'use client';

import { useEffect, useState, useContext } from "react";
import { UserContext } from "@/components/UserContext";
import { apiRequest } from '@/utils/api';

type TrendingItem = {
  query: string;
  count: number;
  unique_users: number;
};

export default function useSearch() {

  const [query, setQuery] = useState('');
  const { user } = useContext(UserContext) || {};
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const [activeTab, setActiveTab] =
    useState('all');

  const [results, setResults] = useState({
    users: [],
    tribes: [],
    communities: [],
    posts: [],
  });

  const [history, setHistory] =
    useState<string[]>([]);

  const [trending, setTrending] = useState<TrendingItem[]>([]);

  // LOAD HISTORY
  useEffect(() => {

    const saved = JSON.parse(
      localStorage.getItem('searchHistory') || '[]'
    );

    setHistory(saved);

  }, []);
  
  useEffect(() => {
    fetchTrending();
  }, []);
  
  const fetchTrending = async () => {
    try {
      const data: { results?: TrendingItem[] } | TrendingItem[] =
        await apiRequest("api/search/trending/");
  
      setTrending(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error("Failed to load trending:", err);
    }
  };

  // SEARCH
  useEffect(() => {

    const timer = setTimeout(() => {

      if (query.trim()) {

        setPage(1);
        setHasMore(true);

        fetchResults(query);

      } else {

        setResults({
          users: [],
          tribes: [],
          communities: [],
          posts: [],
        });

      }

    }, 400);

    return () => clearTimeout(timer);

  }, [query]);
  
  useEffect(() => {
    const handleScroll = () => {
      const bottom =
        window.innerHeight + window.scrollY >=
        document.body.offsetHeight - 800;
  
      if (bottom && hasMore && !loadingMore) {
        setLoadingMore(true);
        fetchResults(query, page + 1, true).finally(() =>
          setLoadingMore(false)
        );
      }
    };
  
    window.addEventListener("scroll", handleScroll);
  
    return () =>
      window.removeEventListener("scroll", handleScroll);
  }, [page, hasMore, loadingMore, query]);

  const fetchResults = async (q: string, pageNumber = 1, append = false) => {

    setLoading(true);

    try {

      const searchType =
        activeTab === "people"
          ? "users"
          : activeTab === "communities"
          ? "communities"
          : activeTab === "tribes"
          ? "tribes"
          : activeTab === "posts"
          ? "posts"
          : "all";
      
      const data = await apiRequest(
        `api/search/?q=${encodeURIComponent(q)}&page=${pageNumber}&type=${searchType}`
      );

      setHasMore(Boolean(data.next));

      setResults(prev => {
        if (!append) return data;
      
        const mergeUnique = (
          oldArr: any[],
          newArr: any[]
        ) => {
          const map = new Map();
        
          [...oldArr, ...newArr].forEach(item => {
        
            const key =
              `${item.feed_type || item.type || "post"}-${item.id}`;
        
            map.set(key, item);
          });
        
          return Array.from(map.values());
        };
      
        return {
          users: mergeUnique(prev.users, data.users || []),
          communities: mergeUnique(prev.communities, data.communities || []),
          tribes: mergeUnique(prev.tribes, data.tribes || []),
          posts: mergeUnique(prev.posts, data.posts || []),
        };
      });
    
      setPage(pageNumber);

      saveSearch(q);

    } catch (err) {

      console.error(err);

    } finally {

      setLoading(false);

    }
  };

  const saveSearch = (q: string) => {

    if (!q.trim()) return;

    if (history.includes(q.trim())) return;

    const updated = [
      q.trim(),
      ...history,
    ].slice(0, 10);

    localStorage.setItem(
      'searchHistory',
      JSON.stringify(updated)
    );

    setHistory(updated);
  };

  const clearHistory = () => {

    localStorage.removeItem(
      'searchHistory'
    );

    setHistory([]);
  };

  return {
    query,
    setQuery,

    results,
    loading,
    loadingMore,

    activeTab,
    setActiveTab,

    history,
    trending,
    user,

    clearHistory,
  };
}