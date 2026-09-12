"use client";

import { motion } from "framer-motion";

interface LoadingSkeletonProps {
  cards?: number;
}

function Skeleton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`
        animate-pulse
        rounded-2xl
        bg-gray-300
        dark:bg-gray-800
        ${className}
      `}
    />
  );
}

export default function LoadingSkeleton({
  cards = 8,
}: LoadingSkeletonProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      {/* Chart */}
      <div
        className="
          rounded-3xl
          border
          border-indigo-200
          dark:border-white/10
          bg-white
          dark:bg-gray-900/70
          p-6
          shadow-sm
          dark:shadow-none
          backdrop-blur-xl
        "
      >
        <Skeleton className="mb-6 h-6 w-40" />

        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: cards }).map((_, index) => (
          <div
            key={index}
            className="
              rounded-3xl
              border
              border-indigo-200
              dark:border-white/10
              bg-white
              dark:bg-gray-900/70
              p-5
              shadow-sm
              dark:shadow-none
              backdrop-blur-xl
            "
          >
            <Skeleton className="mb-4 h-4 w-24" />

            <Skeleton className="mb-4 h-9 w-28" />

            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>

      {/* Top Posts */}
      <div
        className="
          rounded-3xl
          border
          border-indigo-200
          dark:border-white/10
          bg-white
          dark:bg-gray-900/70
          p-6
          shadow-sm
          dark:shadow-none
          backdrop-blur-xl
        "
      >
        <Skeleton className="mb-6 h-6 w-36" />

        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center gap-4"
            >
              <Skeleton className="h-16 w-16 rounded-xl" />

              <div className="flex-1 space-y-3">
                <Skeleton className="h-4 w-3/4" />

                <Skeleton className="h-3 w-1/2" />
              </div>

              <Skeleton className="h-8 w-14 rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      {/* Audience */}
      <div
        className="
          rounded-3xl
          border
          border-indigo-200
          dark:border-white/10
          bg-white
          dark:bg-gray-900/70
          p-6
          shadow-sm
          dark:shadow-none
          backdrop-blur-xl
        "
      >
        <Skeleton className="mb-6 h-6 w-40" />

        <div className="space-y-5">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-12 rounded-xl"
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}