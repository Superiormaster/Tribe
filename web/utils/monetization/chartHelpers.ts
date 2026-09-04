/**
 * Chart utilities for Tribe monetization analytics.
 */

export interface ChartPoint {
  date: string;
  value: number;
}

export interface NormalizedChartPoint {
  date: string;
  value: number;
  label: string;
}

/**
 * Converts unknown chart values into safe numbers.
 */
export function normalizeChartValue(
  value: number | string | null | undefined
): number {
  const numericValue = Number(value ?? 0);

  return Number.isFinite(numericValue) ? numericValue : 0;
}

/**
 * Normalizes chart data received from the API.
 */
export function normalizeChartData(
  data: ChartPoint[] | null | undefined
): NormalizedChartPoint[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data.map((point) => {
    const date = new Date(point.date);

    return {
      date: point.date,
      value: normalizeChartValue(point.value),
      label: Number.isNaN(date.getTime())
        ? point.date
        : date.toLocaleDateString("en-NG", {
            day: "numeric",
            month: "short",
          }),
    };
  });
}

export function getChartMax(data: ChartPoint[]): number {
  if (!data.length) {
    return 0;
  }

  return Math.max(
    ...data.map((point) => normalizeChartValue(point.value))
  );
}

export function getChartMin(data: ChartPoint[]): number {
  if (!data.length) {
    return 0;
  }

  return Math.min(
    ...data.map((point) => normalizeChartValue(point.value))
  );
}

export function getChartDomain(
  data: ChartPoint[],
  padding = 0.1
): [number, number] {
  if (!data.length) {
    return [0, 100];
  }

  const values = data.map((point) => normalizeChartValue(point.value));

  const min = Math.min(...values);
  const max = Math.max(...values);

  if (min === max) {
    const extra = max === 0 ? 100 : max * padding;

    return [
      Math.max(0, min - extra),
      max + extra,
    ];
  }

  const range = max - min;

  return [
    Math.max(0, min - range * padding),
    max + range * padding,
  ];
}

export function getChartTotal(data: ChartPoint[]): number {
  return data.reduce(
    (total, point) => total + normalizeChartValue(point.value),
    0
  );
}

export function getChartAverage(data: ChartPoint[]): number {
  if (!data.length) {
    return 0;
  }

  return getChartTotal(data) / data.length;
}

export function getLatestChartValue(data: ChartPoint[]): number {
  if (!data.length) {
    return 0;
  }

  return normalizeChartValue(data[data.length - 1].value);
}

export function getPreviousChartValue(data: ChartPoint[]): number {
  if (data.length < 2) {
    return 0;
  }

  return normalizeChartValue(data[data.length - 2].value);
}

export function createEmptyChartData(
  points = 7
): ChartPoint[] {
  return Array.from({ length: points }, (_, index) => ({
    date: new Date(
      Date.now() - (points - index - 1) * 24 * 60 * 60 * 1000
    ).toISOString(),
    value: 0,
  }));
}