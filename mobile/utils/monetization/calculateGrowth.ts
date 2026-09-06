/**
 * Growth and revenue calculation utilities.
 */

export interface GrowthResult {
  value: number;
  percentage: number;
  direction: "up" | "down" | "neutral";
  label: string;
}

export function calculateGrowth(
  current: number | string | null | undefined,
  previous: number | string | null | undefined
): number {
  const currentValue = Number(current ?? 0);
  const previousValue = Number(previous ?? 0);

  if (!Number.isFinite(currentValue) || !Number.isFinite(previousValue)) {
    return 0;
  }

  if (previousValue === 0) {
    if (currentValue === 0) return 0;
    return 100;
  }

  return ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
}

export function getGrowth(
  current: number | string | null | undefined,
  previous: number | string | null | undefined
): GrowthResult {
  const percentage = calculateGrowth(current, previous);

  let direction: GrowthResult["direction"] = "neutral";

  if (percentage > 0) {
    direction = "up";
  } else if (percentage < 0) {
    direction = "down";
  }

  const rounded = Number(percentage.toFixed(2));

  return {
    value: Number(current ?? 0),
    percentage: rounded,
    direction,
    label:
      rounded > 0
        ? `+${rounded}%`
        : rounded < 0
          ? `${rounded}%`
          : "0%",
  };
}

export function calculateDifference(
  current: number | string | null | undefined,
  previous: number | string | null | undefined
): number {
  const currentValue = Number(current ?? 0);
  const previousValue = Number(previous ?? 0);

  if (!Number.isFinite(currentValue) || !Number.isFinite(previousValue)) {
    return 0;
  }

  return currentValue - previousValue;
}

export function calculateProgress(
  current: number | string | null | undefined,
  target: number | string | null | undefined
): number {
  const currentValue = Number(current ?? 0);
  const targetValue = Number(target ?? 0);

  if (!Number.isFinite(currentValue) || !Number.isFinite(targetValue)) {
    return 0;
  }

  if (targetValue <= 0) {
    return 0;
  }

  return Math.min(Math.max((currentValue / targetValue) * 100, 0), 100);
}

export function calculateAverage(
  total: number | string | null | undefined,
  count: number | string | null | undefined
): number {
  const totalValue = Number(total ?? 0);
  const countValue = Number(count ?? 0);

  if (!Number.isFinite(totalValue) || !Number.isFinite(countValue)) {
    return 0;
  }

  if (countValue <= 0) {
    return 0;
  }

  return totalValue / countValue;
}