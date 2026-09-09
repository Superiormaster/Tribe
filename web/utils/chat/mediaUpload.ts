// utils/chat/mediaUpload.ts

import { uploadFile } from "@/utils/mediaUpload/uploadFile";

import {
  getCompressedVideo,
  getCompressedVideoKey,
  saveCompressedVideo,
  deleteCompressedVideo,
} from "@/utils/mediaUpload/compressedVideoStore";

import {
  compressImage,
} from "@/utils/compressImage";

import {
  UploadNetworkError,
} from "@/utils/mediaUpload/errors";
import { getVideoDuration } from "@/utils/chat/videoThumbnail";
import type {
  MessageType,
} from "@/utils/chat/messageContract";

const isBlobUrl = (value: unknown): boolean =>
  typeof value === "string" &&
  value.startsWith("blob:");

export type ChatUploadNetwork = {
  networkStatus:
    | "offline"
    | "poor"
    | "slow"
    | "good";

  connectionType:
    | "wifi"
    | "cellular"
    | "unknown";
};

type UploadedChatMedia = {
  media_id: string;
  url: string;
  type: "video" | "audio" | "image";
  thumbnail: string | null;
  duration: number | null;
};

export async function uploadMediaFiles(
  files: File[],
  {
    networkStatus,
    connectionType,
    signal,
    onProgress,
    duration: providedDurations = [],
  }: {
    networkStatus:
      | "offline"
      | "poor"
      | "slow"
      | "good";

    connectionType:
      | "wifi"
      | "cellular"
      | "unknown";

    signal?: AbortSignal;
    duration?: Array<number | null>;

    onProgress?: (
      percent: number,
      file: File
    ) => void;
  }
) {
  console.log(
    "🚨🚨 [UPLOAD MEDIA FILES] RECEIVED",
    {
      count: files.length,

      files: files.map(
        (file: any) => ({
          name:
            file?.name,

          type:
            file?.type,

          size:
            file?.size,

          constructor:
            file?.constructor?.name,

          isFile:
            typeof File !== "undefined" &&
            file instanceof File,

          isBlob:
            typeof Blob !== "undefined" &&
            file instanceof Blob,

          hasArrayBuffer:
            typeof file?.arrayBuffer ===
            "function",

          hasStream:
            typeof file?.stream ===
            "function",
        })
      ),
    }
  );

  const uploaded: UploadedChatMedia[] = [];

  if (!files.length) {
    return {
      media_type: "text" as MessageType,
      media_url: [],
      thumbnail: [],
    };
  }

  for (
    let index = 0;
    index < files.length;
    index++
  ) {
    const originalFile =
      files[index];
    
    console.log(
      "📄 [UPLOAD FILE]",
      {
        index,
        name:
          originalFile?.name,
        type:
          originalFile?.type,
    
        size:
          originalFile?.size,
    
        constructor:
          originalFile?.constructor?.name,
    
        isFile:
          typeof File !== "undefined" &&
          originalFile instanceof File,
    
        isBlob:
          typeof Blob !== "undefined" &&
          originalFile instanceof Blob,
      }
    );

    if (signal?.aborted) {
      throw new DOMException(
        "Upload cancelled.",
        "AbortError"
      );
    }

    if (
      networkStatus === "offline"
    ) {
      throw new UploadNetworkError(
        "Network connection unavailable."
      );
    }

    let fileToUpload =
      originalFile;

    if (
      originalFile.type.startsWith(
        "image/"
      )
    ) {
      onProgress?.(
        0,
        originalFile
      );

      fileToUpload =
        await compressImage(
          originalFile,
          1.5
        );

      onProgress?.(
        50,
        originalFile
      );
    }

    let compressedVideoKey:
      string | null = null;
    
    let mediaDuration: number | null = null;

    const isVideo =
      originalFile.type.startsWith("video/");
    
    const isAudio =
      originalFile.type.startsWith("audio/");
    
    const providedDuration =
      providedDurations[index] ?? null;
    
    if (
      typeof providedDuration === "number" &&
      Number.isFinite(providedDuration) &&
      providedDuration > 0
    ) {
      mediaDuration =
        Math.max(
          1,
          Math.round(providedDuration)
        );
    
      console.log(
        "⏱️ [CHAT] Using existing message duration",
        {
          name: originalFile.name,
          type: originalFile.type,
          duration: mediaDuration,
          source: "voice-recorder",
        }
      );
    } else if (isVideo) {
      console.log(
        "⏱️ [CHAT] No supplied duration. Detecting video duration...",
        {
          name: originalFile.name,
          type: originalFile.type,
        }
      );
    
      try {
        const detected =
          await Promise.race<number | null>([
            getVideoDuration(originalFile),
    
            new Promise<null>((resolve) => {
              setTimeout(() => {
                console.warn(
                  "⚠️ [CHAT] Video duration detection timed out."
                );
    
                resolve(null);
              }, 5000);
            }),
          ]);
    
        if (
          typeof detected === "number" &&
          Number.isFinite(detected) &&
          detected > 0
        ) {
          mediaDuration =
            Math.max(
              1,
              Math.round(detected)
            );
        } else {
          mediaDuration = null;
        }
    
        console.log(
          "⏱️ [CHAT] Video duration check finished",
          {
            name: originalFile.name,
            duration: mediaDuration,
          }
        );
      } catch (error) {
        console.warn(
          "⚠️ [CHAT] Video duration detection failed.",
          error
        );
    
        mediaDuration = null;
      }
    } else if (isAudio) {
      console.log(
        "ℹ️ [CHAT] Audio duration unavailable. No valid supplied duration.",
        {
          name: originalFile.name,
          type: originalFile.type,
        }
      );
    
      mediaDuration = null;
    }
  
    if (isVideo) {
      const shouldCompress =
        mediaDuration !== null &&
        mediaDuration > 3 &&
        originalFile.size >
          8 * 1024 * 1024;
    
      const targetQuality =
        networkStatus === "poor" ||
        networkStatus === "slow"
          ? "720p"
          : "1080p";
    
      compressedVideoKey =
        getCompressedVideoKey(
          originalFile,
          targetQuality
        );
    
      console.log(
        "🎥 [CHAT] Checking compressed video cache",
        {
          name: originalFile.name,
          quality: targetQuality,
          shouldCompress,
          cacheKey: compressedVideoKey,
        }
      );
    
      const cached =
        await getCompressedVideo(
          compressedVideoKey
        );
    
      if (cached) {
        console.log(
          "🎥 [CHAT] Using persisted compressed video",
          {
            original: originalFile.name,
            compressed: cached.name,
            size:
              (
                cached.size /
                1024 /
                1024
              ).toFixed(2) + " MB",
            quality: targetQuality,
          }
        );
    
        fileToUpload = cached;
    
        onProgress?.(
          50,
          originalFile
        );
      } else {
        console.log(
          "🎥 [CHAT] No cached video. Preparing compression.",
          {
            name: originalFile.name,
            shouldCompress,
          }
        );
    
        onProgress?.(
          0,
          originalFile
        );
    
        if (shouldCompress) {
          const { compressVideo } =
            await import(
              "@/utils/mediaUpload/videoCompressor"
            );
    
          console.log(
            "🎥 [CHAT] Starting video compression"
          );
    
          const compressed =
            await compressVideo({
              file: originalFile,
              networkStatus,
              connectionType,
              signal,
              onProgress: percent => {
                onProgress?.(
                  Math.round(
                    percent / 2
                  ),
                  originalFile
                );
              },
            });
    
          console.log(
            "🎥 [CHAT] Video compression finished",
            {
              name: compressed?.name,
              size: compressed?.size,
              type: compressed?.type,
            }
          );
    
          if (
            !compressed ||
            compressed.size <= 0
          ) {
            throw new Error(
              "Video compression produced an empty file."
            );
          }
    
          onProgress?.(
            50,
            originalFile
          );
    
          await saveCompressedVideo(
            compressedVideoKey,
            compressed,
            originalFile,
            targetQuality
          );
    
          console.log(
            "💾 [CHAT] Compressed video persisted"
          );
    
          fileToUpload =
            compressed;
        } else {
          console.log(
            "🎥 [CHAT] Video does not need compression"
          );
    
          fileToUpload =
            originalFile;
    
          onProgress?.(
            50,
            originalFile
          );
        }
      }
    }
    
    console.log(
      "✅ [UPLOAD FILE] MEDIA PREPARATION FINISHED",
      {
        name: originalFile.name,
        type: originalFile.type,
        duration: mediaDuration,
        uploadFileName: fileToUpload.name,
        uploadFileSize: fileToUpload.size,
        uploadFileType: fileToUpload.type,
      }
    );

    /*
     * Check cancellation again before upload.
     */
    if (signal?.aborted) {
      throw new DOMException(
        "Upload cancelled.",
        "AbortError"
      );
    }

    try {

      console.log(
        "🚀 [UPLOAD FILE] ABOUT TO SEND ACTUAL FILE",
        {
          name:
            fileToUpload?.name,
      
          type:
            fileToUpload?.type,
      
          size:
            fileToUpload?.size,
      
          constructor:
            fileToUpload?.constructor?.name,
      
          isFile:
            typeof File !== "undefined" &&
            fileToUpload instanceof File,
      
          isBlob:
            typeof Blob !== "undefined" &&
            fileToUpload instanceof Blob,
      
          hasArrayBuffer:
            typeof fileToUpload?.arrayBuffer ===
            "function",
      
          hasStream:
            typeof fileToUpload?.stream ===
            "function",
        }
      );
    
      const response =
        await uploadFile({
          file:
            fileToUpload,

          signal,
          duration: mediaDuration,

          onProgress:
            percent => {

              const uploadProgress =
                50 +
                Math.round(
                  percent / 2
                );

              onProgress?.(
                uploadProgress,
                originalFile
              );
            },
        });

      console.log(
        "📥 [UPLOAD FILE] SERVER RESPONSE",
        {
          response,
      
          original_url:
            response?.original_url,
      
          media_id:
            response?.media_id,
      
          thumbnail_url:
            response?.thumbnail_url,
      
          originalUrlIsBlob:
            Array.isArray(
              response?.original_url
            )
              ? response.original_url.some(
                  isBlobUrl
                )
              : isBlobUrl(
                  response?.original_url
                ),
        }
      );
  
      if (
        !response?.original_url ||
        response?.media_id == null
      ) {
        throw new Error(
          "Media upload completed but required media information was not returned."
        );
      }

      if (
        compressedVideoKey
      ) {

        await deleteCompressedVideo(
          compressedVideoKey
        );

        console.log(
          "🗑️ [CHAT] Compressed video cache deleted after successful upload"
        );
      }

      const isVideo =
        originalFile.type.startsWith(
          "video/"
        );

      const isAudio =
        originalFile.type.startsWith(
          "audio/"
        );

      const url =
        Array.isArray(
          response.original_url
        )
          ? response.original_url[0]
          : response.original_url;

      uploaded.push({
        media_id: String(response.media_id),
        url,

        type:
          isVideo
            ? "video"
            : isAudio
            ? "audio"
            : "image",

        thumbnail:
          response.thumbnail_url ??
          null,
        duration: mediaDuration,
      });

      onProgress?.(
        100,
        originalFile
      );

    } catch (error) {

      if (
        error instanceof
        UploadNetworkError ||
        (
          error instanceof Error &&
          error.name ===
            "UploadNetworkError"
        )
      ) {

        console.warn(
          "⏸️ [CHAT] Upload paused. Cached compressed media preserved."
        );

        throw error;
      }

      if (
        error instanceof DOMException &&
        error.name ===
          "AbortError"
      ) {

        console.warn(
          "⏸️ [CHAT] Upload aborted. Cached compressed media preserved."
        );

        throw error;
      }

      throw error;
    }
  }

  const media_url =
    uploaded.map(
      media =>
        media.url
    );

  const thumbnail =
    uploaded.map(
      media =>
        media.thumbnail
    );

  const media_type: MessageType =
    uploaded.length > 1
      ? "gallery"
      : uploaded[0]?.type ??
        "text";
  
  const media_asset_ids =
    uploaded.map(
      media => media.media_id
    );

  return {
    media_type,
    media_url,
    thumbnail,
    media_asset_ids,
    duration: uploaded.map(
      media => media.duration
    ),
  };
}