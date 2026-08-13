'use client';

import { useEffect, useRef, useState } from "react";

import { uploadMediaResumable } from "@/utils/mediaUpload/uploadMediaResumable";

import { UploadNetworkError } from "@/utils/mediaUpload/errors";
import {
  buildUploadedMedia,
  type UploadedMedia,
} from "@/utils/media";

type ExistingVideo = {
  url: string;
  thumbnail?: string;
};

export type UploadStatus =
  | "idle"
  | "uploading"
  | "success"
  | "failed"
  | "paused";

interface UseMediaUploadProps {
  content: string;
  imageFiles: (File | string)[];
  imageUrls: string[];
  video: File | ExistingVideo | null;
  selectedCommunity: number | null;
  isReel: boolean;
  isOnline: boolean;
}

export function getFileKey(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

export function useMediaUpload({
  content,
  imageFiles,
  imageUrls,
  video,
  selectedCommunity,
  isReel,
  isOnline,
}: UseMediaUploadProps) {

  const [uploadedMedia, setUploadedMedia] =
    useState<UploadedMedia[]>([]);

  const [uploadStatus, setUploadStatus] =
    useState<UploadStatus>("idle");

  const [uploadError, setUploadError] =
    useState<Error | null>(null);

  const [fileProgress, setFileProgress] =
    useState<Record<string, number>>({});

  const abortControllersRef =
    useRef<Set<AbortController>>(new Set());

  const uploadGenerationRef =
    useRef(0);

  const uploadPromiseRef =
    useRef<Promise<UploadedMedia[]> | null>(null);

  const resumeUpload = async (): Promise<UploadedMedia[]> => {
    const files: File[] = [];
  
    if (video instanceof File) {
      files.push(video);
    } else {
      files.push(
        ...imageFiles.filter(
          (item): item is File =>
            item instanceof File
        )
      );
    }
  
    if (!files.length) {
      return uploadedMedia;
    }
  
    setUploadStatus("uploading");
    setUploadError(null);
  
    const promise = uploadSelectedMedia(
      files,
    );
  
    uploadPromiseRef.current = promise;
  
    try {
      const media = await promise;
  
      setUploadedMedia(media);
      setUploadStatus("success");
      setUploadError(null);
  
      return media;
  
    } catch (error) {
  
      if (
        error instanceof UploadNetworkError ||
        (
          error instanceof Error &&
          error.name === "UploadNetworkError"
        )
      ) {
        setUploadStatus("paused");
        setUploadError(null);
        throw error;
      }
  
      setUploadStatus("failed");
  
      setUploadError(
        error instanceof Error
          ? error
          : new Error("Media upload failed.")
      );
  
      throw error;
  
    } finally {
  
      if (
        uploadPromiseRef.current === promise
      ) {
        uploadPromiseRef.current = null;
      }
    }
  };
  
  const uploadSelectedMedia = async (
    files: File[],
  ): Promise<UploadedMedia[]> => {

    const generation =
      ++uploadGenerationRef.current;

    if (!files.length) {
      return [];
    }

    setUploadStatus("uploading");
    setUploadError(null);

    try {

      const results =
        await Promise.all(
          files.map(async (file) => {

            const controller =
              new AbortController();

            abortControllersRef.current.add(
              controller
            );

            try {

              const uploaded =
                await uploadMediaResumable({
                  file,
                  signal:
                    controller.signal,
                  onProgress: (percent) => {
                    setFileProgress(
                      (prev) => ({
                        ...prev,

                        [getFileKey(file)]:
                          percent,
                      })
                    );
                  },
                });

              if (
                generation !==
                uploadGenerationRef.current
              ) {

                throw new DOMException(
                  "Media upload was cancelled.",
                  "AbortError"
                );
              }

              if (
                !uploaded?.original_url ||
                uploaded?.media_id == null
              ) {
                throw new Error(
                  "Media upload completed but required media information was not returned."
                );
              }
              
              return buildUploadedMedia(
                uploaded.original_url,
                String(uploaded.media_id),
                file,
                uploaded.thumbnail_url,
              );

            } finally {

              abortControllersRef.current.delete(
                controller
              );
            }
          })
        );

      if (
        generation !==
        uploadGenerationRef.current
      ) {

        return [];
      }

      setUploadStatus("success");
      return results;

    } catch (error) {

      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {

        setUploadStatus("paused");
        throw error;
      }

      const normalizedError =
        error instanceof Error
          ? error
          : new Error(
              "Media upload failed."
            );

      setUploadError(
        normalizedError
      );

      setUploadStatus("failed");
      throw normalizedError;
    }
  };

  useEffect(() => {

    if (!(video instanceof File)) {
      if (
        !imageFiles.some(
          (file) => file instanceof File
        )
      ) {
        setUploadStatus("idle");
      }

      return;
    }

    if (!isOnline) {

      setUploadStatus("paused");
      setUploadError(null);
      setUploadedMedia([]);

      return;
    }

    const videoFile =
      video;
    let cancelled =
      false;

    async function upload() {
      setUploadStatus("uploading");
      setUploadError(null);
      setUploadedMedia([]);
      setFileProgress({});
    
      let promise: Promise<UploadedMedia[]> | null = null;
    
      try {
        promise = uploadSelectedMedia(
          [videoFile]
        );
    
        uploadPromiseRef.current = promise;
    
        const media = await promise;
    
        if (cancelled) {
          return;
        }
    
        setUploadedMedia(media);
        setUploadStatus("success");
    
      } catch (error) {
    
        if (cancelled) {
          return;
        }
    
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          setUploadStatus("paused");
          return;
        }
    
        console.error(
          "Video upload failed:",
          error
        );
    
        setUploadedMedia([]);
    
        setUploadError(
          error instanceof Error
            ? error
            : new Error(
                "Video upload failed."
              )
        );
    
        setUploadStatus("failed");
    
      } finally {
    
        if (
          promise &&
          uploadPromiseRef.current === promise
        ) {
          uploadPromiseRef.current = null;
        }
      }
    }

    upload();

    return () => {

      cancelled = true;
      uploadGenerationRef.current++;

      abortControllersRef.current.forEach(
        (controller) => {
          controller.abort();
        }
      );

      abortControllersRef.current.clear();
    };

  }, [
    video,
    isReel,
    isOnline,
  ]);

  useEffect(() => {

    const files =
      imageFiles.filter(
        (file): file is File =>
          file instanceof File
      );

    if (!files.length) {

      if (!(video instanceof File)) {
        setUploadStatus("idle");
      }

      return;
    }

    if (!isOnline) {

      setUploadStatus("paused");
      setUploadError(null);
      setUploadedMedia([]);

      return;
    }

    let cancelled =
      false;

    async function upload() {
      setUploadStatus("uploading");
      setUploadError(null);
      setUploadedMedia([]);
      setFileProgress({});
    
      let promise: Promise<UploadedMedia[]> | null = null;
    
      try {
        promise = uploadSelectedMedia(
          files,
        );
    
        uploadPromiseRef.current = promise;
    
        const media = await promise;
    
        if (cancelled) {
          return;
        }
    
        setUploadedMedia(media);
        setUploadStatus("success");
    
      } catch (error) {
    
        if (cancelled) {
          return;
        }
    
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          setUploadStatus("paused");
          return;
        }
    
        console.error(
          "Image upload failed:",
          error
        );
    
        setUploadedMedia([]);
    
        setUploadError(
          error instanceof Error
            ? error
            : new Error(
                "Image upload failed."
              )
        );
    
        setUploadStatus("failed");
    
      } finally {
    
        if (
          promise &&
          uploadPromiseRef.current === promise
        ) {
          uploadPromiseRef.current = null;
        }
      }
    }

    upload();

    return () => {

      cancelled = true;
      uploadGenerationRef.current++;

      abortControllersRef.current.forEach(
        (controller) => {
          controller.abort();
        }
      );

      abortControllersRef.current.clear();
    };

  }, [
    imageFiles,
    isOnline,
  ]);

  return {
    uploadedMedia,
    uploadStatus,
    uploading:
      uploadStatus === "uploading",
    uploadError,
    fileProgress,
    uploadPromiseRef,
    uploadSelectedMedia,
    setUploadedMedia,
    setFileProgress,
    setUploadError,
    resumeUpload,
    setUploadStatus,
  };
}