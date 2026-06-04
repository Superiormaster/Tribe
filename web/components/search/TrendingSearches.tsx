"use client";

type TrendingItem = {
  query: string;
  count: number;
  unique_users: number;
};

type Props = {
  trending: TrendingItem[];
  onSelect: (v: string) => void;
};

export default function TrendingSearches({
  trending,
  onSelect,
}: Props) {
  
  if (!trending || trending.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">

      <p className="text-gray-500 mb-2">
        🔥 Trending Searches
      </p>

      <div className="flex flex-wrap gap-2">

        {trending?.map((t, index) => (
          <button
            key={`${t.query}-${index}`}
            onClick={() => onSelect(t.query)}
            className="px-3 py-1 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm"
          >
            {t.query}
            <span className="ml-1 text-xs text-gray-400">
              ({t.count})
            </span>
            <span className="ml-1 text-xs text-gray-400">
              {t.unique_users} people
            </span>
          </button>
        ))}

      </div>

    </div>
  );
}