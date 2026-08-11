"use client";

import { motion } from "framer-motion";

interface LoadingSkeletonProps {
  cards?: number;
}

function Skeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={`animate-pulse rounded-2xl bg-gradient-to-r from-white/5 via-white/10 to-white/5 dark:from-white/5 dark:via-white/10 dark:to-white/5 ${className}`}
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
      className="space-y-6"
    >
      {/* Chart */}
      <div className="rounded-3xl border border-white/10 bg-background/70 backdrop-blur-xl p-6">
        <Skeleton className="h-6 w-40 mb-6" />

        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: cards }).map((_, index) => (
          <div
            key={index}
            className="rounded-3xl border border-white/10 bg-background/70 backdrop-blur-xl p-5"
          >
            <Skeleton className="h-4 w-24 mb-4" />

            <Skeleton className="h-9 w-28 mb-4" />

            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>

      {/* Top Posts */}
      <div className="rounded-3xl border border-white/10 bg-background/70 backdrop-blur-xl p-6">
        <Skeleton className="h-6 w-36 mb-6" />

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
      <div className="rounded-3xl border border-white/10 bg-background/70 backdrop-blur-xl p-6">
        <Skeleton className="h-6 w-40 mb-6" />

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