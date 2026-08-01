// utils/media.ts

export const getLowQuality = (url?: string) => {
  if (!url) return "";

  return url.replace(
    "/upload/",
    "/upload/q_30,f_auto/"
  );
};

export type UploadedMedia = {
  url: string;
  thumbnail: string | null;
  type: "image" | "video";
  width?: number;
  height?: number;
};

/**
 * Convert a Cloudinary upload URL into
 * the media object expected by the backend.
 */
export function buildUploadedMedia(
  secureUrl: string,
  file: File,
  contentType: string,
  isPortrait = false
): UploadedMedia {
  const isVideo = file.type.startsWith("video");

  let thumbnail = secureUrl;

  if (isVideo) {

    const transform =
      contentType === "short_video"
        ? "so_0,c_fill,g_auto,ar_9:16,w_720,h_1280,q_auto:best,f_jpg/"
        : isPortrait
        ? "so_0,c_fill,g_auto,ar_9:16,w_720,h_1280,q_auto:best,f_jpg/"
        : "so_0,c_fill,g_auto,ar_16:9,w_1280,h_720,q_auto:best,f_jpg/";
  
    thumbnail = secureUrl.replace(
      "/video/upload/",
      `/video/upload/${transform}`
    );
  }

  return {
    url: secureUrl,
    thumbnail,
    type: isVideo ? "video" : "image",
    width: undefined,
    height: undefined,
  };
}