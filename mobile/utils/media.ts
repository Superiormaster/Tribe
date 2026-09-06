// utils/media.ts

export type UploadedMedia = {
  mediaId: string;
  url: string;
  thumbnail: string | null;
  type: "image" | "video";
  width?: number;
  height?: number;
};

export type NativeMediaFile = {
  uri: string;
  name?: string;
  type?: string;
  size?: number;
};

export function toPostMediaPayload(
  media: UploadedMedia
) {
  return {
    media_id: media.mediaId,
    media_type: media.type,
  };
}

/**
 * Convert an uploaded media URL into
 * the media object expected by the backend.
 */
export function buildUploadedMedia(
  originalUrl: string,
  mediaId: string,
  file: NativeMediaFile,
  thumbnailUrl?: string | null,
  width?: number,
  height?: number
): UploadedMedia {
  const contentType =
    file.type ?? "";

  return {
    mediaId,
    url: originalUrl,
    thumbnail: thumbnailUrl ?? null,
    type: contentType.startsWith("video/")
      ? "video"
      : "image",
    width,
    height,
  };
}