// utils/chat/mediaNormalizer.ts

export type MediaItem = {
  src: string;
  type: "image" | "video";
  thumbnail?: string | null;
  isLocal: boolean;
  file?: File;
};

/**
 * ONLY responsible for media formatting
 */
export const normalizeMedia = (file: any): MediaItem | null => {
  if (!file) return null;

  // LOCAL FILE
  if (file instanceof File) {
    return {
      src: URL.createObjectURL(file),
      type: file.type.startsWith("video") ? "video" : "image",
      file,
      isLocal: true,
    };
  }

  // STRING URL
  if (typeof file === "string") {
    return {
      src: file,
      type:
        file.includes(".mp4") || file.includes("video")
          ? "video"
          : "image",
      isLocal: false,
    };
  }

  const src =
    file.media_url || file.url || file.preview || "";

  const isVideo =
    file?.type === "video" ||
    file?.media_type === "video" ||
    src.includes("/video/") ||
    /\.(mp4|webm|mov|m4v)$/i.test(src);

  return {
    src,
    type: isVideo ? "video" : "image",
    thumbnail: file.thumbnail || null,
    isLocal: false,
  };
};