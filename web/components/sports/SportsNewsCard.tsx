// src/components/sports/SportsNewsCard.tsx

"use client";

import AppLink from '@/components/AppLink';
import {
  ArrowRight,
  Clock,
  Newspaper,
} from "lucide-react";

import type { SportsNews } from "@/utils/sports/types/sports";

interface SportsNewsCardProps {
  article: SportsNews;
  featured?: boolean;
  className?: string;
}

function formatTimeAgo(date?: string) {
  if (!date) return "";

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    return date;
  }

  const difference = Date.now() - value.getTime();

  const minutes = Math.floor(
    difference / (1000 * 60)
  );

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days}d ago`;
  }

  return value.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function SportsNewsCard({
  article,
  featured = false,
  className = "",
}: SportsNewsCardProps) {
  return (
    <AppLink
      href={`/sports/news/${article.id}`}
      className={`group block overflow-hidden rounded-2xl border border-gray-200 bg-white transition duration-200 hover:-translate-y-0.5 hover:border-indigo-600 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-indigo-500 ${
        featured ? "sm:flex" : ""
      } ${className}`}
    >
      {/* Image */}
      <div
        className={`relative overflow-hidden bg-gray-100 dark:bg-gray-800 ${
          featured
            ? "aspect-[16/10] sm:aspect-auto sm:h-auto sm:w-2/5"
            : "aspect-[16/9] w-full"
        }`}
      >
        {article.image ? (
          <img
            src={article.image}
            alt={article.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full min-h-[180px] w-full items-center justify-center">
            <Newspaper className="h-10 w-10 text-gray-300 dark:text-gray-600" />
          </div>
        )}

        {article.category && (
          <span className="absolute left-3 top-3 rounded-full bg-indigo-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
            {article.category}
          </span>
        )}
      </div>

      {/* Content */}
      <div
        className={`flex flex-1 flex-col p-4 ${
          featured ? "sm:p-6" : ""
        }`}
      >
        <div className="flex-1">
          <h3
            className={`font-bold leading-6 text-gray-900 transition group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400 ${
              featured
                ? "text-lg sm:text-xl sm:leading-7"
                : "text-base"
            }`}
          >
            {article.title}
          </h3>

          {article.excerpt && (
            <p
              className={`mt-2 text-sm leading-5 text-gray-500 dark:text-gray-400 ${
                featured
                  ? "line-clamp-3"
                  : "line-clamp-2"
              }`}
            >
              {article.excerpt}
            </p>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            {article.publishedAt && (
              <span className="flex shrink-0 items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatTimeAgo(article.publishedAt)}
              </span>
            )}
          </div>
        
          <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400">
            Read
            <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </AppLink>
  );
}