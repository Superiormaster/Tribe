import { useCallback, useMemo, useState } from "react";

import {
ChartType,
Interval,
MetricType,
ChartPoint,
} from "./types";

import {
DEFAULT_CHART,
DEFAULT_INTERVAL,
DEFAULT_METRIC,
} from "./constants";

interface UseChartOptions {
metric?: MetricType;
chartType?: ChartType;
interval?: Interval;
data?: ChartPoint[];
}

export default function useChart({
metric = DEFAULT_METRIC,
chartType = DEFAULT_CHART,
interval = DEFAULT_INTERVAL,
data = [],
}: UseChartOptions = {}) {
const [selectedMetric, setSelectedMetric] =
useState<MetricType>(metric);

const [selectedChart, setSelectedChart] =
useState<ChartType>(chartType);

const [selectedInterval, setSelectedInterval] =
useState<Interval>(interval);

const chartData = useMemo(() => data, [data]);

const changeMetric = useCallback(
(value: MetricType) => {
setSelectedMetric(value);
},
[]
);

const changeChart = useCallback(
(value: ChartType) => {
setSelectedChart(value);
},
[]
);

const changeInterval = useCallback(
(value: Interval) => {
setSelectedInterval(value);
},
[]
);

const reset = useCallback(() => {
setSelectedMetric(DEFAULT_METRIC);
setSelectedChart(DEFAULT_CHART);
setSelectedInterval(DEFAULT_INTERVAL);
}, []);

return {
metric: selectedMetric,
chartType: selectedChart,
interval: selectedInterval,

chartData,

setMetric: changeMetric,
setChartType: changeChart,
setInterval: changeInterval,

reset,

};
}