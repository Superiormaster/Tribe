"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  Crown,
  Megaphone,
  Settings,
  Sparkles,
  Wallet,
} from "lucide-react";
import AppLink from "@/components/AppLink";

import type { QuickAction } from "@/utils/monetization/constants/monetization";

interface QuickActionsProps {
  onAction?: (action: QuickAction) => void;
  disabled?: boolean;
}

interface ActionItem {
  key: QuickAction;
  label: string;
  description: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ACTIONS: ActionItem[] = [
  {
    key: "withdraw",
    label: "Withdraw",
    description: "Transfer your available earnings",
    icon: Wallet,
  },
  {
    key: "analytics",
    label: "Analytics",
    description: "View your creator performance",
    href: "/analytics",
    icon: BarChart3,
  },
  {
    key: "premium",
    label: "Create Premium",
    description: "Offer exclusive content",
    href: "/monetization/premium",
    icon: Crown,
  },
  {
    key: "ads",
    label: "Manage Ads",
    description: "Control your monetization ads",
    href: "/monetization/ads",
    icon: Megaphone,
  },
  {
    key: "boost",
    label: "Boost Content",
    description: "Reach more people on Tribe",
    href: "/boost",
    icon: Sparkles,
  },
  {
    key: "settings",
    label: "Creator Settings",
    description: "Manage monetization preferences",
    href: "/settings/creator",
    icon: Settings,
  },
];

export default function QuickActions({
  onAction,
  disabled = false,
}: QuickActionsProps) {
  const handleAction = (action: QuickAction) => {
    if (disabled) return;

    onAction?.(action);
  };

  return (
    <section className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">
            Quick actions
          </h2>

          <p className="mt-1 text-sm text-white/40">
            Manage your Tribe monetization
          </p>
        </div>

        <ArrowUpRight className="h-4 w-4 text-white/30" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {ACTIONS.map((action) => {
          const Icon = action.icon;

          const content = (
            <div
              className={[
                "group relative flex min-h-[88px] items-center gap-4",
                "rounded-2xl border border-white/[0.08]",
                "bg-[#121212] p-4",
                "transition-all duration-200",
                "hover:border-[#FFD84D]/30",
                "hover:bg-[#1A1A1A]",
                "active:scale-[0.99]",
                disabled
                  ? "cursor-not-allowed opacity-50"
                  : "cursor-pointer",
              ].join(" ")}
            >
              {/* Icon */}
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFD84D]/10 transition-colors group-hover:bg-[#FFD84D]/15">
                <Icon className="h-5 w-5 text-[#FFD84D]" />
              </div>

              {/* Text */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">
                  {action.label}
                </p>

                <p className="mt-1 line-clamp-1 text-xs text-white/40">
                  {action.description}
                </p>
              </div>

              {/* Arrow */}
              <ArrowUpRight className="h-4 w-4 shrink-0 text-white/20 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#FFD84D]" />
            </div>
          );

          /*
           * Withdraw is handled by the parent because it normally
           * opens a withdrawal modal rather than navigating.
           */
          if (action.key === "withdraw") {
            return (
              <button
                key={action.key}
                type="button"
                disabled={disabled}
                onClick={() => handleAction(action.key)}
                className="w-full text-left"
              >
                {content}
              </button>
            );
          }

          /*
           * Navigation actions.
           */
          if (action.href) {
            return (
              <AppLink
                key={action.key}
                href={action.href}
                onClick={() => handleAction(action.key)}
                aria-disabled={disabled}
                className={
                  disabled
                    ? "pointer-events-none"
                    : undefined
                }
              >
                {content}
              </AppLink>
            );
          }

          return (
            <button
              key={action.key}
              type="button"
              disabled={disabled}
              onClick={() => handleAction(action.key)}
              className="w-full text-left"
            >
              {content}
            </button>
          );
        })}
      </div>
    </section>
  );
}