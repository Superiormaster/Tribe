'use client';

export default function MessagesSkeleton() {
  return (
    <div className="flex flex-col my-14 h-full p-4">
      <div className="h-8 w-32 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mb-6" />

      <div className="space-y-4">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3"
          >
            {/* Avatar */}
            <div
              className="
                w-12 h-12 rounded-full
                bg-gray-200 dark:bg-gray-800
                animate-pulse
                shrink-0
              "
            />

            {/* Text */}
            <div className="flex-1">
              <div
                className="
                  h-4 w-32 rounded
                  bg-gray-200 dark:bg-gray-800
                  animate-pulse
                  mb-2
                "
              />

              <div
                className="
                  h-3 w-52 rounded
                  bg-gray-200 dark:bg-gray-800
                  animate-pulse
                "
              />
            </div>

            {/* Time */}
            <div
              className="
                h-3 w-10 rounded
                bg-gray-200 dark:bg-gray-800
                animate-pulse
              "
            />
          </div>
        ))}
      </div>
    </div>
  );
}