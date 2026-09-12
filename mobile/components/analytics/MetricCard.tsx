"use client";

import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { MetricCard as MetricCardType } from "@/hooks/analytics/types";

interface Props {
  metric: MetricCardType;
  index?: number;
  onClick?: () => void;
}

export default function MetricCard({
  metric,
  index = 0,
  onClick,
}: Props) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: index * 0.08,
        duration: 0.35,
      }}
      whileHover={{
        y: -4,
        scale: 1.02,
      }}
      whileTap={{ scale: 0.98 }}
      className="w-full rounded-3xl border border-indigo-300 dark:border-white/10 bg-gray-200 dark:bg-gray-900/70 backdrop-blur-xl p-5 text-left transition-all hover:border-primary/30 hover:shadow-xl"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          {metric.title}
        </h3>

        {metric.icon}
      </div>

      <h2 className="mt-5 text-3xl font-bold">
        {metric.formattedValue}
      </h2>

      <div className="mt-4 flex items-center gap-2">
        {metric.positive ? (
          <ArrowUpRight
            size={18}
            className="text-green-500"
          />
        ) : (
          <ArrowDownRight
            size={18}
            className="text-red-500"
          />
        )}

        <span
          className={
            metric.positive
              ? "text-sm font-semibold text-green-500"
              : "text-sm font-semibold text-red-500"
          }
        >
          {metric.growth}%
        </span>

        <span className="text-xs text-muted-foreground">
          vs previous period
        </span>
      </div>
    </motion.button>
  );
}