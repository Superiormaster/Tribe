import {
useCallback,
useEffect,
useRef,
useState,
} from "react";

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
useNetwork,
} from "@/components/networkConnection/NetworkContext";

import {
UploadNetworkError,
} from "@/utils/mediaUpload/errors";

import {
buildUploadedMedia,
type UploadedMedia,
} from "@/utils/media";

/**

* React Native media object.
* 
* Expo ImagePicker / DocumentPicker media is URI based,
* unlike the browser File API.
  */
  export type NativeMediaFile = {
  uri: string;
  name?: string;
  type?: string;
  size?: number;
  };

type ExistingVideo = {
url: string;
thumbnail?: string;
};

export type MediaFile =
| NativeMediaFile
| ExistingVideo
| string;

export type UploadStatus =
| "idle"
| "uploading"
| "success"
| "failed"
| "paused";

interface UseMediaUploadProps {
content: string;

imageFiles: MediaFile[];

imageUrls: string[];

video: MediaFile | null;

selectedCommunity: number | null;

isReel: boolean;

isOnline: boolean;
}

function isNativeMediaFile(
file: MediaFile
): file is NativeMediaFile {
return (
typeof file === "object" &&
file !== null &&
"uri" in file
);
}

function isExistingVideo(
file: MediaFile
): file is ExistingVideo {
return (
typeof file === "object" &&
file !== null &&
"url" in file
);
}

function getMediaType(
file: NativeMediaFile
): string {
return (
file.type ||
""
).toLowerCase();
}

function getFileName(
file: NativeMediaFile
): string {
if (file.name) {
return file.name;
}

const cleanUri =
file.uri.split("?")[0];

const lastPart =
cleanUri.split("/").pop();

return (
lastPart ||
"media-${Date.now()}"
);
}

export function getFileKey(
file: NativeMediaFile
) {
return "${getFileName(file)}-${file.size ?? 0}-${file.uri}";
}

function createAbortError(
message: string
): Error {
const error =
new Error(message);

error.name =
"AbortError";

return error;
}

function isAbortError(
error: unknown
): boolean {
return (
error instanceof Error &&
error.name ===
"AbortError"
);
}

export function useMediaUpload({
imageFiles,
video,
isOnline,
}: UseMediaUploadProps) {

const {
networkStatus,
connectionType,
} = useNetwork();

const [
uploadedMedia,
setUploadedMedia,
] = useState<UploadedMedia[]>([]);

const [
uploadStatus,
setUploadStatus,
] = useState<UploadStatus>(
"idle"
);

const [
uploadError,
setUploadError,
] = useState<Error | null>(
null
);

const [
fileProgress,
setFileProgress,
] = useState<
Record<string, number>

«({});»

const abortControllersRef =
useRef<
Set<AbortController>
>(new Set());

const uploadGenerationRef =
useRef(0);

const uploadPromiseRef =
useRef<
Promise<
UploadedMedia[]
> | null
>(null);

const uploadingRef =
useRef(false);

const getFilesToUpload =
useCallback(
(): NativeMediaFile[] => {

    if (
      isNativeMediaFile(
        video
      )
    ) {
      const type =
        getMediaType(video);

      if (
        type.startsWith(
          "video/"
        )
      ) {
        return [video];
      }
    }

    return imageFiles.filter(
      (
        item
      ): item is NativeMediaFile =>
        isNativeMediaFile(
          item
        )
    );
  },
  [
    video,
    imageFiles,
  ]
);

const getVideoQuality =
useCallback(() => {

  if (
    networkStatus === "poor" ||
    networkStatus === "slow"
  ) {
    return "720p" as const;
  }

  return "1080p" as const;

}, [
  networkStatus,
]);

const uploadSingleFile =
useCallback(
async (
originalFile: NativeMediaFile,
generation: number
): Promise<UploadedMedia> => {

    if (!isOnline) {
      throw new UploadNetworkError(
        "Network connection unavailable."
      );
    }

    if (
      generation !==
      uploadGenerationRef.current
    ) {
      throw createAbortError(
        "Media upload was cancelled."
      );
    }

    const controller =
      new AbortController();

    abortControllersRef.current.add(
      controller
    );

    const originalKey =
      getFileKey(
        originalFile
      );

    let compressedVideoKey:
      string | null = null;

    try {

      let fileToUpload:
        NativeMediaFile =
        originalFile;

      const mediaType =
        getMediaType(
          originalFile
        );

      /*
       * IMAGE COMPRESSION
       */
      if (
        mediaType.startsWith(
          "image/"
        )
      ) {

        setFileProgress(
          prev => ({
            ...prev,
            [originalKey]: 0,
          })
        );

        /*
         * compressImage must be RN-compatible.
         *
         * It should accept a NativeMediaFile/URI
         * and return another NativeMediaFile.
         */
        const compressedImage =
          await compressImage(
            originalFile as any,
            1.5
          );

        if (
          controller.signal
            .aborted
        ) {
          throw createAbortError(
            "Image compression cancelled."
          );
        }

        fileToUpload =
          compressedImage as NativeMediaFile;

        setFileProgress(
          prev => ({
            ...prev,
            [originalKey]: 20,
          })
        );
      }

      /*
       * VIDEO COMPRESSION
       */
      if (
        mediaType.startsWith(
          "video/"
        )
      ) {

        const targetQuality =
          getVideoQuality();

        compressedVideoKey =
          getCompressedVideoKey(
            originalFile as any,
            targetQuality
          );

        const cached =
          await getCompressedVideo(
            compressedVideoKey
          );

        if (cached) {

          console.log(
            "🎥 Using persisted compressed video:",
            {
              name:
                cached.name,
              size:
                cached.size
                  ? (
                      cached.size /
                      1024 /
                      1024
                    ).toFixed(2) +
                    " MB"
                  : "unknown",
              quality:
                targetQuality,
            }
          );

          fileToUpload =
            cached as NativeMediaFile;

        } else {

          console.log(
            "🎥 Compressing video:",
            {
              name:
                getFileName(
                  originalFile
                ),
              size:
                originalFile.size
                  ? (
                      originalFile.size /
                      1024 /
                      1024
                    ).toFixed(2) +
                    " MB"
                  : "unknown",
              quality:
                targetQuality,
            }
          );

          setFileProgress(
            prev => ({
              ...prev,
              [originalKey]: 0,
            })
          );

          const {
            compressVideo,
          } =
            await import(
              "@/utils/mediaUpload/videoCompressor"
            );

          const compressed =
            await compressVideo({
              file:
                originalFile as any,

              networkStatus,

              connectionType,

              signal:
                controller.signal,

              onProgress:
                percent => {

                  setFileProgress(
                    prev => ({
                      ...prev,

                      [originalKey]:
                        Math.round(
                          percent /
                            2
                        ),
                    })
                  );
                },
            });

          if (
            controller.signal
              .aborted
          ) {
            throw createAbortError(
              "Video compression cancelled."
            );
          }

          setFileProgress(
            prev => ({
              ...prev,
              [originalKey]: 50,
            })
          );

          await saveCompressedVideo(
            compressedVideoKey,
            compressed,
            originalFile as any,
            targetQuality
          );

          console.log(
            "💾 Compressed video persisted:",
            compressed.name
          );

          fileToUpload =
            compressed as NativeMediaFile;
        }
      }

      /*
       * UPLOAD
       *
       * uploadFile must use React Native
       * FormData/URI handling rather than
       * browser File APIs.
       */
      const uploaded =
        await uploadFile({
          file:
            fileToUpload as any,

          signal:
            controller.signal,

          onProgress:
            percent => {

              const progress =
                50 +
                Math.round(
                  percent / 2
                );

              setFileProgress(
                prev => ({
                  ...prev,

                  [originalKey]:
                    Math.min(
                      progress,
                      100
                    ),
                })
              );
            },
        });

      if (
        generation !==
        uploadGenerationRef.current
      ) {
        throw createAbortError(
          "Media upload was cancelled."
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

      setFileProgress(
        prev => ({
          ...prev,
          [originalKey]: 100,
        })
      );

      /*
       * Remove persisted compressed
       * video after successful upload.
       */
      if (
        compressedVideoKey &&
        mediaType.startsWith(
          "video/"
        )
      ) {

        await deleteCompressedVideo(
          compressedVideoKey
        );

        console.log(
          "🗑️ Persisted compressed video deleted after successful upload."
        );
      }

      return buildUploadedMedia(
        Array.isArray(
          uploaded.original_url
        )
          ? uploaded.original_url[0]
          : uploaded.original_url,

        String(
          uploaded.media_id
        ),

        originalFile as any,

        uploaded.thumbnail_url
      );

    } finally {

      abortControllersRef.current.delete(
        controller
      );
    }
  },
  [
    isOnline,
    networkStatus,
    connectionType,
    getVideoQuality,
  ]
);

const uploadSelectedMedia =
useCallback(
async (
files: NativeMediaFile[]
): Promise<
UploadedMedia[]
> => {

    const generation =
      ++uploadGenerationRef.current;

    if (!files.length) {
      return [];
    }

    if (!isOnline) {

      setUploadStatus(
        "paused"
      );

      return [];
    }

    setUploadStatus(
      "uploading"
    );

    setUploadError(
      null
    );

    setFileProgress({});

    const results:
      UploadedMedia[] = [];

    uploadingRef.current =
      true;

    try {

      for (
        let index = 0;
        index < files.length;
        index++
      ) {

        const file =
          files[index];

        if (!isOnline) {
          throw new UploadNetworkError(
            "Network connection lost."
          );
        }

        if (
          generation !==
          uploadGenerationRef.current
        ) {
          throw createAbortError(
            "Media upload was cancelled."
          );
        }

        const uploaded =
          await uploadSingleFile(
            file,
            generation
          );

        results.push(
          uploaded
        );

        setUploadedMedia(
          [...results]
        );
      }

      if (
        generation !==
        uploadGenerationRef.current
      ) {
        return [];
      }

      setUploadStatus(
        "success"
      );

      setUploadError(
        null
      );

      return results;

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

        setUploadStatus(
          "paused"
        );

        setUploadError(
          null
        );

        throw error;
      }

      if (
        isAbortError(error)
      ) {

        setUploadStatus(
          "paused"
        );

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

      setUploadStatus(
        "failed"
      );

      throw normalizedError;
    } finally {

      uploadingRef.current =
        false;
    }
  },
  [
    isOnline,
    uploadSingleFile,
  ]
);

const resumeUpload =
useCallback(
async (): Promise<
UploadedMedia[]
> => {

    const files =
      getFilesToUpload();

    if (!files.length) {
      return uploadedMedia;
    }

    if (!isOnline) {

      setUploadStatus(
        "paused"
      );

      return uploadedMedia;
    }

    uploadGenerationRef.current++;

    setUploadStatus(
      "uploading"
    );

    setUploadError(
      null
    );

    const promise =
      uploadSelectedMedia(
        files
      );

    uploadPromiseRef.current =
      promise;

    try {

      const media =
        await promise;

      setUploadedMedia(
        media
      );

      setUploadStatus(
        "success"
      );

      return media;

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

        setUploadStatus(
          "paused"
        );

        setUploadError(
          null
        );

        throw error;
      }

      setUploadStatus(
        "failed"
      );

      setUploadError(
        error instanceof Error
          ? error
          : new Error(
              "Media upload failed."
            )
      );

      throw error;

    } finally {

      if (
        uploadPromiseRef.current ===
        promise
      ) {
        uploadPromiseRef.current =
          null;
      }
    }
  },
  [
    getFilesToUpload,
    isOnline,
    uploadedMedia,
    uploadSelectedMedia,
  ]
);

/*

* AUTOMATIC VIDEO UPLOAD
  */
  useEffect(() => {

const videoFile =
  isNativeMediaFile(
    video
  ) &&
  getMediaType(video)
    .startsWith("video/")
    ? video
    : null;

if (!videoFile) {

  const hasImages =
    imageFiles.some(
      item =>
        isNativeMediaFile(
          item
        ) &&
        getMediaType(
          item
        ).startsWith(
          "image/"
        )
    );

  if (!hasImages) {
    setUploadStatus(
      "idle"
    );
  }

  return;
}

if (!isOnline) {

  setUploadStatus(
    "paused"
  );

  setUploadError(
    null
  );

  return;
}

if (
  uploadingRef.current
) {
  return;
}

let cancelled =
  false;

async function uploadVideo() {

  setUploadedMedia([]);

  setFileProgress({});

  setUploadError(
    null
  );

  setUploadStatus(
    "uploading"
  );

  let promise:
    Promise<
      UploadedMedia[]
    > | null = null;

  try {

    promise =
      uploadSelectedMedia(
        [videoFile!]
      );

    uploadPromiseRef.current =
      promise;

    const media =
      await promise;

    if (cancelled) {
      return;
    }

    setUploadedMedia(
      media
    );

    setUploadStatus(
      "success"
    );

  } catch (error) {

    if (cancelled) {
      return;
    }

    if (
      error instanceof
        UploadNetworkError ||
      (
        error instanceof Error &&
        error.name ===
          "UploadNetworkError"
      )
    ) {

      setUploadStatus(
        "paused"
      );

      return;
    }

    if (
      isAbortError(error)
    ) {

      setUploadStatus(
        "paused"
      );

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

    setUploadStatus(
      "failed"
    );

  } finally {

    if (
      promise &&
      uploadPromiseRef.current ===
        promise
    ) {
      uploadPromiseRef.current =
        null;
    }
  }
}

uploadVideo();

return () => {

  cancelled = true;

  uploadGenerationRef.current++;

  abortControllersRef.current.forEach(
    controller => {
      controller.abort();
    }
  );

  abortControllersRef.current.clear();

};

}, [
video,
isOnline,
uploadSelectedMedia,
]);

/*

* AUTOMATIC IMAGE UPLOAD
  */
  useEffect(() => {

const files =
  imageFiles.filter(
    (
      item
    ): item is NativeMediaFile =>
      isNativeMediaFile(
        item
      ) &&
      getMediaType(
        item
      ).startsWith(
        "image/"
      )
  );

if (!files.length) {

  if (
    !(
      isNativeMediaFile(
        video
      ) &&
      getMediaType(
        video
      ).startsWith(
        "video/"
      )
    )
  ) {
    setUploadStatus(
      "idle"
    );
  }

  return;
}

if (!isOnline) {

  setUploadStatus(
    "paused"
  );

  setUploadError(
    null
  );

  return;
}

if (
  uploadingRef.current
) {
  return;
}

let cancelled =
  false;

async function uploadImages() {

  setUploadedMedia([]);

  setFileProgress({});

  setUploadError(
    null
  );

  setUploadStatus(
    "uploading"
  );

  let promise:
    Promise<
      UploadedMedia[]
    > | null = null;

  try {

    promise =
      uploadSelectedMedia(
        files
      );

    uploadPromiseRef.current =
      promise;

    const media =
      await promise;

    if (cancelled) {
      return;
    }

    setUploadedMedia(
      media
    );

    setUploadStatus(
      "success"
    );

  } catch (error) {

    if (cancelled) {
      return;
    }

    if (
      error instanceof
        UploadNetworkError ||
      (
        error instanceof Error &&
        error.name ===
          "UploadNetworkError"
      )
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
      isAbortError(error)
    ) {

      setUploadStatus(
        "paused"
      );

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

    setUploadStatus(
      "failed"
    );

  } finally {

    if (
      promise &&
      uploadPromiseRef.current ===
        promise
    ) {
      uploadPromiseRef.current =
        null;
    }
  }
}

uploadImages();

return () => {

  cancelled = true;

  uploadGenerationRef.current++;

  abortControllersRef.current.forEach(
    controller => {
      controller.abort();
    }
  );

  abortControllersRef.current.clear();

};

}, [
imageFiles,
isOnline,
uploadSelectedMedia,
video,
]);

return {
uploadedMedia,

uploadStatus,

uploading:
  uploadStatus ===
  "uploading",

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