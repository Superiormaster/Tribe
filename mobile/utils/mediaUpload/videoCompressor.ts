import { Video } from "react-native-compressor";

import type {
  NetworkStatus,
  ConnectionType,
} from "@/components/networkConnection/NetworkContext";

export type VideoCompressionQuality =
  | "720p"
  | "1080p";

export interface NativeVideoFile {
  uri: string;
  name: string;
  type: string;
  size: number;
}

interface CompressVideoOptions {
  file: NativeVideoFile;
  networkStatus: NetworkStatus;
  connectionType: ConnectionType;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

function throwIfAborted(
  signal?: AbortSignal
) {
  if (signal?.aborted) {
    throw new Error(
      "Video compression cancelled."
    );
  }
}

export function getVideoQuality(
  networkStatus: NetworkStatus,
  connectionType: ConnectionType
): VideoCompressionQuality {

  if (
    networkStatus === "poor" ||
    networkStatus === "slow"
  ) {
    return "720p";
  }

  if (
    networkStatus === "good"
  ) {
    return "1080p";
  }

  if (
    connectionType === "cellular"
  ) {
    return "720p";
  }

  return "720p";
}

export async function compressVideo({
  file,
  networkStatus,
  connectionType,
  onProgress,
  signal,
}: CompressVideoOptions): Promise<NativeVideoFile> {

  if (
    !file ||
    typeof file.uri !== "string" ||
    !file.uri
  ) {
    throw new Error(
      "Invalid video file."
    );
  }

  if (
    !file.type ||
    !file.type.startsWith("video/")
  ) {
    throw new Error(
      "The selected file is not a video."
    );
  }

  throwIfAborted(signal);

  const quality =
    getVideoQuality(
      networkStatus,
      connectionType
    );

  const is720p =
    quality === "720p";

  onProgress?.(0);

  let cancellationId:
    string | null = null;

  try {

    const compressedUri =
      await Video.compress(
        file.uri,
        {
          compressionMethod:
            "manual",

          /*
           * Maximum video dimension.
           *
           * 720p  -> 1280
           * 1080p -> 1920
           */
          maxSize:
            is720p
              ? 1280
              : 1920,

          /*
           * Approximate bitrate equivalent
           * to the old FFmpeg configuration.
           */
          bitrate:
            is720p
              ? 2_500_000
              : 5_000_000,

          /*
           * Compress even small videos.
           */
          minimumFileSizeForCompress:
            0,

          getCancellationId:
            (id: string) => {
              cancellationId = id;
            },
        },
        (progress: number) => {

          if (signal?.aborted) {
            if (cancellationId) {
              try {
                Video.cancelCompression(
                  cancellationId
                );
              } catch {}
            }

            return;
          }

          const percent =
            Math.min(
              99,
              Math.max(
                0,
                Math.round(
                  progress * 100
                )
              )
            );

          onProgress?.(
            percent
          );
        }
      );

    throwIfAborted(signal);

    if (
      !compressedUri
    ) {
      throw new Error(
        "Video compression failed."
      );
    }

    /*
     * Native compressor returns a file URI.
     *
     * We keep the same file-object shape
     * expected by the rest of the app.
     */
    const compressedFile: NativeVideoFile = {
      uri:
        compressedUri,

      name:
        `${removeExtension(
          file.name
        )}-${quality}.mp4`,

      type:
        "video/mp4",

      /*
       * Native compression returns the URI,
       * so the exact size is not available here
       * without reading the filesystem metadata.
       *
       * Keep the original size as a safe fallback.
       */
      size:
        file.size,
    };

    onProgress?.(100);

    return compressedFile;

  } catch (error) {

    if (
      signal?.aborted
    ) {
      throw new Error(
        "Video compression cancelled."
      );
    }

    console.error(
      "[VideoCompression] Failed:",
      error
    );

    throw error;
  }
}

function removeExtension(
  filename: string
): string {

  return filename.replace(
    /\.[^/.]+$/,
    ""
  );
}