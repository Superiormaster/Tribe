// src/components/sports/MatchCountdown.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock,
  Timer,
  Trophy,
} from "lucide-react";

interface MatchCountdownProps {
  matchDate: string | Date;
  homeTeamName?: string;
  awayTeamName?: string;
  homeTeamLogo?: string;
  awayTeamLogo?: string;
  competitionName?: string;
  status?: string;
  onComplete?: () => void;
  className?: string;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  completed: boolean;
}

export default function MatchCountdown({
  matchDate,
  homeTeamName = "Home",
  awayTeamName = "Away",
  homeTeamLogo,
  awayTeamLogo,
  competitionName,
  status,
  onComplete,
  className = "",
}: MatchCountdownProps) {
  const targetTime = useMemo(
    () => new Date(matchDate).getTime(),
    [matchDate]
  );

  const [time, setTime] = useState<TimeRemaining>(() =>
    calculateTimeRemaining(targetTime)
  );

  useEffect(() => {
    const update = () => {
      const remaining =
        calculateTimeRemaining(targetTime);

      setTime(remaining);

      if (remaining.completed) {
        onComplete?.();
      }
    };

    update();

    const interval = window.setInterval(
      update,
      1000
    );

    return () => {
      window.clearInterval(interval);
    };
  }, [targetTime, onComplete]);

  const isUpcoming =
    !status ||
    status === "scheduled" ||
    status === "upcoming" ||
    status === "not_started";

  if (!isUpcoming || time.completed) {
    return null;
  }

  return (
    <section
      className={`relative overflow-hidden rounded-3xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 ${className}`}
    >
      {/* Decorative background */}
      <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-indigo-600/10" />
      <div className="absolute -bottom-24 -left-16 h-48 w-48 rounded-full bg-gray-200/40 dark:bg-gray-800/40" />

      <div className="relative px-5 py-6 sm:px-8 sm:py-8">
        {/* Competition */}
        {competitionName && (
          <div className="mb-5 flex items-center justify-center gap-2">
            <Trophy className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />

            <span className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {competitionName}
            </span>
          </div>
        )}

        {/* Match teams */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
          <Team
            name={homeTeamName}
            logo={homeTeamLogo}
            align="right"
          />

          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/40">
            <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
              VS
            </span>
          </div>

          <Team
            name={awayTeamName}
            logo={awayTeamLogo}
            align="left"
          />
        </div>

        {/* Countdown */}
        <div className="mt-7">
          <div className="mb-3 flex items-center justify-center gap-2">
            <Timer className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />

            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Kick-off in
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 sm:mx-auto sm:max-w-md sm:gap-3">
            <CountdownBox
              value={time.days}
              label="Days"
            />

            <CountdownBox
              value={time.hours}
              label="Hours"
            />

            <CountdownBox
              value={time.minutes}
              label="Min"
            />

            <CountdownBox
              value={time.seconds}
              label="Sec"
            />
          </div>
        </div>

        {/* Match date */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            {formatMatchDate(matchDate)}
          </span>

          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            {formatMatchTime(matchDate)}
          </span>
        </div>
      </div>
    </section>
  );
}

function Team({
  name,
  logo,
  align,
}: {
  name: string;
  logo?: string;
  align: "left" | "right";
}) {
  return (
    <div
      className={`flex min-w-0 items-center gap-3 ${
        align === "right"
          ? "justify-end text-right"
          : "justify-start text-left"
      }`}
    >
      <div
        className={`min-w-0 ${
          align === "right"
            ? "order-1"
            : "order-2"
        }`}
      >
        <p className="truncate text-sm font-bold text-gray-900 sm:text-base dark:text-white">
          {name}
        </p>
      </div>

      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-50 p-2 shadow-sm dark:border-gray-700 dark:bg-gray-800 ${
          align === "right"
            ? "order-2"
            : "order-1"
        }`}
      >
        {logo ? (
          <img
            src={logo}
            alt={name}
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">
            {name.charAt(0)}
          </span>
        )}
      </div>
    </div>
  );
}

function CountdownBox({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 px-2 py-3 text-center dark:border-gray-700 dark:bg-gray-800/70">
      <div className="text-xl font-extrabold tabular-nums text-gray-900 sm:text-2xl dark:text-white">
        {String(value).padStart(2, "0")}
      </div>

      <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
        {label}
      </div>
    </div>
  );
}

function calculateTimeRemaining(
  targetTime: number
): TimeRemaining {
  const difference = targetTime - Date.now();

  if (
    !Number.isFinite(targetTime) ||
    difference <= 0
  ) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      completed: true,
    };
  }

  const totalSeconds = Math.floor(
    difference / 1000
  );

  const days = Math.floor(
    totalSeconds / (60 * 60 * 24)
  );

  const hours = Math.floor(
    (totalSeconds % (60 * 60 * 24)) /
      (60 * 60)
  );

  const minutes = Math.floor(
    (totalSeconds % (60 * 60)) / 60
  );

  const seconds = totalSeconds % 60;

  return {
    days,
    hours,
    minutes,
    seconds,
    completed: false,
  };
}

function formatMatchDate(
  value: string | Date
) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatMatchTime(
  value: string | Date
) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}