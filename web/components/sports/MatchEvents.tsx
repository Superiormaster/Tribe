"use client";

import {
  ArrowRightLeft,
  CircleDot,
  Flag,
  Goal,
  Square,
  Timer,
} from "lucide-react";

import type {
  MatchEvent,
  MatchEventType,
} from "@/utils/sports/types/sports";

interface MatchEventsProps {
  events?: MatchEvent[];
  homeTeamId?: string;
  awayTeamId?: string;
  homeTeamName?: string;
  awayTeamName?: string;
  loading?: boolean;
  title?: string;
  emptyMessage?: string;
}

export default function MatchEvents({
  events = [],
  homeTeamId,
  awayTeamId,
  homeTeamName = "Home",
  awayTeamName = "Away",
  loading = false,
  title = "Match Events",
  emptyMessage = "No match events have been recorded yet.",
}: MatchEventsProps) {
  if (loading) {
    return <LoadingState />;
  }

  const sortedEvents = [...events].sort((a, b) => {
    const minuteA =
      a.minute * 100 + (a.extraMinute ?? 0);

    const minuteB =
      b.minute * 100 + (b.extraMinute ?? 0);

    return minuteA - minuteB;
  });

  return (
    <section className="w-full">
      {/* Header */}
      <div className="mb-5 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/30">
          <Timer className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
            {title}
          </h2>

          <p className="text-sm text-gray-500 dark:text-gray-400">
            Timeline of important match moments
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        {sortedEvents.length === 0 ? (
          <EmptyState message={emptyMessage} />
        ) : (
          <div className="relative p-4 sm:p-6">
            {/* Timeline */}
            <div className="absolute bottom-6 left-1/2 top-6 hidden w-px -translate-x-1/2 bg-gray-200 sm:block dark:bg-gray-800" />

            <div className="space-y-5">
              {sortedEvents.map((event, index) => {
                const isHome =
                  event.teamId === homeTeamId;

                const isAway =
                  event.teamId === awayTeamId;

                return (
                  <EventRow
                    key={
                      event.id ??
                      `${event.minute}-${event.type}-${index}`
                    }
                    event={event}
                    isHome={isHome}
                    isAway={isAway}
                    homeTeamName={homeTeamName}
                    awayTeamName={awayTeamName}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function EventRow({
  event,
  isHome,
  isAway,
  homeTeamName,
  awayTeamName,
}: {
  event: MatchEvent;
  isHome: boolean;
  isAway: boolean;
  homeTeamName: string;
  awayTeamName: string;
}) {
  const teamName = isHome
    ? homeTeamName
    : isAway
      ? awayTeamName
      : "Match";

  const content = (
    <EventContent
      event={event}
      teamName={teamName}
      isHome={isHome}
      isAway={isAway}
    />
  );

  return (
    <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-5">
      {/* Home side */}
      <div className="text-right">
        {isHome ? content : null}
      </div>

      {/* Center */}
      <div className="relative z-10 flex flex-col items-center">
        <span className="flex h-9 min-w-9 items-center justify-center rounded-full border border-gray-200 bg-white px-2 text-[11px] font-extrabold text-gray-700 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
          {event.minute}

          {event.extraMinute
            ? `+${event.extraMinute}`
            : ""}

          <span className="ml-0.5">'</span>
        </span>
      </div>

      {/* Away side */}
      <div>
        {isAway ? content : null}
      </div>

      {/* Neutral event */}
      {!isHome && !isAway && (
        <div className="col-span-3 flex justify-center">
          {content}
        </div>
      )}
    </div>
  );
}

function EventContent({
  event,
  teamName,
  isHome,
  isAway,
}: {
  event: MatchEvent;
  teamName: string;
  isHome: boolean;
  isAway: boolean;
}) {
  const config = getEventConfig(event.type);

  return (
    <div
      className={`inline-flex max-w-full items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-800/50 ${
        isHome
          ? "justify-end"
          : isAway
            ? "justify-start"
            : "justify-center"
      }`}
    >
      {isAway && (
        <EventIcon
          type={event.type}
          icon={config.icon}
          iconClassName={config.iconClassName}
        />
      )}

      <div
        className={`min-w-0 ${
          isHome
            ? "text-right"
            : "text-left"
        }`}
      >
        <div className="flex items-center gap-1.5">
          {isHome && (
            <EventIcon
              type={event.type}
              icon={config.icon}
              iconClassName={config.iconClassName}
            />
          )}

          <p className="truncate text-xs font-bold text-gray-900 dark:text-white">
            {getEventTitle(event)}
          </p>
        </div>

        {event.description && (
          <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
            {event.description}
          </p>
        )}

        {event.assistPlayer && (
          <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
            Assist: {event.assistPlayer.name}
          </p>
        )}

        <p className="mt-1 text-[10px] font-medium text-gray-400 dark:text-gray-500">
          {teamName}
        </p>
      </div>

      {isHome && false && null}
    </div>
  );
}

function EventIcon({
  type,
  icon,
  iconClassName,
}: {
  type: MatchEventType;
  icon: React.ReactNode;
  iconClassName: string;
}) {
  return (
    <span
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${getEventIconBackground(
        type
      )} ${iconClassName}`}
    >
      {icon}
    </span>
  );
}

function getEventTitle(event: MatchEvent) {
  const playerName =
    event.player?.name ?? "Unknown player";

  switch (event.type) {
    case "goal":
      return playerName;

    case "own_goal":
      return `${playerName} — Own Goal`;

    case "penalty_goal":
      return `${playerName} — Penalty`;

    case "missed_penalty":
      return `${playerName} — Missed Penalty`;

    case "yellow_card":
      return `${playerName} — Yellow Card`;

    case "red_card":
      return `${playerName} — Red Card`;

    case "second_yellow":
      return `${playerName} — Second Yellow`;

    case "substitution":
      return event.assistPlayer
        ? `${playerName} ↔ ${event.assistPlayer.name}`
        : `${playerName} — Substitution`;

    case "var":
      return "VAR Decision";

    case "kickoff":
      return "Kick-off";

    case "halftime":
      return "Half-time";

    case "fulltime":
      return "Full-time";

    default:
      return event.description || "Match event";
  }
}

function getEventConfig(type: MatchEventType) {
  switch (type) {
    case "goal":
      return {
        icon: <Goal className="h-3.5 w-3.5" />,
        iconClassName:
          "text-indigo-600 dark:text-indigo-400",
      };

    case "own_goal":
      return {
        icon: <Goal className="h-3.5 w-3.5" />,
        iconClassName:
          "text-gray-600 dark:text-gray-300",
      };

    case "penalty_goal":
      return {
        icon: <Goal className="h-3.5 w-3.5" />,
        iconClassName:
          "text-indigo-600 dark:text-indigo-400",
      };

    case "missed_penalty":
      return {
        icon: <Goal className="h-3.5 w-3.5" />,
        iconClassName:
          "text-gray-500 dark:text-gray-400",
      };

    case "yellow_card":
      return {
        icon: (
          <Square className="h-3.5 w-3.5 fill-current" />
        ),
        iconClassName:
          "text-yellow-500 dark:text-yellow-400",
      };

    case "second_yellow":
      return {
        icon: (
          <Square className="h-3.5 w-3.5 fill-current" />
        ),
        iconClassName:
          "text-yellow-500 dark:text-yellow-400",
      };

    case "red_card":
      return {
        icon: (
          <Square className="h-3.5 w-3.5 fill-current" />
        ),
        iconClassName:
          "text-red-600 dark:text-red-400",
      };

    case "substitution":
      return {
        icon: (
          <ArrowRightLeft className="h-3.5 w-3.5" />
        ),
        iconClassName:
          "text-indigo-600 dark:text-indigo-400",
      };

    case "var":
      return {
        icon: (
          <CircleDot className="h-3.5 w-3.5" />
        ),
        iconClassName:
          "text-indigo-600 dark:text-indigo-400",
      };

    case "kickoff":
    case "halftime":
    case "fulltime":
      return {
        icon: (
          <Timer className="h-3.5 w-3.5" />
        ),
        iconClassName:
          "text-indigo-600 dark:text-indigo-400",
      };

    default:
      return {
        icon: (
          <Flag className="h-3.5 w-3.5" />
        ),
        iconClassName:
          "text-gray-500 dark:text-gray-400",
      };
  }
}

function getEventIconBackground(
  type: MatchEventType
) {
  switch (type) {
    case "goal":
    case "penalty_goal":
      return "bg-indigo-50 dark:bg-indigo-950/40";

    case "yellow_card":
    case "second_yellow":
      return "bg-yellow-50 dark:bg-yellow-950/30";

    case "red_card":
      return "bg-red-50 dark:bg-red-950/30";

    default:
      return "bg-gray-100 dark:bg-gray-800";
  }
}

function LoadingState() {
  return (
    <section className="w-full">
      <div className="mb-5 flex items-center gap-2">
        <div className="h-8 w-8 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />

        <div className="space-y-2">
          <div className="h-5 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />

          <div className="h-3 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="space-y-6">
          {Array.from({ length: 6 }).map(
            (_, index) => (
              <div
                key={index}
                className={`flex animate-pulse ${
                  index % 2 === 0
                    ? "justify-start"
                    : "justify-end"
                }`}
              >
                <div className="h-12 w-52 rounded-xl bg-gray-200 dark:bg-gray-800" />
              </div>
            )
          )}
        </div>
      </div>
    </section>
  );
}

function EmptyState({
  message,
}: {
  message: string;
}) {
  return (
    <div className="px-6 py-12 text-center">
      <Timer className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />

      <h3 className="mt-3 font-semibold text-gray-900 dark:text-white">
        No match events
      </h3>

      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {message}
      </p>
    </div>
  );
}