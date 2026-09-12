"use client";

import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface AnalyticsTooltipProps {
  active?: boolean;
  label?: string;
  value?: number | string;
  previousValue?: number;
  growth?: number;
  color?: string;
  formatter?: (value: number | string) => string;
}

export default function AnalyticsTooltip({
  active = false,
  label,
  value,
  previousValue,
  growth,
  color = "#3B82F6",
  formatter,
}: AnalyticsTooltipProps) {
  if (!active) return null;

  const displayValue =
    formatter && value !== undefined
      ? formatter(value)
      : value;

  const positive = (growth ?? 0) > 0;
  const negative = (growth ?? 0) < 0;
  const neutral = (growth ?? 0) === 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{
          opacity: 0,
          scale: 0.95,
          y: 8,
        }}
        animate={{
          opacity: 1,
          scale: 1,
          y: 0,
        }}
        exit={{
          opacity: 0,
          scale: 0.95,
        }}
        transition={{
          duration: 0.2,
        }}
        className="min-w-[210px] rounded-2xl border border-white/10 bg-background/90 backdrop-blur-xl p-4 shadow-2xl"
      >
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full"
            style={{
              backgroundColor: color,
            }}
          />

          <span className="text-sm font-medium text-muted-foreground">
            {label}
          </span>
        </div>

        <h3 className="mt-4 text-2xl font-bold">
          {displayValue}
        </h3>

        {previousValue !== undefined && (
          <p className="mt-1 text-xs text-muted-foreground">
            Previous:{" "}
            {formatter
              ? formatter(previousValue)
              : previousValue}
          </p>
        )}

        {growth !== undefined && (
          <div
            className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold
              ${
                positive
                  ? "bg-green-500/10 text-green-500"
                  : negative
                  ? "bg-red-500/10 text-red-500"
                  : "bg-gray-500/10 text-gray-400"
              }`}
          >
            {positive && <TrendingUp size={16} />}
            {negative && <TrendingDown size={16} />}
            {neutral && <Minus size={16} />}

            {positive && "+"}
            {growth}%
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}