// components/chat/CommunityChatSkeleton.tsx

'use client';

export default function CommunityChatSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col bg-gray-300 dark:bg-[#0b141a]">
      
      {/* =========================
          CHAT HEADER
      ========================= */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-900">
        
        {/* Back button */}
        <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" />

        {/* Community avatar */}
        <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" />

        {/* Community information */}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-32 animate-pulse rounded-md bg-gray-200 dark:bg-gray-800" />
          <div className="h-3 w-20 animate-pulse rounded-md bg-gray-100 dark:bg-gray-900" />
        </div>

        {/* Header actions */}
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" />
          <div className="h-9 w-9 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" />
        </div>
      </div>

      {/* =========================
          MESSAGES
      ========================= */}
      <div className="min-h-0 flex-1 overflow-hidden px-3 py-4 sm:px-4">

        {/* Date separator */}
        <div className="mb-6 flex justify-center">
          <div className="h-6 w-20 animate-pulse rounded-full bg-gray-100 dark:bg-gray-900" />
        </div>

        <div className="space-y-5">

          {/* Incoming message */}
          <div className="flex items-end gap-2">
            <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" />

            <div className="max-w-[72%] space-y-2">
              <div className="h-3 w-20 animate-pulse rounded-md bg-gray-100 dark:bg-gray-900" />
              <div className="h-12 w-48 animate-pulse rounded-2xl rounded-bl-md bg-gray-200 dark:bg-gray-800" />
            </div>
          </div>

          {/* Incoming message */}
          <div className="flex items-end gap-2">
            <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" />

            <div className="h-16 w-64 animate-pulse rounded-2xl rounded-bl-md bg-gray-200 dark:bg-gray-800" />
          </div>

          {/* Own message */}
          <div className="flex justify-end">
            <div className="max-w-[72%]">
              <div className="h-12 w-52 animate-pulse rounded-2xl rounded-br-md bg-indigo-100 dark:bg-indigo-950/60" />
            </div>
          </div>

          {/* Own message */}
          <div className="flex justify-end">
            <div className="h-16 w-64 animate-pulse rounded-2xl rounded-br-md bg-indigo-100 dark:bg-indigo-950/60" />
          </div>

          {/* Incoming message */}
          <div className="flex items-end gap-2">
            <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" />

            <div className="max-w-[72%]">
              <div className="h-10 w-40 animate-pulse rounded-2xl rounded-bl-md bg-gray-200 dark:bg-gray-800" />
            </div>
          </div>

          {/* Incoming media placeholder */}
          <div className="flex items-end gap-2">
            <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" />

            <div className="h-44 w-56 animate-pulse rounded-2xl rounded-bl-md bg-gray-200 dark:bg-gray-800" />
          </div>

          {/* Own message */}
          <div className="flex justify-end">
            <div className="h-12 w-44 animate-pulse rounded-2xl rounded-br-md bg-indigo-100 dark:bg-indigo-950/60" />
          </div>

          {/* Incoming message */}
          <div className="flex items-end gap-2">
            <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" />

            <div className="h-12 w-56 animate-pulse rounded-2xl rounded-bl-md bg-gray-200 dark:bg-gray-800" />
          </div>

        </div>
      </div>

      {/* =========================
          COMPOSER
      ========================= */}
      <div className="shrink-0 border-t border-gray-200 bg-white px-3 py-3 dark:border-gray-800 dark:bg-gray-950 sm:px-4">
        <div className="flex items-center gap-2">

          {/* Attachment */}
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" />

          {/* Input */}
          <div className="h-11 flex-1 animate-pulse rounded-full bg-gray-100 dark:bg-gray-900" />

          {/* Emoji / action */}
          <div className="hidden h-10 w-10 shrink-0 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800 sm:block" />

          {/* Send */}
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-indigo-200 dark:bg-indigo-950/70" />
        </div>
      </div>
    </div>
  );
}