import {
useEffect,
useState,
useContext,
} from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { UserContext } from '@/components/UserContext';
import { apiRequest } from '@/utils/api';

type TrendingItem = {
query: string;
count: number;
unique_users: number;
};

export default function useSearch() {

const [query, setQuery] = useState('');

const { user } =
useContext(UserContext) || {};

const [page, setPage] =
useState(1);

const [hasMore, setHasMore] =
useState(true);

const [loadingMore, setLoadingMore] =
useState(false);

const [loading, setLoading] =
useState(false);

const [activeTab, setActiveTab] =
useState('all');

const [results, setResults] =
useState({
users: [],
tribes: [],
communities: [],
posts: [],
});

const [history, setHistory] =
useState<string[]>([]);

const [trending, setTrending] =
useState<TrendingItem[]>([]);

// LOAD HISTORY
useEffect(() => {

const loadHistory = async () => {

  try {

    const saved =
      await AsyncStorage.getItem(
        'searchHistory'
      );

    if (!saved) {
      setHistory([]);
      return;
    }

    const parsed =
      JSON.parse(saved);

    setHistory(
      Array.isArray(parsed)
        ? parsed
        : []
    );

  } catch (err) {

    console.error(
      'Failed to load search history:',
      err
    );

    setHistory([]);

  }
};

loadHistory();

}, []);

// LOAD TRENDING
useEffect(() => {
fetchTrending();
}, []);

const fetchTrending = async () => {

try {

  const data:
    | { results?: TrendingItem[] }
    | TrendingItem[] =
    await apiRequest(
      'api/search/trending/'
    );

  setTrending(
    Array.isArray(data)
      ? data
      : data.results || []
  );

} catch (err) {

  console.error(
    'Failed to load trending:',
    err
  );

}

};

// SEARCH
useEffect(() => {

const timer =
  setTimeout(() => {

    if (query.trim()) {

      setPage(1);
      setHasMore(true);

      fetchResults(
        query,
        1,
        false
      );

    } else {

      setResults({
        users: [],
        tribes: [],
        communities: [],
        posts: [],
      });

    }

  }, 400);

return () =>
  clearTimeout(timer);

}, [query, activeTab]);

const fetchResults = async (
q: string,
pageNumber = 1,
append = false
) => {

if (!q.trim()) return;

if (
  append &&
  (loadingMore || !hasMore)
) {
  return;
}

if (append) {
  setLoadingMore(true);
} else {
  setLoading(true);
}

try {

  const searchType =
    activeTab === 'people'
      ? 'users'
      : activeTab === 'communities'
      ? 'communities'
      : activeTab === 'tribes'
      ? 'tribes'
      : activeTab === 'posts'
      ? 'posts'
      : 'all';

  const data =
    await apiRequest(
      `api/search/?q=${encodeURIComponent(
        q
      )}&page=${pageNumber}&type=${searchType}`
    );

  setHasMore(
    Boolean(data.next)
  );

  setResults(prev => {

    if (!append) {
      return data;
    }

    const mergeUnique = (
      oldArr: any[],
      newArr: any[]
    ) => {

      const map =
        new Map();

      [
        ...oldArr,
        ...newArr,
      ].forEach(item => {

        const key =
          `${item.feed_type || item.type || 'post'}-${item.id}`;

        map.set(
          key,
          item
        );

      });

      return Array.from(
        map.values()
      );
    };

    return {
      users: mergeUnique(
        prev.users,
        data.users || []
      ),

      communities: mergeUnique(
        prev.communities,
        data.communities || []
      ),

      tribes: mergeUnique(
        prev.tribes,
        data.tribes || []
      ),

      posts: mergeUnique(
        prev.posts,
        data.posts || []
      ),
    };
  });

  setPage(pageNumber);

  await saveSearch(q);

} catch (err) {

  console.error(
    err
  );

} finally {

  if (append) {
    setLoadingMore(false);
  } else {
    setLoading(false);
  }

}

};

const saveSearch = async (
q: string
) => {

const trimmed =
  q.trim();

if (!trimmed) return;

if (
  history.includes(trimmed)
) {
  return;
}

const updated = [
  trimmed,
  ...history,
].slice(0, 10);

try {

  await AsyncStorage.setItem(
    'searchHistory',
    JSON.stringify(updated)
  );

  setHistory(updated);

} catch (err) {

  console.error(
    'Failed to save search:',
    err
  );

}

};

const loadMore = async () => {

if (
  !query.trim() ||
  !hasMore ||
  loadingMore ||
  loading
) {
  return;
}

await fetchResults(
  query,
  page + 1,
  true
);

};

const clearHistory = async () => {

try {

  await AsyncStorage.removeItem(
    'searchHistory'
  );

} catch (err) {

  console.error(
    'Failed to clear search history:',
    err
  );

}

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

loadMore,

};
}