"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Wallet, RefreshCw } from "lucide-react";
import { useNavigation } from "@/utils/useNavigation"

interface AnalyticsHeaderProps {
  title?: string;
  subtitle?: string;
  loading?: boolean;
  onRefresh?: () => void;
}

export default function AnalyticsHeader({
  title = "Dashboard",
  subtitle = "Track your content performance and audience growth.",
  loading = false,
  onRefresh,
}: AnalyticsHeaderProps) {
  const { push } = useNavigation();

  return (
    <motion.header
      initial={{
        opacity: 0,
        y: -20,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.35,
      }}
      className="sticky top-0 z-20 rounded-3xl border border-indigo-500 dark:border-white/10 bg-gray-300 dark:bg-gray-900/70 backdrop-blur-xl"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 p-5">

        <div className="flex items-center gap-4">

          <div>
            <h1 className="text-2xl font-bold">
              {title}
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              {subtitle}
            </p>
          </div>

        </div>

        <div className="flex items-center gap-3">

          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex h-11 items-center gap-2 rounded-2xl border border-indigo-700/15 dark:border-white/10 bg-white/5 px-4 text-sm font-medium transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={18}
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh
          </button>

         {/*} <button
            onClick={() => push("/main/monetization")}
            className="flex h-11 items-center justify-center rounded-2xl px-4 gap-2 border border-indigo-700/15 dark:border-white/10 bg-white/5 transition hover:bg-white/10"
          >
            <Wallet size={20} />
            Wallet
          </button>*/}

        </div>

      </div>
    </motion.header>
  );
}