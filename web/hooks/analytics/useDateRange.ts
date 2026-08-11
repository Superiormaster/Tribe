"use client";

import { useCallback, useMemo, useState } from "react";
import { AnalyticsRange } from "./types";
import { DEFAULT_RANGE } from "./constants";

export default function useDateRange(
  initialRange: AnalyticsRange = DEFAULT_RANGE
) {
  const [range, setRange] = useState<AnalyticsRange>(initialRange);

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

  const nextRange = useMemo(() => {
    const ranges: AnalyticsRange[] = ["7D", "28D", "3M", "1Y"];

    const index = ranges.indexOf(range);

    return ranges[
      Math.min(index + 1, ranges.length - 1)
    ];
  }, [range]);

  const previousRange = useMemo(() => {
    const ranges: AnalyticsRange[] = ["7D", "28D", "3M", "1Y"];

    const index = ranges.indexOf(range);

    return ranges[
      Math.max(index - 1, 0)
    ];
  }, [range]);

  return {
    range,
    setRange: selectRange,
    isSelected,
    nextRange,
    previousRange,
  };
}