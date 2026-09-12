// src/components/sports/MatchStatus.tsx

"use client";

import {
  CheckCircle2,
  CircleDot,
  Clock,
  Flag,
  Pause,
  Play,
  RotateCcw,
  XCircle,
} from "lucide-react";

interface MatchStatusProps {
  status?: string;
  minute?: number;
  extraMinute?: number;
  period?: string;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  showMinute?: boolean;
  className?: string;
}

type NormalizedStatus =
  | "scheduled"
  | "live"
  | "halftime"
  | "finished"
  | "postponed"
  | "cancelled"
  | "suspended"
  | "abandoned"
  | "delayed"
  | "unknown";

export default function MatchStatus({
  status,
  minute,
  extraMinute,
  period,
  size = "md",
  showIcon = true,
  showMinute = true,
  className = "",
}: MatchStatusProps) {
  const normalizedStatus = normalizeStatus(status);

  const config = getStatusConfig(
    normalizedStatus
  );

  const displayMinute =
    showMinute &&
    minute !== undefined &&
    (normalizedStatus === "live" ||
      normalizedStatus === "halftime");

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full font-bold
        ${getSizeClasses(size)}
        ${config.containerClass}
        ${className}
      `}
      aria-label={getAriaLabel(
        normalizedStatus,
        minute
      )}
    >
      {showIcon && (
        <span className="shrink-0">
          {config.icon}
        </span>
      )}

      <span>{config.label}</span>

      {displayMinute && (
        <span className="font-extrabold tabular-nums">
          {minute}
          {extraMinute
            ? `+${extraMinute}`
            : ""}
          '
        </span>
      )}

      {period && normalizedStatus === "live" && (
        <span className="hidden font-medium opacity-70 sm:inline">
          {period}
        </span>
      )}
    </span>
  );
}

function normalizeStatus(
  status?: string
): NormalizedStatus {
  if (!status) return "unknown";

  const value = status
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, "_");

  switch (value) {
    case "scheduled":
    case "upcoming":
    case "not_started":
    case "notstarted":
    case "fixture":
      return "scheduled";

    case "live":
    case "in_play":
    case "inplay":
    case "playing":
    case "first_half":
    case "second_half":
      return "live";

    case "halftime":
    case "half_time":
    case "ht":
      return "halftime";

    case "finished":
    case "full_time":
    case "fulltime":
    case "ft":
    case "completed":
      return "finished";

    case "postponed":
      return "postponed";

    case "cancelled":
    case "canceled":
      return "cancelled";

    case "suspended":
      return "suspended";

    case "abandoned":
      return "abandoned";

    case "delayed":
      return "delayed";

    default:
      return "unknown";
  }
}

function getStatusConfig(
  status: NormalizedStatus
) {
  switch (status) {
    case "live":
      return {
        label: "LIVE",
        icon: (
          <CircleDot className="h-3.5 w-3.5 animate-pulse" />
        ),
        containerClass:
          "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400",
      };

    case "halftime":
      return {
        label: "HT",
        icon: (
          <Pause className="h-3.5 w-3.5" />
        ),
        containerClass:
          "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
      };

    case "finished":
      return {
        label: "FT",
        icon: (
          <CheckCircle2 className="h-3.5 w-3.5" />
        ),
        containerClass:
          "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
      };

    case "scheduled":
      return {
        label: "Upcoming",
        icon: (
          <Clock className="h-3.5 w-3.5" />
        ),
        containerClass:
          "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400",
      };

    case "postponed":
      return {
        label: "Postponed",
        icon: (
          <RotateCcw className="h-3.5 w-3.5" />
        ),
        containerClass:
          "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
      };

    case "cancelled":
      return {
        label: "Cancelled",
        icon: (
          <XCircle className="h-3.5 w-3.5" />
        ),
        containerClass:
          "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
      };

    case "suspended":
      return {
        label: "Suspended",
        icon: (
          <Pause className="h-3.5 w-3.5" />
        ),
        containerClass:
          "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
      };

    case "abandoned":
      return {
        label: "Abandoned",
        icon: (
          <Flag className="h-3.5 w-3.5" />
        ),
        containerClass:
          "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
      };

    case "delayed":
      return {
        label: "Delayed",
        icon: (
          <Clock className="h-3.5 w-3.5" />
        ),
        containerClass:
          "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
      };

    default:
      return {
        label: "Unknown",
        icon: (
          <Play className="h-3.5 w-3.5" />
        ),
        containerClass:
          "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
      };
  }
}

function getSizeClasses(
  size: "sm" | "md" | "lg"
) {
  switch (size) {
    case "sm":
      return "px-2 py-0.5 text-[10px]";

    case "lg":
      return "px-3.5 py-1.5 text-sm";

    default:
      return "px-2.5 py-1 text-xs";
  }
}

function getAriaLabel(
  status: NormalizedStatus,
  minute?: number
) {
  const config = getStatusConfig(status);

  if (
    minute !== undefined &&
    status === "live"
  ) {
    return `${config.label}, ${minute} minutes`;
  }

  return config.label;
}

export function getMatchStatusLabel(
  status?: string
): string {
  return getStatusConfig(
    normalizeStatus(status)
  ).label;
}