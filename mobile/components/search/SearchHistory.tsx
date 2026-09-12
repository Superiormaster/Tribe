"use client";

type Props = {
  history: string[];
  onSelect: (v: string) => void;
  onClear: () => void;
};

export default function SearchHistory({
  history,
  onSelect,
  onClear,
}: Props) {

  if (history.length === 0)
    return null;

  return (
    <div className="mt-6">

      <div className="flex items-center justify-between mb-2">
        <p className="text-gray-500">
          🕒 Recent Searches
        </p>
      
        <button
          onClick={onClear}
          className="text-sm text-red-500 hover:underline"
        >
          Clear
        </button>
      </div>

      <div className="flex flex-wrap gap-2">

        {history.map((h) => (
          <button
            key={h}
            onClick={() => onSelect(h)}
            className="px-3 py-1 bg-gray-200 text-gray-700 dark:text-gray-200 dark:bg-gray-800 rounded-full text-sm"
          >
            {h}
          </button>
        ))}

      </div>

    </div>
  );
}