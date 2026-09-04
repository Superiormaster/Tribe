import { Loader2 } from "lucide-react";

function Skeleton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={[
        "animate-pulse rounded-xl bg-white/[0.06]",
        className,
      ].join(" ")}
    />
  );
}

function CardSkeleton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={[
        "rounded-2xl border border-white/[0.07]",
        "bg-[#121212] p-5",
        className,
      ].join(" ")}
    >
      <Skeleton className="h-9 w-9" />

      <Skeleton className="mt-5 h-3 w-24" />

      <Skeleton className="mt-2 h-6 w-36" />

      <Skeleton className="mt-5 h-2 w-full" />

      <Skeleton className="mt-3 h-2 w-3/4" />
    </div>
  );
}

function RevenueChartSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#121212] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Skeleton className="h-9 w-9" />
          <Skeleton className="mt-4 h-4 w-28" />
          <Skeleton className="mt-2 h-3 w-40" />
        </div>

        <Skeleton className="h-9 w-24" />
      </div>

      <Skeleton className="mt-6 h-8 w-40" />

      <div className="relative mt-7 h-[250px] overflow-hidden">
        <div className="absolute inset-0 flex flex-col justify-between">
          {Array.from({ length: 5 }).map(
            (_, index) => (
              <div
                key={index}
                className="border-t border-white/[0.045]"
              />
            )
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 flex items-end gap-2 px-2">
          {[35, 52, 43, 68, 55, 78, 62, 85, 70, 92, 76, 88].map(
            (height, index) => (
              <div
                key={index}
                className="flex-1 animate-pulse rounded-t-md bg-[#FFD84D]/[0.08]"
                style={{
                  height: `${height}%`,
                }}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
}

function RevenueSourcesSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#121212]">
      <div className="flex items-center justify-between border-b border-white/[0.06] p-5">
        <div>
          <Skeleton className="h-9 w-9" />
          <Skeleton className="mt-4 h-4 w-32" />
          <Skeleton className="mt-2 h-3 w-44" />
        </div>

        <Skeleton className="h-5 w-20" />
      </div>

      <div className="space-y-5 p-5">
        {Array.from({ length: 5 }).map(
          (_, index) => (
            <div
              key={index}
              className="flex items-center gap-3"
            >
              <Skeleton className="h-10 w-10 shrink-0" />

              <div className="min-w-0 flex-1">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-3 h-1.5 w-full" />
              </div>

              <Skeleton className="h-3 w-16" />
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <main className="min-h-screen bg-[#0D0D0D] text-white">
      {/* Header skeleton */}
      <header className="border-b border-white/[0.07] bg-[#0D0D0D]">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <Skeleton className="h-11 w-11 shrink-0" />

              <div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>

                <Skeleton className="mt-2 h-3 w-64" />
              </div>
            </div>

            <div className="flex gap-2">
              <Skeleton className="h-11 w-32" />
              <Skeleton className="h-11 w-11" />
              <Skeleton className="h-11 w-11" />
              <Skeleton className="h-11 w-11" />
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        {/* Loading indicator */}
        <div className="mb-5 flex items-center gap-2 text-xs text-white/30">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#FFD84D]" />
          Loading monetization...
        </div>

        {/* Earnings overview */}
        <div className="rounded-2xl border border-white/[0.07] bg-[#121212] p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Skeleton className="h-4 w-36" />
              <Skeleton className="mt-2 h-3 w-52" />
            </div>

            <Skeleton className="h-9 w-28" />
          </div>

          <div className="mt-5 rounded-2xl bg-[#FFD84D]/[0.025] p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-2 h-9 w-44" />
            <Skeleton className="mt-2 h-3 w-52" />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>

          <Skeleton className="mt-5 h-2 w-full" />
        </div>

        {/* Charts / wallet */}
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
          <RevenueChartSkeleton />

          <div className="space-y-5">
            {/* Wallet */}
            <div className="rounded-2xl border border-white/[0.07] bg-[#121212] p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-11 w-11" />

                  <div>
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="mt-2 h-3 w-28" />
                  </div>
                </div>

                <Skeleton className="h-9 w-9" />
              </div>

              <Skeleton className="mt-7 h-3 w-24" />
              <Skeleton className="mt-2 h-9 w-44" />

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white/[0.025] p-3">
                  <Skeleton className="h-7 w-7" />
                  <Skeleton className="mt-3 h-3 w-16" />
                  <Skeleton className="mt-2 h-4 w-24" />
                </div>

                <div className="rounded-xl bg-white/[0.025] p-3">
                  <Skeleton className="h-7 w-7" />
                  <Skeleton className="mt-3 h-3 w-16" />
                  <Skeleton className="mt-2 h-4 w-24" />
                </div>
              </div>

              <Skeleton className="mt-5 h-11 w-full" />
            </div>

            {/* Goal */}
            <div className="rounded-2xl border border-white/[0.07] bg-[#121212] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="mt-2 h-3 w-40" />
                </div>

                <Skeleton className="h-8 w-8" />
              </div>

              <Skeleton className="mt-6 h-3 w-full" />
              <Skeleton className="mt-3 h-2 w-full" />
              <Skeleton className="mt-2 h-3 w-32" />
            </div>
          </div>
        </div>

        {/* Revenue sources + top content */}
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <RevenueSourcesSkeleton />

          <div className="rounded-2xl border border-white/[0.07] bg-[#121212] p-5">
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-4 w-28" />
                <Skeleton className="mt-2 h-3 w-44" />
              </div>

              <Skeleton className="h-8 w-16" />
            </div>

            <div className="mt-5 space-y-4">
              {Array.from({ length: 4 }).map(
                (_, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3"
                  >
                    <Skeleton className="h-12 w-12 shrink-0" />

                    <div className="min-w-0 flex-1">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="mt-2 h-2.5 w-24" />
                    </div>

                    <Skeleton className="h-3 w-16" />
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* Audience rewards */}
        <div className="mt-5 rounded-2xl border border-white/[0.07] bg-[#121212] p-5">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-4 w-36" />
              <Skeleton className="mt-2 h-3 w-56" />
            </div>

            <Skeleton className="h-9 w-20" />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map(
              (_, index) => (
                <CardSkeleton key={index} />
              )
            )}
          </div>
        </div>

        {/* Transactions */}
        <div className="mt-5 rounded-2xl border border-white/[0.07] bg-[#121212]">
          <div className="flex items-center justify-between border-b border-white/[0.06] p-5">
            <div>
              <Skeleton className="h-4 w-28" />
              <Skeleton className="mt-2 h-3 w-44" />
            </div>

            <Skeleton className="h-9 w-24" />
          </div>

          <div className="hidden grid-cols-5 gap-4 border-b border-white/[0.05] px-5 py-3 md:grid">
            {Array.from({ length: 5 }).map(
              (_, index) => (
                <Skeleton
                  key={index}
                  className="h-2.5 w-20"
                />
              )
            )}
          </div>

          <div className="space-y-1 p-3 sm:p-4">
            {Array.from({ length: 5 }).map(
              (_, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 rounded-xl p-3"
                >
                  <Skeleton className="h-9 w-9 shrink-0" />

                  <div className="min-w-0 flex-1">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="mt-2 h-2.5 w-20" />
                  </div>

                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="hidden h-3 w-16 sm:block" />
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </main>
  );
}