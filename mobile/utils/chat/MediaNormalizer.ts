// utils/chat/mediaNormalizer.ts

export type MediaItem = {
  src: string;
  type: "image" | "video";
  thumbnail?: string | null;
  isLocal: boolean;
  file?: File;
  duration?: number | null;
};

export const normalizeMedia = (
  asset: any
): MediaItem | null => {

  if (!asset) {
    return null;
  }

  if (
    typeof File !== "undefined" &&
    asset instanceof File
  ) {
    const isVideo =
      asset.type.startsWith("video/");

    return {
      src: URL.createObjectURL(asset),
      type: isVideo ? "video" : "image",
      file: asset,
      isLocal: true,
      thumbnail: null,
    };
  }

  if (typeof asset === "string") {

    const isVideo =
      isVideoUrl(asset);

    return {
      src: asset,
      type: isVideo ? "video" : "image",
      isLocal: false,
      thumbnail: null,
    };
  }

  if (
    typeof asset.src === "string" &&
    asset.src.length > 0 &&
    (
      asset.type === "image" ||
      asset.type === "video"
    )
  ) {
    return {
      src: asset.src,

      type:
        asset.type === "video"
          ? "video"
          : "image",

      thumbnail:
        asset.thumbnail ??
        asset.thumbnail_url ??
        null,

      isLocal:
        Boolean(asset.isLocal),

      file:
        asset.file instanceof File
          ? asset.file
          : undefined,

      duration:
        asset.duration ?? null,
    };
  }

  const src =
    getMediaUrl(asset);

  if (!src) {
    return null;
  }

  const type =
    getMediaType(
      asset,
      src
    );

  return {
    src,

    type,

    thumbnail:
      asset.thumbnail_url ??
      asset.thumbnail ??
      null,

    isLocal:
      Boolean(
        asset.isLocal ||
        asset.local ||
        asset.blob ||
        (
          typeof File !== "undefined" &&
          asset.file instanceof File
        )
      ),

    file:
      (
        typeof File !== "undefined" &&
        asset.file instanceof File
      )
        ? asset.file
        : undefined,

    duration:
      asset.duration ?? null,
  };
};


/**
 * Normalize an entire media array.
 */
export const normalizeMediaList = (
  media: any
): MediaItem[] => {

  if (!Array.isArray(media)) {
    return [];
  }

  return media
    .map(normalizeMedia)
    .filter(
      (item): item is MediaItem =>
        item !== null &&
        Boolean(item.src)
    );
};


/**
 * Resolve the actual media URL.
 */
function getMediaUrl(
  asset: any
): string | null {

  const candidates = [
    asset.original_url,
    asset.media_url,
    asset.file_url,
    asset.url,
    asset.preview,
  ];

  for (const value of candidates) {

    if (Array.isArray(value)) {

      const first =
        value.find(
          (item) =>
            typeof item === "string" &&
            item.trim()
        );

      if (first) {
        return first;
      }

      continue;
    }

    if (
      typeof value === "string" &&
      value.trim()
    ) {
      return value;
    }
  }

  return null;
}


/**
 * Resolve image/video type.
 */
function getMediaType(
  asset: any,
  src: string
): "image" | "video" {

  /*
   * Explicit type has highest priority.
   */
  const explicitType =
    asset.media_type ??
    asset.type;

  if (
    explicitType === "video" ||
    explicitType === "image"
  ) {
    return explicitType;
  }

  /*
   * MIME type.
   */
  const contentType =
    asset.content_type ??
    asset.mime_type ??
    "";

  if (
    typeof contentType === "string" &&
    contentType.startsWith("video/")
  ) {
    return "video";
  }

  if (
    typeof contentType === "string" &&
    contentType.startsWith("image/")
  ) {
    return "image";
  }

  /*
   * URL fallback.
   */
  return isVideoUrl(src)
    ? "video"
    : "image";
}


/**
 * Detect video URLs when no explicit
 * media type is available.
 */
function isVideoUrl(
  src: string
): boolean {

  if (!src) {
    return false;
  }

  const cleanSrc =
    src
      .split("?")[0]
      .split("#")[0]
      .toLowerCase();

  return (
    /\.(mp4|webm|mov|m4v|ogg|ogv)$/i.test(
      cleanSrc
    ) ||
    cleanSrc.includes("/video/") ||
    cleanSrc.includes("video/")
  );
}