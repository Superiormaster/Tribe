import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { UploadedMedia } from "@/utils/media";

import {
  usePostUpload,
} from "@/components/PostUploadProvider";

import type {
  NativeUploadFile,
} from "@/utils/mediaUpload/uploadFile";


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

  imageFiles: (
    | NativeUploadFile
    | string
  )[];

  imageUrls: string[];

  video:
    | NativeUploadFile
    | ExistingVideo
    | null;

  selectedCommunity:
    | number
    | null;

  isReel: boolean;

  isOnline: boolean;
}

export function getFileKey(
  file: NativeUploadFile
) {
  return [
    file.name,
    file.size,
    file.lastModified ?? 0,
  ].join("-");
}


export function useMediaUpload({
  imageFiles,
  video,
}: UseMediaUploadProps) {

  const {
    jobs,
    isReady,
    isOnline,
  } = usePostUpload();

  const currentMediaFiles =
    useMemo(() => {

      const files:
        NativeUploadFile[] = [];


      for (
        const item of imageFiles
      ) {

        if (
          typeof item === "object" &&
          item !== null &&
          "uri" in item &&
          "name" in item &&
          "type" in item &&
          "size" in item
        ) {

          files.push(
            item as NativeUploadFile
          );
        }
      }


      if (
        video &&
        typeof video === "object" &&
        "uri" in video &&
        "name" in video &&
        "type" in video &&
        "size" in video
      ) {

        files.push(
          video as NativeUploadFile
        );
      }


      return files;

    }, [
      imageFiles,
      video,
    ]);

  const [
    uploadedMedia,
    setUploadedMedia,
  ] =
    useState<UploadedMedia[]>(
      []
    );


  const [
    uploadError,
    setUploadError,
  ] =
    useState<Error | null>(
      null
    );


  const [
    uploadStatus,
    setUploadStatus,
  ] =
    useState<UploadStatus>(
      "idle"
    );


  const [
    fileProgress,
    setFileProgress,
  ] =
    useState<
      Record<string, number>
    >({});

  const currentJob =
    useMemo(() => {

      if (
        !currentMediaFiles.length
      ) {
        return null;
      }


      const fileKeys =
        new Set(
          currentMediaFiles.map(
            getFileKey
          )
        );


      return (
        jobs.find(
          (job) =>
            job.media.some(
              (media) =>
                fileKeys.has(
                  [
                    media.file_name,
                    media.file_size,
                    media.file_last_modified,
                  ].join("-")
                )
            )
        ) ?? null
      );

    }, [
      jobs,
      currentMediaFiles,
    ]);

  useEffect(() => {

    if (!currentJob) {
      return;
    }


    const progress:
      Record<string, number> = {};


    let uploadedCount =
      0;

    let failed =
      false;

    let paused =
      false;

    let uploading =
      false;


    const mediaResults:
      UploadedMedia[] = [];


    for (
      const media of currentJob.media
    ) {

      const fileKey =
        [
          media.file_name,
          media.file_size,
          media.file_last_modified,
        ].join("-");


      progress[fileKey] =
        Math.max(
          0,
          Math.min(
            100,
            Number(
              media.progress
            ) || 0
          )
        );


      if (
        media.status ===
        "uploaded"
      ) {
        uploadedCount++;
      }


      if (
        media.status ===
        "failed"
      ) {
        failed = true;
      }


      if (
        media.status ===
        "paused"
      ) {
        paused = true;
      }


      if (
        media.status ===
          "uploading" ||
        media.status ===
          "compressing"
      ) {
        uploading = true;
      }

      if (
        media.status ===
          "uploaded" &&
        media.media_id &&
        media.uploaded_url
      ) {

        mediaResults.push({
          mediaId:
            String(
              media.media_id
            ),

          url:
            media.uploaded_url,

          thumbnail:
            media.thumbnail_url ??
            "",

          type:
            media.media_type,
        });
      }
    }

    setFileProgress(
      progress
    );


    if (
      mediaResults.length
    ) {

      setUploadedMedia(
        mediaResults
      );
    }

    if (
      failed ||
      currentJob.status ===
        "failed"
    ) {

      setUploadStatus(
        "failed"
      );


      const message =
        currentJob.error ||
        currentJob.media.find(
          (item) =>
            item.error
        )?.error ||
        "Background post upload failed.";


      setUploadError(
        new Error(
          message
        )
      );


      return;
    }

    if (
      paused ||
      currentJob.status ===
        "paused" ||
      !isOnline
    ) {

      setUploadStatus(
        "paused"
      );

      setUploadError(
        null
      );

      return;
    }

    if (
      uploading ||
      currentJob.status ===
        "uploading"
    ) {

      setUploadStatus(
        "uploading"
      );

      setUploadError(
        null
      );

      return;
    }

    if (
      uploadedCount ===
        currentJob.media.length &&
      currentJob.media.length >
        0
    ) {

      setUploadStatus(
        "success"
      );

      setUploadError(
        null
      );

      return;
    }

    if (
      currentJob.status ===
        "queued" ||
      currentJob.status ===
        "creating"
    ) {

      setUploadStatus(
        "uploading"
      );

      setUploadError(
        null
      );
    }

  }, [
    currentJob,
    isOnline,
  ]);

  const uploadSelectedMedia =
    useCallback(
      async (
        _files: NativeUploadFile[],
      ): Promise<
        UploadedMedia[]
      > => {

        throw new Error(
          "Direct media upload is disabled. All posts must be queued through the background PostUploadManager."
        );
      },
      []
    );

  const resumeUpload =
    useCallback(
      async (): Promise<
        UploadedMedia[]
      > => {

        throw new Error(
          "Direct media resume is disabled. Resume the background post upload job through PostUploadManager."
        );
      },
      []
    );

  const clearUploadedMedia =
    useCallback(
      () => {

        setUploadedMedia(
          []
        );

        setFileProgress(
          {}
        );

        setUploadError(
          null
        );

        setUploadStatus(
          "idle"
        );

      },
      []
    );

  return {

    uploadedMedia,

    uploadStatus,

    uploading:
      uploadStatus ===
      "uploading",

    uploadError,

    fileProgress,

    uploadPromiseRef: {
      current: null,
    },

    uploadSelectedMedia,

    setUploadedMedia,

    setFileProgress,

    setUploadError,

    resumeUpload,

    setUploadStatus,

    backgroundJob:
      currentJob,

    backgroundUploadReady:
      isReady,

    backgroundUploadOnline:
      isOnline,

    clearUploadedMedia,
  };
}