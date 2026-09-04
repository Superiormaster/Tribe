"use client";

import {
  Coins,
  Gift,
  Heart,
  MessageCircle,
  Share2,
  Sparkles,
  Users,
} from "lucide-react";

import { formatCurrency } from "@/utils/monetization/formatCurrency";

import type {
  AudienceReward,
  AudienceRewardType,
  MonetizationCurrency,
} from "@/utils/monetization/types/monetization";

interface AudienceRewardsProps {
  rewards: AudienceReward[];
  loading?: boolean;
  currency?: MonetizationCurrency;
  onViewAll?: () => void;
  className?: string;
}

const REWARD_CONFIG: Record<
  AudienceRewardType,
  {
    icon: typeof Gift;
    label: string;
  }
> = {
  tip: {
    icon: Coins,
    label: "Tips",
  },

  gift: {
    icon: Gift,
    label: "Gifts",
  },

  paid_like: {
    icon: Heart,
    label: "Paid Likes",
  },

  subscription: {
    icon: Users,
    label: "Subscriptions",
  },

  coin: {
    icon: Coins,
    label: "Coins",
  },
};

function RewardSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/[0.025] p-3">
      <div className="h-10 w-10 animate-pulse rounded-xl bg-white/[0.06]" />

      <div className="min-w-0 flex-1">
        <div className="h-3 w-24 animate-pulse rounded bg-white/[0.07]" />
        <div className="mt-2 h-2.5 w-16 animate-pulse rounded bg-white/[0.05]" />
      </div>

      <div className="h-3 w-16 animate-pulse rounded bg-white/[0.06]" />
    </div>
  );
}

export default function AudienceRewards({
  rewards,
  loading = false,
  currency = "NGN",
  onViewAll,
  className = "",
}: AudienceRewardsProps) {
  const totalRewards = rewards.reduce(
    (total, reward) =>
      total + Number(reward.amount ?? 0),
    0
  );

  return (
    <section
      className={[
        "w-full overflow-hidden rounded-2xl",
        "border border-white/[0.08]",
        "bg-[#121212]",
        className,
      ].join(" ")}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b border-white/[0.07] px-4 py-4 sm:px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFD84D]/10">
            <Users className="h-5 w-5 text-[#FFD84D]" />
          </div>

          <div>
            <h2 className="text-base font-semibold text-white">
              Audience rewards
            </h2>

            <p className="mt-1 text-xs text-white/40">
              Rewards generated from your community
            </p>
          </div>
        </div>

        {!loading && rewards.length > 0 && (
          <div className="hidden text-right sm:block">
            <p className="text-[10px] uppercase tracking-wide text-white/30">
              Total rewards
            </p>

            <p className="mt-1 text-sm font-semibold text-[#FFD84D]">
              {formatCurrency(
                totalRewards,
                currency
              )}
            </p>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-2 p-4 sm:p-5">
          {Array.from({ length: 4 }).map(
            (_, index) => (
              <RewardSkeleton key={index} />
            )
          )}
        </div>
      )}

      {/* Empty */}
      {!loading && rewards.length === 0 && (
        <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFD84D]/10">
            <Coins className="h-5 w-5 text-[#FFD84D]" />
          </div>

          <h3 className="mt-4 text-sm font-semibold text-white">
            No audience rewards yet
          </h3>

          <p className="mt-1.5 max-w-sm text-xs leading-5 text-white/40">
            Keep creating engaging content and building
            your Tribe audience. Your rewards will appear
            here.
          </p>
        </div>
      )}

      {/* Rewards */}
      {!loading && rewards.length > 0 && (
        <div className="divide-y divide-white/[0.05]">
          {rewards.map((reward) => {
            const config =
              REWARD_CONFIG[reward.type];

            const Icon = config.icon;

            return (
              <div
                key={reward.id}
                className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.025] sm:px-5"
              >
                {/* Icon */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFD84D]/10">
                  <Icon className="h-4 w-4 text-[#FFD84D]" />
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-white">
                      {reward.label || config.label}
                    </p>
                    
                    <span className="rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-medium text-white/40">
                      {reward.count}
                    </span>
                  </div>

                  {reward.description && (
                    <p className="mt-1 line-clamp-1 text-xs text-white/35">
                      {reward.description}
                    </p>
                  )}
                </div>

                {/* Amount */}
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-[#FFD84D]">
                    +
                    {formatCurrency(
                      reward.amount,
                      reward.currency ?? currency
                    )}
                  </p>

                  {reward.createdAt && (
                    <p className="mt-0.5 text-[10px] text-white/25">
                      {new Intl.DateTimeFormat(
                        "en-NG",
                        {
                          day: "numeric",
                          month: "short",
                        }
                      ).format(
                        new Date(reward.createdAt)
                      )}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      {!loading &&
        rewards.length > 0 &&
        onViewAll && (
          <div className="border-t border-white/[0.06] p-3">
            <button
              type="button"
              onClick={onViewAll}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold text-[#FFD84D] transition hover:bg-[#FFD84D]/[0.06]"
            >
              View all rewards
              <Sparkles className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
    </section>
  );
}