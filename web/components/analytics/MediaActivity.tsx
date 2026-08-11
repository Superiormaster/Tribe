"use client";

import { motion } from "framer-motion";
import {
  FileText,
  Clapperboard,
  Image as ImageIcon,
  PlayCircle,
  TrendingUp,
} from "lucide-react";

import GrowthBadge from "./GrowthBadge";

interface MediaActivityItem {
  title: string;
  icon: React.ReactNode;
  total: number;
  growth: number;
  color: string;
}

interface MediaActivityProps {
  posts: number;
  reels: number;
  photos: number;
  videos: number;
  postGrowth?: number;
  reelGrowth?: number;
  photoGrowth?: number;
  videoGrowth?: number;
}

export default function MediaActivity({
  posts,
  reels,
  photos,
  videos,
  postGrowth = 0,
  reelGrowth = 0,
  photoGrowth = 0,
  videoGrowth = 0,
}: MediaActivityProps) {
  const activities: MediaActivityItem[] = [
    {
      title: "Posts",
      total: posts,
      growth: postGrowth,
      icon: <FileText size={22} />,
      color: "text-blue-500",
    },
    {
      title: "Reels",
      total: reels,
      growth: reelGrowth,
      icon: <Clapperboard size={22} />,
      color: "text-pink-500",
    },
    {
      title: "Photos",
      total: photos,
      growth: photoGrowth,
      icon: <ImageIcon size={22} />,
      color: "text-green-500",
    },
    {
      title: "Videos",
      total: videos,
      growth: videoGrowth,
      icon: <PlayCircle size={22} />,
      color: "text-orange-500",
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: .35 }}
      className="rounded-3xl border border-white/10 bg-background/70 backdrop-blur-xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">
            Media Activity
          </h2>

          <p className="text-sm text-muted-foreground mt-1">
            Content published during this period
          </p>
        </div>

        <TrendingUp
          size={24}
          className="text-primary"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {activities.map((item, index) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: index * .08,
            }}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
          >
            <div
              className={`mb-4 ${item.color}`}
            >
              {item.icon}
            </div>

            <h3 className="text-sm text-muted-foreground">
              {item.title}
            </h3>

            <p className="mt-2 text-3xl font-bold">
              {item.total.toLocaleString()}
            </p>

            <div className="mt-4">
              <GrowthBadge
                value={item.growth}
                size="sm"
              />
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}