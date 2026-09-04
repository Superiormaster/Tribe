"use client";

import { useCallback, useMemo, useState } from "react";
import {
  AnalyticsRange,
  Interval,
} from "./types";
import { DEFAULT_RANGE } from "./constants";

export default function useDateRange(
  initialRange: AnalyticsRange = DEFAULT_RANGE
) {
  const [range, setRange] =
    useState<AnalyticsRange>(initialRange);

  const selectRange = useCallback(
    (value: AnalyticsRange) => {
      setRange(value);
    },
    []
  );

  const isSelected = useCallback(
    (value: AnalyticsRange) => value === range,
    [range]
  );

  const recommendedInterval = useMemo<Interval>(() => {
    switch (range) {
      case "3M":
        return "weekly";

      case "1Y":
        return "monthly";

      case "28D":
        return "daily";

      case "7D":
      default:
        return "daily";
    }
  }, [range]);

  const nextRange = useMemo(() => {
    const ranges: AnalyticsRange[] = [
      "7D",
      "28D",
      "3M",
      "1Y",
    ];

    const index = ranges.indexOf(range);

    return ranges[
      Math.min(index + 1, ranges.length - 1)
    ];
  }, [range]);

  const previousRange = useMemo(() => {
    const ranges: AnalyticsRange[] = [
      "7D",
      "28D",
      "3M",
      "1Y",
    ];

    const index = ranges.indexOf(range);

    return ranges[
      Math.max(index - 1, 0)
    ];
  }, [range]);

  return {
    range,
    setRange: selectRange,
    isSelected,
    recommendedInterval,
    nextRange,
    previousRange,
  };
}