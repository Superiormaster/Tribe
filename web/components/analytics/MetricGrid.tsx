"use client";

import MetricCard from "./MetricCard";
import { MetricCard as MetricCardType } from "@/hooks/analytics/types";

interface Props {
  metrics: MetricCardType[];
  onSelect?: (metric: MetricCardType) => void;
}

export default function MetricGrid({
  metrics,
  onSelect,
}: Props) {
  if (!metrics.length) return null;

  return (
    <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {metrics.map((metric, index) => (
        <MetricCard
          key={metric.id}
          metric={metric}
          index={index}
          onClick={() => onSelect?.(metric)}
        />
      ))}
    </section>
  );
}