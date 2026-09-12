"use client";

import Image from "next/image";
import {
  ArrowUpRight,
  Eye,
  Heart,
  MessageCircle,
  Play,
  Share2,
  TrendingUp,
} from "lucide-react";

import { formatCurrency } from "@/utils/monetization/formatCurrency";

import type { MonetizedContent } from "@/utils/monetization/types/monetization";

interface TopContentCardProps {
  content: MonetizedContent;
  rank?: number;
  onClick?: (content: MonetizedContent) => void;
  className?: string;
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "0";
  }

  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(
      value >= 10_000_000 ? 0 : 1
    )}M`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(
      value >= 10_000 ? 0 : 1
    )}K`;
  }

  return value.toLocaleString();
}

function formatDate(date?: string | null) {
  if (!date) return "";

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

function getContentTypeLabel(
  type?: string | null
) {
  switch (type) {
    case "reel":
      return "Reel";

    case "video":
      return "Video";

    case "post":
      return "Post";

    case "image":
      return "Photo";

    default:
      return "Content";
  }
}

export default function TopContentCard({
  content,
  rank,
  onClick,
  className = "",
}: TopContentCardProps) {
  const thumbnail =
    content.thumbnailUrl ??
    null;

  const contentType = getContentTypeLabel(
    content.type
  );

  const isVideo =
    content.type === "reel" ||
    content.type === "video";

  const engagement =
    Number(content.likes ?? 0) +
    Number(content.comments ?? 0) +
    Number(content.shares ?? 0);

  const handleClick = () => {
    onClick?.(content);
  };

  return (
    <article
      className={[
        "group relative overflow-hidden",
        "rounded-2xl border border-white/[0.08]",
        "bg-[#121212]",
        "transition-all duration-200",
        "hover:border-[#FFD84D]/25",
        "hover:bg-[#161616]",
        onClick ? "cursor-pointer" : "",
        className,
      ].join(" ")}
      onClick={onClick ? handleClick : undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (event) => {
              if (
                event.key === "Enter" ||
                event.key === " "
              ) {
                event.preventDefault();
                handleClick();
              }
            }
          : undefined
      }
    >
      {/* Thumbnail */}
      <div className="relative aspect-[16/9] overflow-hidden bg-[#0D0D0D]">
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt={content.title ?? "Monetized content"}
            fill
            sizes="(max-width: 768px) 100vw, 400px"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-white/[0.03]">
            <TrendingUp className="h-8 w-8 text-white/15" />
          </div>
        )}

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10" />

        {/* Rank */}
        {rank !== undefined && (
          <div className="absolute left-3 top-3 flex h-8 min-w-8 items-center justify-center rounded-lg bg-black/60 px-2 text-xs font-bold text-white backdrop-blur-md">
            #{rank}
          </div>
        )}

        {/* Content type */}
        <div className="absolute right-3 top-3 rounded-lg bg-black/60 px-2.5 py-1.5 text-[10px] font-semibold text-white backdrop-blur-md">
          {contentType}
        </div>

        {/* Video indicator */}
        {isVideo && (
          <div className="absolute bottom-3 left-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#FFD84D] text-black shadow-lg">
            <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
          </div>
        )}

        {/* Revenue on thumbnail */}
        <div className="absolute bottom-3 right-3 rounded-lg bg-black/65 px-2.5 py-1.5 backdrop-blur-md">
          <p className="text-xs font-bold text-[#FFD84D]">
            {formatCurrency(
              content.revenue,
              content.currency
            )}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        {/* Title */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-white">
              {content.title || "Untitled content"}
            </h3>

            {content.createdAt && (
              <p className="mt-1 text-xs text-white/30">
                {formatDate(content.createdAt)}
              </p>
            )}
          </div>

          <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-white/20 transition-colors group-hover:text-[#FFD84D]" />
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-4 gap-2">
          <Stat
            icon={<Eye className="h-3.5 w-3.5" />}
            value={formatNumber(content.views)}
            label="Views"
          />

          <Stat
            icon={<Heart className="h-3.5 w-3.5" />}
            value={formatNumber(content.likes)}
            label="Likes"
          />

          <Stat
            icon={
              <MessageCircle className="h-3.5 w-3.5" />
            }
            value={formatNumber(content.comments)}
            label="Comments"
          />

          <Stat
            icon={<Share2 className="h-3.5 w-3.5" />}
            value={formatNumber(content.shares)}
            label="Shares"
          />
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-white/25">
              Engagement
            </p>

            <p className="mt-0.5 text-xs font-semibold text-white/70">
              {formatNumber(engagement)}
            </p>
          </div>

          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-white/25">
              Earned
            </p>

            <p className="mt-0.5 text-xs font-semibold text-[#FFD84D]">
              {formatCurrency(
                content.revenue,
                content.currency
              )}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

interface StatProps {
  icon: React.ReactNode;
  value: string;
  label: string;
}

function Stat({
  icon,
  value,
  label,
}: StatProps) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1 text-white/30">
        {icon}
        <span className="truncate text-[10px]">
          {label}
        </span>
      </div>

      <p className="mt-1 truncate text-xs font-semibold text-white/75">
        {value}
      </p>
    </div>
  );
}