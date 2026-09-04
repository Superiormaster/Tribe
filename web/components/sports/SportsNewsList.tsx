// src/components/sports/SportsNewsList.tsx

"use client";

import AppLink from '@/components/AppLink';
import {
  ArrowRight,
  Clock,
  Newspaper,
} from "lucide-react";

import type { SportsNews } from "@/utils/sports/types/sports";

interface SportsNewsListProps {
  news?: SportsNews[];
  title?: string;
  limit?: number;
  loading?: boolean;
  showViewAll?: boolean;
  viewAllHref?: string;
}

function formatDate(date?: string) {
  if (!date) return "";

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    return date;
  }

  return value.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getTimeAgo(date?: string) {
  if (!date) return "";

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    return "";
  }

  const difference =
    Date.now() - value.getTime();

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

  return formatDate(date);
}

export default function SportsNewsList({
  news = [],
  title = "Sports News",
  limit = 6,
  loading = false,
  showViewAll = true,
  viewAllHref = "/sports/news",
}: SportsNewsListProps) {
  const visibleNews = news.slice(0, limit);

  return (
    <section className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/30">
              <Newspaper className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>

            <h2 className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
              {title}
            </h2>
          </div>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Latest stories from the world of sports
          </p>
        </div>

        {showViewAll && (
          <AppLink
            href={viewAllHref}
            className="hidden items-center gap-1 text-sm font-semibold text-indigo-600 transition hover:text-indigo-700 sm:flex dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            View all
            <ArrowRight className="h-4 w-4" />
          </AppLink>
        )}
      </div>

      {loading ? (
        <LoadingState />
      ) : visibleNews.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleNews.map((article) => (
            <NewsCard
              key={article.id}
              article={article}
            />
          ))}
        </div>
      )}

      {showViewAll && (
        <AppLink
          href={viewAllHref}
          className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-indigo-600 transition hover:bg-gray-50 sm:hidden dark:border-gray-800 dark:bg-gray-900 dark:text-indigo-400 dark:hover:bg-gray-800"
        >
          View all sports news
          <ArrowRight className="h-4 w-4" />
        </AppLink>
      )}
    </section>
  );
}

function NewsCard({
  article,
}: {
  article: SportsNews;
}) {
  return (
    <AppLink
      href={`/sports/news/${article.id}`}
      className="group overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:-translate-y-0.5 hover:border-indigo-600 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-indigo-500"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-gray-100 dark:bg-gray-800">
        {article.image ? (
          <img
            src={article.image}
            alt={article.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Newspaper className="h-10 w-10 text-gray-300 dark:text-gray-600" />
          </div>
        )}

        {article.category && (
          <span className="absolute left-3 top-3 rounded-full bg-indigo-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
            {article.category}
          </span>
        )}
      </div>

      <div className="p-4">
        <h3 className="line-clamp-2 text-base font-bold leading-6 text-gray-900 transition group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
          {article.title}
        </h3>

        {article.excerpt && (
          <p className="mt-2 line-clamp-2 text-sm leading-5 text-gray-500 dark:text-gray-400">
            {article.excerpt}
          </p>
        )}

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            {article.publishedAt && (
              <span className="flex shrink-0 items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {getTimeAgo(article.publishedAt)}
              </span>
            )}
          </div>

          <ArrowRight className="h-4 w-4 shrink-0 text-gray-300 transition group-hover:translate-x-1 group-hover:text-indigo-600 dark:text-gray-600 dark:group-hover:text-indigo-400" />
        </div>
      </div>
    </AppLink>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="aspect-[16/9] bg-gray-200 dark:bg-gray-800" />

          <div className="p-4">
            <div className="h-5 w-full rounded bg-gray-200 dark:bg-gray-800" />
            <div className="mt-2 h-5 w-4/5 rounded bg-gray-200 dark:bg-gray-800" />

            <div className="mt-4 h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center dark:border-gray-800 dark:bg-gray-900">
      <Newspaper className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />

      <h3 className="mt-3 font-semibold text-gray-900 dark:text-gray-100">
        No sports news yet
      </h3>

      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        The latest sports stories will appear here.
      </p>
    </div>
  );
}