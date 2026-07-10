// utils/media.ts

export const getLowQuality = (url?: string) => {
  if (!url) return "";

  return url.replace(
    "/upload/",
    "/upload/q_30,f_auto/"
  );
};