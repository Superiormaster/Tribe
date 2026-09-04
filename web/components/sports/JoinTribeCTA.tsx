// src/components/sports/JoinTribeCTA.tsx

"use client";

import AppLink from '@/components/AppLink';
import { ArrowRight, Users } from "lucide-react";

interface JoinTribeCTAProps {
  title?: string;
  description?: string;
  href?: string;
  compact?: boolean;
}

export default function JoinTribeCTA({
  title = "Join the Tribe",
  description = "Connect with fans, share your opinions and join the conversation.",
  href = "/",
  compact = false,
}: JoinTribeCTAProps) {
  if (compact) {
    return (
      <AppLink
        href={href}
        className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 transition hover:border-indigo-600 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white">
          <Users className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h3>

          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Join the conversation
          </p>
        </div>

        <ArrowRight className="h-5 w-5 text-gray-400 transition group-hover:translate-x-1 group-hover:text-indigo-600" />
      </AppLink>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="relative px-6 py-8 sm:px-8">
        <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-indigo-600/10" />
        <div className="absolute -bottom-16 -left-10 h-32 w-32 rounded-full bg-gray-200/60 dark:bg-gray-800/60" />

        <div className="relative">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <Users className="h-6 w-6" />
          </div>

          <h2 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
            {title}
          </h2>

          <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500 dark:text-gray-400 sm:text-base">
            {description}
          </p>

          <AppLink
            href={href}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          >
            Join Tribe
            <ArrowRight className="h-4 w-4" />
          </AppLink>
        </div>
      </div>
    </section>
  );
}