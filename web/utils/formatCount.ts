export function formatCount(value: number | null | undefined): string {
  if (value == null) return "0";

  const abs = Math.abs(value);

  if (abs < 1000) {
    return value.toString();
  }

  if (abs < 1_000_000) {
    const num = value / 1_000;
    return `${Number.isInteger(num) ? num : num.toFixed(1).replace(/\.0$/, "")}k`;
  }

  if (abs < 1_000_000_000) {
    const num = value / 1_000_000;
    return `${Number.isInteger(num) ? num : num.toFixed(1).replace(/\.0$/, "")}m`;
  }

  if (abs < 1_000_000_000_000) {
    const num = value / 1_000_000_000;
    return `${Number.isInteger(num) ? num : num.toFixed(1).replace(/\.0$/, "")}b`;
  }

  const num = value / 1_000_000_000_000;
  return `${Number.isInteger(num) ? num : num.toFixed(1).replace(/\.0$/, "")}t`;
}