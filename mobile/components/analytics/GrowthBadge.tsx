"use client";

import { motion } from "framer-motion";
import {
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";

interface GrowthBadgeProps {
  value: number;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  prefix?: string;
  suffix?: string;
}

export default function GrowthBadge({
  value,
  size = "md",
  showIcon = true,
  prefix = "",
  suffix = "%",
}: GrowthBadgeProps) {
  const positive = value > 0;
  const negative = value < 0;
  const neutral = value === 0;

  const styles = {
    sm: {
      wrapper: "px-2 py-1 text-xs",
      icon: 12,
    },
    md: {
      wrapper: "px-3 py-1.5 text-sm",
      icon: 16,
    },
    lg: {
      wrapper: "px-4 py-2 text-base",
      icon: 18,
    },
  };

  const colors = neutral
    ? "bg-gray-500/10 text-gray-400 border-gray-500/20"
    : positive
    ? "bg-green-500/10 text-green-500 border-green-500/20"
    : "bg-red-500/10 text-red-500 border-red-500/20";

  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.25 }}
      className={`inline-flex items-center gap-1 rounded-full border backdrop-blur-md ${colors} ${styles[size].wrapper}`}
    >
      {showIcon &&
        (neutral ? (
          <Minus size={styles[size].icon} />
        ) : positive ? (
          <ArrowUpRight size={styles[size].icon} />
        ) : (
          <ArrowDownRight size={styles[size].icon} />
        ))}

      <span className="font-semibold">
        {prefix}
        {Math.abs(value)}
        {suffix}
      </span>
    </motion.div>
  );
}