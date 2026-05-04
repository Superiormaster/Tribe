export function getFingerprint() {
  if (typeof window === "undefined") return null;

  let fp = localStorage.getItem("device_fp");

  if (!fp) {
    const base = crypto.randomUUID();

    const meta = navigator.userAgent + navigator.platform;

    fp = btoa(base + "|" + meta); // encoded fingerprint

    localStorage.setItem("device_fp", fp);
  }

  return fp;
}