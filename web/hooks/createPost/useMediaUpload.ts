// hooks/post/useMediaUpload.ts

'use client';

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

import {
  saveAutoPostDraft,
} from "@/lib/messageDB";

import {
  uploadToCloudinary,
} from "@/utils/cloudinary";

import {
  buildUploadedMedia,
  type UploadedMedia,
} from "@/utils/media";

type ExistingVideo = {
  url: string;
  thumbnail?: string;
};

interface UseMediaUploadProps {
  content: string;

  imageFiles: (File | string)[];
  imageUrls: string[];

  video: File | ExistingVideo | null;

  selectedCommunity: number | null;

  isReel: boolean;
}

export function useMediaUpload({
  content,
  imageFiles,
  imageUrls,
  video,
  selectedCommunity,
  isReel,
}: UseMediaUploadProps) {

  const [uploadedMedia, setUploadedMedia] =
    useState<UploadedMedia[]>([]);

  const [uploading, setUploading] =
    useState(false);

  const [fileProgress, setFileProgress] =
    useState<Record<string, number>>({});

  const uploadPromiseRef =
    useRef<Promise<UploadedMedia[]> | null>(null);

  async function getVideoDimensions(file: File) {
    return new Promise<{
      width: number;
      height: number;
    }>((resolve, reject) => {

      const video =
        document.createElement("video");

      video.preload = "metadata";

      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);

        resolve({
          width: video.videoWidth,
          height: video.videoHeight,
        });
      };

      video.onerror = reject;

      video.src =
        URL.createObjectURL(file);
    });
  }

  const uploadSelectedMedia = async (
    files: File[],
    contentType: string
  ): Promise<UploadedMedia[]> => {

    return Promise.all(
      files.map(async (file) => {

        let isPortrait = false;

        if (file.type.startsWith("video")) {
          const { width, height } =
            await getVideoDimensions(file);

          isPortrait = height > width;
        }

        const secureUrl =
          await uploadToCloudinary({
            file,

            onProgress: (percent) => {
              setFileProgress(prev => ({
                ...prev,
                [file.name]: percent,
              }));
            },
          });

        return buildUploadedMedia(
          secureUrl,
          file,
          contentType,
          isPortrait
        );
      })
    );
  };

  // -----------------------------
  // Upload Video
  // -----------------------------

  useEffect(() => {

    if (!(video instanceof File)) return;

    const videoFile = video;

    let cancelled = false;

    async function upload() {

      setUploading(true);

      try {

        uploadPromiseRef.current =
          uploadSelectedMedia(
            [videoFile],
            isReel
              ? "short_video"
              : "long_video"
          );

        const media =
          await uploadPromiseRef.current;

        if (cancelled) return;

        setUploadedMedia(media);

      } catch {

        uploadPromiseRef.current = null;

        setUploadedMedia([]);

        await saveAutoPostDraft({
          content,
          imageFiles,
          imageUrls,
          video: videoFile,
          selectedCommunity,
        });

        toast.error(
          "Upload interrupted. Saved as draft."
        );

      } finally {

        uploadPromiseRef.current = null;

        if (!cancelled) {
          setUploading(false);
        }
      }
    }

    upload();

    return () => {
      cancelled = true;
    };

  }, [video, isReel]);

  // -----------------------------
  // Upload Images
  // -----------------------------

  useEffect(() => {

    const files =
      imageFiles.filter(
        (file): file is File =>
          file instanceof File
      );

    if (!files.length) return;

    let cancelled = false;

    async function upload() {

      setUploading(true);

      try {

        uploadPromiseRef.current =
          uploadSelectedMedia(
            files,
            "image"
          );

        const media =
          await uploadPromiseRef.current;

        if (cancelled) return;

        setUploadedMedia(media);

      } catch {

        uploadPromiseRef.current = null;

        setUploadedMedia([]);

        await saveAutoPostDraft({
          content,
          imageFiles,
          imageUrls,
          video,
          selectedCommunity,
        });

        toast.error(
          "Upload interrupted. Saved as draft."
        );

      } finally {

        uploadPromiseRef.current = null;

        if (!cancelled) {
          setUploading(false);
        }
      }
    }

    upload();

    return () => {
      cancelled = true;
    };

  }, [imageFiles]);

  // -----------------------------
  // Offline
  // -----------------------------

  useEffect(() => {

    const handleOffline = async () => {

      uploadPromiseRef.current = null;

      setUploadedMedia([]);

      await saveAutoPostDraft({
        content,
        imageFiles,
        imageUrls,
        video,
        selectedCommunity,
      });

      toast(
        "Connection lost. Draft saved."
      );
    };

    window.addEventListener(
      "offline",
      handleOffline
    );

    return () =>
      window.removeEventListener(
        "offline",
        handleOffline
      );

  }, [
    content,
    imageFiles,
    imageUrls,
    video,
    selectedCommunity,
  ]);

  return {
    uploadedMedia,
    uploading,
    fileProgress,
    uploadPromiseRef,
    uploadSelectedMedia,
    setUploadedMedia,
    setFileProgress,
  };
}