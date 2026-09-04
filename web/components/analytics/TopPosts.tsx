"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import {
  Eye,
  Heart,
  MessageCircle,
  Repeat2,
  Bookmark,
  ChevronRight,
  TrendingUp,
  Image as ImageIcon,
} from "lucide-react";

interface TopPost {
  id: string;
  title: string;
  thumbnail?: string | null;
  impressions: number;
  likes: number;
  comments: number;
  reposts: number;
  bookmarks: number;
  engagementRate: number;
}

interface TopPostsProps {
  posts: TopPost[];
  onView?: (post: TopPost) => void;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export default function TopPosts({
  posts,
  onView,
}: TopPostsProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: .35 }}
      className="rounded-3xl border border-indigo-300 dark:border-white/10 bg-gray-200 dark:bg-gray-900/70 backdrop-blur-xl p-6"
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">
            Top Posts
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Your best performing content.
          </p>
        </div>

        <TrendingUp
          size={22}
          className="text-primary"
        />
      </div>

      <div className="space-y-4">
        {posts.map((post, index) => (
          <motion.button
            key={post.id}
            type="button"
            onClick={() => onView?.(post)}
            initial={{
              opacity: 0,
              x: 20,
            }}
            animate={{
              opacity: 1,
              x: 0,
            }}
            transition={{
              delay: index * .08,
            }}
            whileHover={{
              scale: 1.01,
            }}
            className="w-full rounded-2xl border border-gray-700/15 dark:border-white/10 bg-gray-300 dark:bg-white/[0.03] p-4 text-left transition hover:border-primary/30"
          >
            <div className="flex gap-4">
              <div className="relative h-20 w-20 overflow-hidden rounded-xl shrink-0 bg-muted">
                {typeof post.thumbnail === "string" &&
                post.thumbnail.trim() ? (
                  <Image
                    src={post.thumbnail}
                    alt={post.title}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ImageIcon
                      size={24}
                      className="text-muted-foreground"
                    />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="line-clamp-2 font-semibold">
                  {post.title}
                </h3>

                <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">

                  <span className="flex items-center gap-1">
                    <Eye size={14} />
                    {formatNumber(post.impressions)}
                  </span>

                  <span className="flex items-center gap-1">
                    <Heart size={14} />
                    {formatNumber(post.likes)}
                  </span>

                  <span className="flex items-center gap-1">
                    <MessageCircle size={14} />
                    {formatNumber(post.comments)}
                  </span>

                  <span className="flex items-center gap-1">
                    <Repeat2 size={14} />
                    {formatNumber(post.reposts)}
                  </span>

                  <span className="flex items-center gap-1">
                    <Bookmark size={14} />
                    {formatNumber(post.bookmarks)}
                  </span>

                </div>
              </div>

              <div className="flex flex-col items-end justify-between">

                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {post.engagementRate.toFixed(1)}%
                </span>

                <ChevronRight
                  size={18}
                  className="text-muted-foreground"
                />

              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </motion.section>
  );
}