"use client";

import { motion } from "framer-motion";
import {
  Users,
  FileText,
  Activity,
  TrendingUp,
  ChevronRight,
} from "lucide-react";

import GrowthBadge from "./GrowthBadge";

interface Community {
  id: string;
  name: string;
  cover?: string;
  members: number;
  activeMembers: number;
  posts: number;
  engagement: number;
}

interface CommunityAnalyticsProps {
  communities: Community[];
  onSelect?: (community: Community) => void;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export default function CommunityAnalytics({
  communities,
  onSelect,
}: CommunityAnalyticsProps) {
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
            Community Analytics
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Track the performance of your communities.
          </p>
        </div>

        <TrendingUp
          size={22}
          className="text-primary"
        />
      </div>

      <div className="space-y-4">
        {communities.map((community, index) => (
          <motion.button
            key={community.id}
            type="button"
            onClick={() => onSelect?.(community)}
            initial={{
              opacity: 0,
              y: 16,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: index * .08,
            }}
            whileHover={{
              scale: 1.01,
            }}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left transition hover:border-primary/30"
          >
            <div className="flex items-start justify-between">

              <div className="flex-1">

                <div className="flex items-center gap-3">

                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <Users
                      size={22}
                      className="text-primary"
                    />
                  </div>

                  <div>
                    <h3 className="font-semibold">
                      {community.name}
                    </h3>

                    <p className="text-sm text-muted-foreground">
                      {formatNumber(
                        community.members
                      )} members
                    </p>
                  </div>

                </div>

                <div className="mt-5 grid grid-cols-3 gap-4">

                  <div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users size={15} />
                      <span className="text-xs">
                        Active
                      </span>
                    </div>

                    <p className="mt-2 text-lg font-semibold">
                      {formatNumber(
                        community.activeMembers
                      )}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FileText size={15} />
                      <span className="text-xs">
                        Posts
                      </span>
                    </div>

                    <p className="mt-2 text-lg font-semibold">
                      {formatNumber(
                        community.posts
                      )}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Activity size={15} />
                      <span className="text-xs">
                        Engagement
                      </span>
                    </div>

                    <p className="mt-2 text-lg font-semibold">
                      {community.engagement.toFixed(1)}
                      %
                    </p>
                  </div>

                </div>

              </div>

              <div className="ml-6 flex flex-col items-end justify-between">

                <GrowthBadge
                  value={community.engagement}
                  size="sm"
                />

                <ChevronRight
                  size={18}
                  className="mt-8 text-muted-foreground"
                />

              </div>

            </div>
          </motion.button>
        ))}
      </div>
    </motion.section>
  );
}