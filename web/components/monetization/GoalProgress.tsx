"use client";

import {
  CheckCircle2,
  CircleDollarSign,
  Target,
  Trophy,
} from "lucide-react";

import { formatCurrency } from "@/utils/monetization/formatCurrency";

import type {
  CreatorGoal,
  GoalPeriod,
} from "@/utils/monetization/types/monetization";

interface GoalProgressProps {
  goal: CreatorGoal | null;
  loading?: boolean;
  onCreateGoal?: () => void;
  className?: string;
}

const PERIOD_LABELS: Record<GoalPeriod, string> = {
  monthly: "Monthly goal",
  quarterly: "Quarterly goal",
  yearly: "Yearly goal",
};

function calculatePercentage(
  current: number,
  target: number
) {
  if (target <= 0) return 0;

  return Math.min(
    100,
    Math.max(0, (current / target) * 100)
  );
}

function formatRemaining(
  current: number,
  target: number,
  currency: CreatorGoal["currency"]
) {
  const remaining = Math.max(0, target - current);

  if (remaining <= 0) {
    return "Goal reached";
  }

  return `${formatCurrency(
    remaining,
    currency
  )} left to reach your goal`;
}

function formatDate(date: string) {
  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

export default function GoalProgress({
  goal,
  loading = false,
  onCreateGoal,
  className = "",
}: GoalProgressProps) {
  if (loading) {
    return (
      <section
        className={[
          "w-full rounded-2xl",
          "border border-white/[0.08]",
          "bg-[#121212] p-5",
          className,
        ].join(" ")}
      >
        <div className="animate-pulse">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/[0.06]" />

            <div>
              <div className="h-3 w-28 rounded bg-white/[0.07]" />
              <div className="mt-2 h-2.5 w-20 rounded bg-white/[0.05]" />
            </div>
          </div>

          <div className="mt-6 h-3 w-full rounded-full bg-white/[0.06]" />

          <div className="mt-4 flex justify-between">
            <div className="h-3 w-20 rounded bg-white/[0.06]" />
            <div className="h-3 w-24 rounded bg-white/[0.06]" />
          </div>
        </div>
      </section>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* No goal                                                                  */
  /* ------------------------------------------------------------------------ */

  if (!goal) {
    return (
      <section
        className={[
          "w-full rounded-2xl",
          "border border-white/[0.08]",
          "bg-[#121212] p-5",
          className,
        ].join(" ")}
      >
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFD84D]/10">
            <Target className="h-6 w-6 text-[#FFD84D]" />
          </div>

          <h3 className="mt-4 text-sm font-semibold text-white">
            Set an earning goal
          </h3>

          <p className="mt-1.5 max-w-sm text-xs leading-5 text-white/40">
            Set a target for your Tribe earnings and
            track your progress throughout the period.
          </p>

          {onCreateGoal && (
            <button
              type="button"
              onClick={onCreateGoal}
              className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-[#FFD84D] px-4 text-xs font-semibold text-black transition hover:bg-[#FFE066] active:scale-[0.98]"
            >
              <Target className="h-4 w-4" />
              Create goal
            </button>
          )}
        </div>
      </section>
    );
  }

  const percentage = calculatePercentage(
    goal.current,
    goal.target
  );

  const completed =
    goal.completed || percentage >= 100;

  const displayPercentage = Math.round(
    Math.min(100, Math.max(0, goal.percentage ?? percentage))
  );

  return (
    <section
      className={[
        "relative w-full overflow-hidden",
        "rounded-2xl border border-white/[0.08]",
        "bg-[#121212] p-5",
        className,
      ].join(" ")}
    >
      {/* Tribe accent */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#FFD84D]/[0.05] blur-3xl" />

      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFD84D]/10">
              {completed ? (
                <Trophy className="h-5 w-5 text-[#FFD84D]" />
              ) : (
                <Target className="h-5 w-5 text-[#FFD84D]" />
              )}
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-white/35">
                {PERIOD_LABELS[goal.period]}
              </p>

              <h2 className="mt-1 text-base font-semibold text-white">
                {goal.title}
              </h2>
            </div>
          </div>

          {completed && (
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-400/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Reached
            </div>
          )}
        </div>

        {/* Amounts */}
        <div className="mt-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs text-white/35">
              Current earnings
            </p>

            <p className="mt-1 text-2xl font-bold tracking-tight text-white">
              {formatCurrency(
                goal.current,
                goal.currency
              )}
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs text-white/35">
              Target
            </p>

            <p className="mt-1 text-sm font-semibold text-white/70">
              {formatCurrency(
                goal.target,
                goal.currency
              )}
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="mt-5">
          <div
            className="h-2.5 w-full overflow-hidden rounded-full bg-white/[0.07]"
            role="progressbar"
            aria-valuenow={displayPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${goal.title} progress`}
          >
            <div
              className={[
                "h-full rounded-full",
                "bg-[#FFD84D]",
                "transition-all duration-500",
              ].join(" ")}
              style={{
                width: `${displayPercentage}%`,
              }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-[#FFD84D]">
              {displayPercentage}% complete
            </span>

            <span className="text-xs text-white/30">
              {formatRemaining(
                goal.current,
                goal.target,
                goal.currency
              )}
            </span>
          </div>
        </div>

        {/* Period */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-4">
          <div className="flex items-center gap-2 text-xs text-white/35">
            <CircleDollarSign className="h-3.5 w-3.5 text-[#FFD84D]/70" />

            <span>
              {formatDate(goal.startDate)}
              {" — "}
              {formatDate(goal.endDate)}
            </span>
          </div>

          {completed && (
            <span className="text-xs font-medium text-emerald-400">
              Keep going 🚀
            </span>
          )}
        </div>
      </div>
    </section>
  );
}