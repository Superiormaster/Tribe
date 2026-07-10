'use client';

import useSearch from '@/lib/useSearch';

import SearchInput from './SearchInput';
import SearchTabs from './SearchTabs';
import SearchResults from './SearchResults';
import SearchHistory from './SearchHistory';
import TrendingSearches from './TrendingSearches';

export default function GlobalSearch() {

  const {
    query,
    setQuery,

    results,
    loading,

    activeTab,
    setActiveTab,

    history,
    trending,

    clearHistory,
  } = useSearch();

  return (
    <div className="space-y-4 mt-20 px-2 w-full overflow-x-hidden">

      <SearchInput
        value={query}
        onChange={setQuery}
      />

      <SearchTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {!query && (
        <>
          <TrendingSearches
            trending={trending}
            onSelect={setQuery}
          />

          <SearchHistory
            history={history}
            onSelect={setQuery}
            onClear={clearHistory}
          />
        </>
      )}

      <SearchResults
        query={query}
        results={results}
        loading={loading}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

    </div>
  );
}