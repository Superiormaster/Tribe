"use client";

export default function SearchSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">

      {/* USERS */}
      <div>
        <div className="h-4 w-24 bg-gray-300 dark:bg-gray-700 rounded mb-3" />

        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 border rounded-lg mb-2"
          >
            <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-700" />
            <div className="h-3 w-32 bg-gray-300 dark:bg-gray-700 rounded" />
          </div>
        ))}
      </div>

      {/* COMMUNITIES */}
      <div>
        <div className="h-4 w-32 bg-gray-300 dark:bg-gray-700 rounded mb-3" />

        {[1, 2].map((i) => (
          <div
            key={i}
            className="p-3 border rounded-lg mb-2"
          >
            <div className="h-3 w-40 bg-gray-300 dark:bg-gray-700 rounded" />
          </div>
        ))}
      </div>

      {/* POSTS */}
      <div>
        <div className="h-4 w-24 bg-gray-300 dark:bg-gray-700 rounded mb-3" />

        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-4 border rounded-lg mb-2 space-y-2"
          >
            <div className="h-3 w-full bg-gray-300 dark:bg-gray-700 rounded" />
            <div className="h-3 w-2/3 bg-gray-300 dark:bg-gray-700 rounded" />
          </div>
        ))}
      </div>

    </div>
  );
}