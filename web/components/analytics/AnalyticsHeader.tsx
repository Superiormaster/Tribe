"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Download, RefreshCw } from "lucide-react";
import { useNavigation } from "@/utils/useNavigation"

interface AnalyticsHeaderProps {
  title?: string;
  subtitle?: string;
  loading?: boolean;
  onRefresh?: () => void;
  onExport?: () => void;
  showBackButton?: boolean;
}

export default function AnalyticsHeader({
  title = "Analytics",
  subtitle = "Track your content performance and audience growth.",
  loading = false,
  onRefresh,
  onExport,
  showBackButton = true,
}: AnalyticsHeaderProps) {
  const { back } = useNavigation();

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
      className="sticky top-0 z-20 rounded-3xl border border-white/10 bg-background/70 backdrop-blur-xl"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 p-5">

        <div className="flex items-center gap-4">

          {showBackButton && (
            <button
              onClick={() => back()}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 transition hover:bg-white/10"
            >
              <ArrowLeft size={20} />
            </button>
          )}

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
            className="flex h-11 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-medium transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
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

          <button
            onClick={onExport}
            className="flex h-11 items-center gap-2 rounded-2xl bg-primary px-4 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition hover:opacity-90"
          >
            <Download size={18} />

            Export
          </button>

        </div>

      </div>
    </motion.header>
  );
}