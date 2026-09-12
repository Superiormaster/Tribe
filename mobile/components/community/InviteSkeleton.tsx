'use client';

export default function InviteSkeleton() {

  return (
    <div className="animate-pulse">

      {[1,2,3,4,5,6].map((i) => (

        <div
          key={i}
          className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-800"
        >

          <div className="flex items-center gap-3">

            <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-700" />

            <div className="space-y-2">

              <div className="h-3 w-28 rounded bg-gray-300 dark:bg-gray-700" />

              <div className="h-3 w-16 rounded bg-gray-300 dark:bg-gray-700" />

            </div>

          </div>

          <div className="h-9 w-20 rounded-xl bg-gray-300 dark:bg-gray-700" />

        </div>

      ))}

    </div>
  );
}