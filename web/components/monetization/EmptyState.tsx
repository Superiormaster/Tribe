"use client";

import type { ReactNode } from "react";
import {
  BarChart3,
  ChevronRight,
  Inbox,
  Plus,
  RefreshCcw,
  Wallet,
} from "lucide-react";

type EmptyStateVariant =
  | "default"
  | "earnings"
  | "transactions"
  | "content"
  | "insights"
  | "wallet";

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  icon?: ReactNode;
  compact?: boolean;
  className?: string;
}

const VARIANTS: Record<
  EmptyStateVariant,
  {
    icon: typeof Inbox;
    title: string;
    description: string;
    actionLabel?: string;
  }
> = {
  default: {
    icon: Inbox,
    title: "Nothing here yet",
    description:
      "There is no data to display right now. Check back later.",
  },

  earnings: {
    icon: Wallet,
    title: "No earnings yet",
    description:
      "Start creating and engaging with your Tribe audience to begin earning.",
    actionLabel: "Create content",
  },

  transactions: {
    icon: Inbox,
    title: "No transactions yet",
    description:
      "Your earnings and payouts will appear here once you start making money on Tribe.",
  },

  content: {
    icon: BarChart3,
    title: "No monetized content yet",
    description:
      "Create posts, reels, or videos to start generating monetization data.",
    actionLabel: "Create content",
  },

  insights: {
    icon: BarChart3,
    title: "Not enough data yet",
    description:
      "Keep creating and growing your audience. Your monetization insights will appear here.",
  },

  wallet: {
    icon: Wallet,
    title: "Your wallet is empty",
    description:
      "Your available earnings will appear here once you start generating revenue.",
  },
};

export default function EmptyState({
  variant = "default",
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  icon,
  compact = false,
  className = "",
}: EmptyStateProps) {
  const config = VARIANTS[variant];

  const Icon = config.icon;

  const finalTitle = title ?? config.title;
  const finalDescription =
    description ?? config.description;
  const finalActionLabel =
    actionLabel ?? config.actionLabel;

  const content = (
    <div
      className={[
        "flex w-full flex-col items-center justify-center",
        "rounded-2xl border border-white/[0.07]",
        "bg-[#121212] text-center",
        compact ? "px-5 py-8" : "px-6 py-12",
        className,
      ].join(" ")}
    >
      {/* Icon */}
      <div
        className={[
          "flex items-center justify-center rounded-2xl",
          "bg-[#FFD84D]/10",
          compact ? "h-12 w-12" : "h-14 w-14",
        ].join(" ")}
      >
        {icon ?? (
          <Icon
            className={
              compact
                ? "h-5 w-5 text-[#FFD84D]"
                : "h-6 w-6 text-[#FFD84D]"
            }
          />
        )}
      </div>

      {/* Title */}
      <h3
        className={[
          "font-semibold text-white",
          compact
            ? "mt-4 text-sm"
            : "mt-5 text-base",
        ].join(" ")}
      >
        {finalTitle}
      </h3>

      {/* Description */}
      <p
        className={[
          "max-w-md leading-6 text-white/40",
          compact
            ? "mt-1.5 text-xs"
            : "mt-2 text-sm",
        ].join(" ")}
      >
        {finalDescription}
      </p>

      {/* Action */}
      {finalActionLabel &&
        (actionHref ? (
          <a
            href={actionHref}
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-[#FFD84D] px-4 text-sm font-semibold text-black transition hover:bg-[#FFE066] active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            {finalActionLabel}
          </a>
        ) : onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-[#FFD84D] px-4 text-sm font-semibold text-black transition hover:bg-[#FFE066] active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            {finalActionLabel}
          </button>
        ) : null)}
    </div>
  );

  return content;
}