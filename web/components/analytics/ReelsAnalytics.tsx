"use client";

import { motion } from "framer-motion";
import {
  Clapperboard,
  Eye,
  Clock3,
  Timer,
  TrendingUp,
  PlayCircle,
} from "lucide-react";

import GrowthBadge from "./GrowthBadge";

interface ReelsAnalyticsProps {
  totalReels: number;
  totalViews: number;
  totalWatchTime: number; // minutes
  averageWatchTime: number; // seconds
  completionRate: number; // %
  growth: number;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatWatchTime(minutes: number) {
  if (minutes >= 60) {
    const hours = minutes / 60;
    return `${hours.toFixed(1)} hrs`;
  }

  return `${minutes.toLocaleString()} min`;
}

export default function ReelsAnalytics({
  totalReels,
  totalViews,
  totalWatchTime,
  averageWatchTime,
  completionRate,
  growth,
}: ReelsAnalyticsProps) {
  const stats = [
    {
      title: "Reels",
      value: totalReels.toLocaleString(),
      icon: <Clapperboard size={22} />,
      color: "text-primary",
    },
    {
      title: "Views",
      value: formatNumber(totalViews),
      icon: <Eye size={22} />,
      color: "text-green-500",
    },
    {
      title: "Watch Time",
      value: formatWatchTime(totalWatchTime),
      icon: <Clock3 size={22} />,
      color: "text-orange-500",
    },
    {
      title: "Avg Watch",
      value: `${averageWatchTime}s`,
      icon: <Timer size={22} />,
      color: "text-purple-500",
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: .35 }}
      className="rounded-3xl border border-white/10 bg-background/70 backdrop-blur-xl p-6"
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">
            Reels Analytics
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Performance of your short videos.
          </p>
        </div>

        <TrendingUp
          className="text-primary"
          size={22}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((item, index) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: index * .08,
            }}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
          >
            <div className={item.color}>
              {item.icon}
            </div>

            <p className="mt-4 text-sm text-muted-foreground">
              {item.title}
            </p>

            <h3 className="mt-2 text-3xl font-bold">
              {item.value}
            </h3>
          </motion.div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium">
            Completion Rate
          </span>

          <span className="font-semibold">
            {completionRate.toFixed(1)}%
          </span>
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-white/10">
          <motion.div
            initial={{ width: 0 }}
            animate={{
              width: `${completionRate}%`,
            }}
            transition={{
              duration: 1,
            }}
            className="h-full rounded-full bg-primary"
          />
        </div>

        <div className="mt-5 flex items-center justify-between">
          <GrowthBadge value={growth} />

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <PlayCircle size={16} />
            Reel performance
          </div>
        </div>
      </div>
    </motion.section>
  );
}