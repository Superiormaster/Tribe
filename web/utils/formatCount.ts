export function formatCount(value: number | null |undefined): string {
  if (value == null) return "0";

  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (abs < 1000) {
    return value.toString();
  }

  if (abs < 1_000_000) {
    const num = abs / 1_000;
    return `${sign}${Number.isInteger(num) ? num : num.toFixed(1).replace(/\.0$/, "")}K`;
  }

  if (abs < 1_000_000_000) {
    const num = abs / 1_000_000;
    return `${sign}${Number.isInteger(num) ? num : num.toFixed(1).replace(/\.0$/, "")}M`;
  }

  if (abs < 1_000_000_000_000) {
    const num = abs / 1_000_000_000;
    return `${sign}${Number.isInteger(num) ? num : num.toFixed(1).replace(/\.0$/, "")}B`;
  }

  const num = abs / 1_000_000_000_000;
  return `${sign}${Number.isInteger(num) ? num : num.toFixed(1).replace(/\.0$/, "")}T`;
}