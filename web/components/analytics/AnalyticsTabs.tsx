"use client";

import { motion } from "framer-motion";
import {
  LayoutDashboard,
  FileText,
  Users,
  UsersRound,
} from "lucide-react";

import { ANALYTICS_TABS } from "@/hooks/analytics/constants";
import { AnalyticsTab } from "@/hooks/analytics/types";

interface AnalyticsTabsProps {
  value: AnalyticsTab;
  onChange: (tab: AnalyticsTab) => void;
}

const icons: Record<AnalyticsTab, React.ReactNode> = {
  overview: <LayoutDashboard size={18} />,
  content: <FileText size={18} />,
  audience: <Users size={18} />,
  communities: <UsersRound size={18} />,
};

const labels: Record<AnalyticsTab, string> = {
  overview: "Overview",
  content: "Content",
  audience: "Audience",
  communities: "Communities",
};

export default function AnalyticsTabs({
  value,
  onChange,
}: AnalyticsTabsProps) {
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
      className="rounded-3xl border border-indigo-300 dark:border-white/10 bg-gray-200 dark:bg-gray-900/70 backdrop-blur-xl p-2"
    >
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {ANALYTICS_TABS.map((tab) => {
          const active = value === tab;

          return (
            <motion.button
              key={tab}
              whileHover={{
                scale: 1.02,
              }}
              whileTap={{
                scale: 0.98,
              }}
              onClick={() => onChange(tab)}
              className={`
                relative
                flex
                items-center
                justify-center
                gap-2
                rounded-2xl
                px-4
                py-3
                text-sm
                font-semibold
                transition-all
                ${
                  active
                    ? "bg-primary text-gray-700 dark:text-white shadow-lg shadow-primary/30"
                    : "text-muted-foreground hover:bg-gray-500 dark:hover:bg-white/5"
                }
              `}
            >
              {active && (
                <motion.div
                  layoutId="analytics-tab"
                  className="absolute inset-0 rounded-2xl bg-gray-300 dark:bg-gray-800 -z-10"
                  transition={{
                    type: "spring",
                    stiffness: 350,
                    damping: 28,
                  }}
                />
              )}

              {icons[tab]}

              <span>{labels[tab]}</span>
            </motion.button>
          );
        })}
      </div>
    </motion.section>
  );
}