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
};

export async function uploadMediaFiles(
  files: File[],
  {
    networkStatus,
    connectionType,
    signal,
    onProgress,
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
    
    let mediaDuration:
      number | null = null;
    
    const isVideo =
      originalFile.type.startsWith("video/");
    
    const isAudio =
      originalFile.type.startsWith("audio/");
    
    if (isVideo || isAudio) {
    
      mediaDuration =
        await getVideoDuration(
          originalFile
        );
    
      console.log(
        "⏱️ [CHAT] Media duration:",
        {
          name:
            originalFile.name,
    
          type:
            originalFile.type,
    
          duration:
            mediaDuration,
        }
      );
  
      const shouldCompress =
        mediaDuration > 3 &&
        originalFile.size > 8 * 1024 * 1024;
  
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

      const cached =
        await getCompressedVideo(
          compressedVideoKey
        );

      if (cached) {

        console.log(
          "🎥 [CHAT] Using persisted compressed video",
          {
            original:
              originalFile.name,

            compressed:
              cached.name,

            size:
              (
                cached.size /
                1024 /
                1024
              ).toFixed(2) + " MB",

            quality:
              targetQuality,
          }
        );

        fileToUpload =
          cached;

        onProgress?.(
          50,
          originalFile
        );

      } else {

        console.log(
          "🎥 [CHAT] Compressing video",
          {
            name:
              originalFile.name,

            size:
              (
                originalFile.size /
                1024 /
                1024
              ).toFixed(2) + " MB",

            quality:
              targetQuality,
          }
        );

        onProgress?.(
          0,
          originalFile
        );

        const { compressVideo } =
          await import(
            "@/utils/mediaUpload/videoCompressor"
          );
  
        if (shouldCompress) {
          const compressed =
            await compressVideo({
              file:
                originalFile,
  
              networkStatus,
  
              connectionType,
  
              signal,
  
              onProgress:
                percent => {
  
                  onProgress?.(
                    Math.round(
                      percent / 2
                    ),
                    originalFile
                  );
                },
            });
  
          onProgress?.(
            50,
            originalFile
          );
  
          console.log(
            "🎥 [CHAT] Compression result:",
            {
              originalName:
                originalFile.name,
          
              originalSize:
                originalFile.size,
          
              compressedName:
                compressed.name,
          
              compressedSize:
                compressed.size,
          
              compressedType:
                compressed.type,
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
  
          await saveCompressedVideo(
            compressedVideoKey,
            compressed,
            originalFile,
            targetQuality
          );
  
          console.log(
            "💾 [CHAT] Compressed video persisted",
            {
              name:
                compressed.name,
  
              size:
                (
                  compressed.size /
                  1024 /
                  1024
                ).toFixed(2) + " MB",
  
              quality:
                targetQuality,
            }
          );
  
          fileToUpload =
            compressed;
        } else {
          fileToUpload = originalFile;
        
          onProgress?.(50, originalFile);
        }
      }
    }

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
  };
}