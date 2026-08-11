"use client";

import { motion } from "framer-motion";
import {
  Users,
  UserPlus,
  UserMinus,
  UserCheck,
  TrendingUp,
} from "lucide-react";

import GrowthBadge from "./GrowthBadge";

interface AudienceSectionProps {
  stars: number;
  newStars: number;
  lostStars: number;
  activeStars: number;
  growth: number;
}

interface AudienceCard {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

export default function AudienceSection({
  stars,
  newStars,
  lostStars,
  activeStars,
  growth,
}: AudienceSectionProps) {
  const cards: AudienceCard[] = [
    {
      title: "Total Stars",
      value: stars,
      icon: <Users size={22} />,
      color: "text-primary",
    },
    {
      title: "New Stars",
      value: newStars,
      icon: <UserPlus size={22} />,
      color: "text-green-500",
    },
    {
      title: "Lost Stars",
      value: lostStars,
      icon: <UserMinus size={22} />,
      color: "text-red-500",
    },
    {
      title: "Active Stars",
      value: activeStars,
      icon: <UserCheck size={22} />,
      color: "text-yellow-500",
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: .35 }}
      className="rounded-3xl border border-white/10 bg-background/70 backdrop-blur-xl p-6"
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold">
            Audience
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Your audience growth and engagement.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <TrendingUp
            className="text-primary"
            size={22}
          />

          <GrowthBadge
            value={growth}
            size="md"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{
              opacity: 0,
              y: 18,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: index * .08,
            }}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
          >
            <div
              className={`mb-4 ${card.color}`}
            >
              {card.icon}
            </div>

            <h3 className="text-sm text-muted-foreground">
              {card.title}
            </h3>

            <p className="mt-2 text-3xl font-bold">
              {card.value.toLocaleString()}
            </p>
          </motion.div>
        ))}
      </div>

      <div className="mt-8">
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">
          Audience Health
        </h3>

        <div className="h-3 overflow-hidden rounded-full bg-white/10">
          <motion.div
            initial={{ width: 0 }}
            animate={{
              width: `${Math.min(
                (activeStars /
                  Math.max(stars, 1)) *
                  100,
                100
              )}%`,
            }}
            transition={{
              duration: 1,
            }}
            className="h-full rounded-full bg-primary"
          />
        </div>

        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>
            {(
              (activeStars /
                Math.max(stars, 1)) *
              100
            ).toFixed(1)}
            % Active
          </span>

          <span>
            {stars.toLocaleString()} Total
          </span>
        </div>
      </div>
    </motion.section>
  );
}