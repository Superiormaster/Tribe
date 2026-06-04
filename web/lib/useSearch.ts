'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '@/utils/api';

export default function useSearch() {

  const [query, setQuery] = useState('');
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

  const [trending, setTrending] = useState<string[]>([]);

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
      const data = await apiRequest("api/search/trending/");
      setTrending(data.results || data);
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

      const data = await apiRequest(
        `api/search/?q=${q}&page=${pageNumber}`
      );

      const hasResults =
        data.users?.length ||
        data.posts?.length ||
        data.communities?.length ||
        data.tribes?.length;
      
      setHasMore(Boolean(hasResults));

      setResults(prev => {
        if (!append) return data;
    
        return {
          users: [...prev.users, ...data.users],
          communities: [...prev.communities, ...data.communities],
          tribes: [...prev.tribes, ...data.tribes],
          posts: [
            ...prev.posts,
            ...data.posts.filter(
              (newPost: any) =>
                !prev.posts.some(
                  (oldPost: any) =>
                    oldPost.id === newPost.id &&
                    oldPost.feed_type === newPost.feed_type
                )
            )
          ],
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

    clearHistory,
  };
}