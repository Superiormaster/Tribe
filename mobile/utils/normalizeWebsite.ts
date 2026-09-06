export function normalizeWebsite(url?: string | null): string {
  if (!url) return "";

  let value = url.trim();

  if (!value) return "";

  // Remove http:// or https://
  value = value.replace(/^https?:\/\//i, "");

  // Remove www.
  value = value.replace(/^www\./i, "");

  return value;
}

export function websiteToUrl(url?: string | null): string {
  if (!url) return "";

  const value = url.trim();

  if (!value) return "";

  return /^https?:\/\//i.test(value)
    ? value
    : `https://${value}`;
}

export function websiteDisplay(url?: string | null): string {
  if (!url) return "";

  return url
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "");
}