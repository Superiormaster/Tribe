// utils/media.ts

export type UploadedMedia = {
  mediaId: string;
  url: string;
  thumbnail: string | null;
  type: "image" | "video";
  width?: number;
  height?: number;
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
 * Convert a Cloudinary upload URL into
 * the media object expected by the backend.
 */
export function buildUploadedMedia(
  originalUrl: string,
  mediaId: string,
  file: File,
  thumbnailUrl?: string | null,
  width?: number,
  height?: number
): UploadedMedia {
  return {
    mediaId,
    url: originalUrl,
    thumbnail: thumbnailUrl ?? null,
    type: file.type.startsWith("video/")
      ? "video"
      : "image",
    width,
    height,
  };
}