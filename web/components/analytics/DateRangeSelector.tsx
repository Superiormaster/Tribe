"use client";

import { motion } from "framer-motion";
import { CalendarDays } from "lucide-react";

import { ANALYTICS_RANGES } from "@/hooks/analytics/constants";
import { AnalyticsRange } from "@/hooks/analytics/types";

interface DateRangeSelectorProps {
  value: AnalyticsRange;
  onChange: (range: AnalyticsRange) => void;
}

export default function DateRangeSelector({
  value,
  onChange,
}: DateRangeSelectorProps) {
  return (
    <motion.section
      initial={{
        opacity: 0,
        y: 16,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.35,
      }}
      className="rounded-3xl border border-indigo-300 dark:border-white/10 bg-gray-200 dark:bg-gray-900/70 p-4 backdrop-blur-xl"
    >
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <CalendarDays
            size={18}
            className="text-primary"
          />

          <span className="text-sm font-semibold">
            Date Range
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {ANALYTICS_RANGES.map((range) => {
            const active = value === range;

            return (
              <motion.button
                key={range}
                whileHover={{
                  scale: 1.04,
                }}
                whileTap={{
                  scale: 0.96,
                }}
                onClick={() => onChange(range)}
                className={`
                  rounded-xl
                  px-4
                  py-2
                  text-sm
                  font-medium
                  transition-all
                  ${
                    active
                      ? "bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-white shadow-lg shadow-primary/30"
                      : "bg-white/5 text-muted-foreground hover:bg-white/10"
                  }
                `}
              >
                {range}
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}