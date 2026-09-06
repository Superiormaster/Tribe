// utils/r2.ts

import { File } from "expo-file-system";
import { apiRequest } from "@/utils/api";
import { uploadDebug } from "@/utils/mediaUpload/uploadDebug";

type CompleteMediaResponse = {
  success: boolean;
  id?: number;
  media_id: string;
  object_key: string;
  original_url: string;
  thumbnail_url?: string | null;
  media_type: string;
  content_type: string;
  size: number;
  status: string;
};

type ProfileMediaType =
  | "avatar"
  | "cover";

export type NativeMediaFile = {
  uri: string;
  name?: string;
  type?: string;
  size?: number;
};

const MAX_RETRIES = 3;

/**
 * Convert an Expo/native file into the information
 * required by the upload API.
 */
function getNativeFile(file: NativeMediaFile): File {
  if (!file?.uri) {
    throw new Error(
      "No file URI provided for profile upload."
    );
  }

  return new File(file.uri);
}

/**
 * Safely create an AbortError without depending on DOMException.
 */
function createAbortError(
  message = "Profile upload was cancelled."
): Error {
  const error = new Error(message);
  error.name = "AbortError";
  return error;
}

export async function uploadProfileMedia({
  file,
  mediaType,
  onProgress,
  signal,
}: {
  file: NativeMediaFile;
  mediaType: ProfileMediaType;
  onProgress?: (
    percent: number
  ) => void;
  signal?: AbortSignal;
}): Promise<CompleteMediaResponse> {

  if (!file?.uri) {
    throw new Error(
      "No file provided for profile upload."
    );
  }

  if (signal?.aborted) {
    throw createAbortError();
  }

  const nativeFile =
    getNativeFile(file);

  const fileSize =
    file.size ??
    nativeFile.size ??
    0;

  const fileType =
    file.type ||
    nativeFile.type ||
    "application/octet-stream";

  const init =
    await apiRequest(
      "api/media/profile/init/",
      {
        method: "POST",

        data: {
          media_type:
            mediaType,

          content_type:
            fileType,

          size:
            fileSize,
        },
      }
    );

  if (!init?.upload_url) {
    throw new Error(
      "Profile upload initialization failed."
    );
  }

  void uploadDebug({
    event:
      "[PROFILE R2] INIT SUCCESS",

    media_id:
      init.media_id,

    data: {
      mediaType,

      objectKey:
        init.object_key,

      fileSize,

      fileType,

      uri:
        file.uri,
    },
  });

  await uploadToPresignedUrl(
    init.upload_url,
    nativeFile,
    fileSize,
    fileType,
    onProgress,
    signal
  );

  if (signal?.aborted) {
    throw createAbortError();
  }

  const completed =
    (
      await apiRequest(
        "api/media/profile/complete/",
        {
          method: "POST",

          data: {
            media_type:
              mediaType,

            object_key:
              init.object_key,

            media_id:
              init.media_id,
          },
        }
      )
    ) as CompleteMediaResponse;

  if (!completed?.success) {
    throw new Error(
      "Profile media upload could not be completed."
    );
  }

  if (!completed?.original_url) {
    throw new Error(
      "Profile media upload completed but no original URL was returned."
    );
  }

  void uploadDebug({
    event:
      "[PROFILE R2] COMPLETE SUCCESS",

    media_id:
      completed.media_id,

    data: {
      objectKey:
        completed.object_key,

      originalUrl:
        completed.original_url,
    },
  });

  return completed;
}

function sleep(
  ms: number,
  signal?: AbortSignal,
): Promise<void> {

  return new Promise(
    (
      resolve,
      reject
    ) => {

      if (signal?.aborted) {
        reject(
          createAbortError()
        );

        return;
      }

      let timeout:
        ReturnType<typeof setTimeout>;

      const handleAbort =
        () => {

          clearTimeout(
            timeout
          );

          signal?.removeEventListener(
            "abort",
            handleAbort
          );

          reject(
            createAbortError()
          );
        };

      timeout =
        setTimeout(
          () => {

            signal?.removeEventListener(
              "abort",
              handleAbort
            );

            resolve();
          },
          ms
        );

      signal?.addEventListener(
        "abort",
        handleAbort,
        {
          once: true,
        }
      );
    }
  );
}

async function uploadToPresignedUrl(
  uploadUrl: string,
  file: File,
  fileSize: number,
  fileType: string,
  onProgress?: (
    percent: number
  ) => void,
  signal?: AbortSignal,
): Promise<void> {

  if (!uploadUrl) {
    throw new Error(
      "No presigned upload URL provided."
    );
  }

  if (!file) {
    throw new Error(
      "No file provided."
    );
  }

  if (signal?.aborted) {
    throw createAbortError();
  }

  let lastError:
    unknown = null;

  for (
    let attempt = 1;
    attempt <= MAX_RETRIES;
    attempt++
  ) {

    if (signal?.aborted) {
      throw createAbortError();
    }

    try {

      void uploadDebug({
        event:
          "[PROFILE R2] UPLOAD ATTEMPT",

        data: {
          attempt,

          maxRetries:
            MAX_RETRIES,

          fileSize,

          fileType,
        },
      });

      await uploadWithXHR(
        uploadUrl,
        file,
        fileSize,
        fileType,
        onProgress,
        signal
      );

      return;

    } catch (error) {

      if (
        error instanceof Error &&
        error.name === "AbortError"
      ) {
        throw error;
      }

      lastError =
        error;

      void uploadDebug({
        event:
          `[PROFILE R2] ATTEMPT ${attempt}/${MAX_RETRIES} FAILED`,

        level:
          "warn",

        data: {
          error:
            error instanceof Error
              ? error.message
              : String(error),
        },
      });

      console.warn(
        `[PROFILE UPLOAD] Attempt ${attempt}/${MAX_RETRIES} failed:`,
        error
      );

      if (
        attempt >= MAX_RETRIES
      ) {
        break;
      }

      await sleep(
        1000 *
          Math.pow(
            2,
            attempt - 1
          ),
        signal
      );
    }
  }

  throw (
    lastError instanceof Error
      ? lastError
      : new Error(
          "Profile media upload failed."
        )
  );
}

function uploadWithXHR(
  uploadUrl: string,
  file: File,
  fileSize: number,
  fileType: string,
  onProgress?: (
    percent: number
  ) => void,
  signal?: AbortSignal,
): Promise<void> {

  return new Promise(
    async (
      resolve,
      reject
    ) => {

      const xhr =
        new XMLHttpRequest();

      let settled =
        false;

      let cancelledBySignal =
        false;

      const cleanup =
        () => {

          signal?.removeEventListener(
            "abort",
            handleAbort
          );

          xhr.upload.onprogress =
            null;

          xhr.onload =
            null;

          xhr.onerror =
            null;

          xhr.onabort =
            null;

          xhr.ontimeout =
            null;

          xhr.onloadend =
            null;
        };

      const finishResolve =
        () => {

          if (settled) {
            return;
          }

          settled =
            true;

          cleanup();

          resolve();
        };

      const finishReject =
        (
          error: unknown
        ) => {

          if (settled) {
            return;
          }

          settled =
            true;

          cleanup();

          reject(error);
        };

      const handleAbort =
        () => {

          if (settled) {
            return;
          }

          cancelledBySignal =
            true;

          void uploadDebug({
            event:
              "[PROFILE R2] SIGNAL ABORT",

            data: {
              readyState:
                xhr.readyState,

              status:
                xhr.status,
            },
          });

          try {
            xhr.abort();
          } catch {
            // Ignore abort errors.
          }

          finishReject(
            createAbortError()
          );
        };

      void uploadDebug({
        event:
          "[PROFILE R2] BEFORE OPEN",

        data: {
          urlHost:
            (() => {
              try {
                return new URL(
                  uploadUrl
                ).host;
              } catch {
                return "INVALID_URL";
              }
            })(),

          urlProtocol:
            (() => {
              try {
                return new URL(
                  uploadUrl
                ).protocol;
              } catch {
                return "INVALID_URL";
              }
            })(),

          fileSize,

          fileType,
        },
      });

      xhr.upload.onprogress =
        (event) => {

          if (
            settled ||
            !event.lengthComputable
          ) {
            return;
          }

          const percent =
            Math.min(
              99,
              Math.round(
                (
                  event.loaded /
                  event.total
                ) *
                  100
              )
            );

          onProgress?.(
            percent
          );
        };

      xhr.onload =
        () => {

          void uploadDebug({
            event:
              "[PROFILE R2] LOAD",

            data: {
              status:
                xhr.status,

              statusText:
                xhr.statusText,

              readyState:
                xhr.readyState,

              responseURL:
                xhr.responseURL,

              etag:
                xhr.getResponseHeader(
                  "ETag"
                ),
            },
          });

          if (
            xhr.status >= 200 &&
            xhr.status < 300
          ) {

            onProgress?.(
              100
            );

            finishResolve();

            return;
          }

          finishReject(
            new Error(
              `Presigned upload failed with HTTP ${xhr.status}.`
            )
          );
        };

      xhr.onerror =
        () => {

          void uploadDebug({
            event:
              "[PROFILE R2] NETWORK ERROR",

            level:
              "error",

            data: {
              status:
                xhr.status,

              statusText:
                xhr.statusText,

              readyState:
                xhr.readyState,

              responseURL:
                xhr.responseURL,

              cancelledBySignal,
            },
          });

          if (
            cancelledBySignal
          ) {
            return;
          }

          finishReject(
            new Error(
              "Network error while uploading profile media."
            )
          );
        };

      xhr.onabort =
        () => {

          void uploadDebug({
            event:
              "[PROFILE R2] ABORT",

            data: {
              status:
                xhr.status,

              readyState:
                xhr.readyState,

              cancelledBySignal,
            },
          });

          if (
            cancelledBySignal
          ) {
            return;
          }

          finishReject(
            createAbortError()
          );
        };

      xhr.ontimeout =
        () => {

          void uploadDebug({
            event:
              "[PROFILE R2] TIMEOUT",

            data: {
              status:
                xhr.status,

              readyState:
                xhr.readyState,
            },
          });

          finishReject(
            new Error(
              "Profile media upload timed out."
            )
          );
        };

      xhr.onloadend =
        () => {

          void uploadDebug({
            event:
              "[PROFILE R2] LOAD END",

            data: {
              status:
                xhr.status,

              statusText:
                xhr.statusText,

              readyState:
                xhr.readyState,

              responseURL:
                xhr.responseURL,
            },
          });
        };

      signal?.addEventListener(
        "abort",
        handleAbort,
        {
          once: true,
        }
      );

      try {

        xhr.open(
          "PUT",
          uploadUrl,
          true
        );

        // R2 presigned URLs normally expect
        // the exact content type used during initialization.
        if (fileType) {
          xhr.setRequestHeader(
            "Content-Type",
            fileType
          );
        }

        void uploadDebug({
          event:
            "[PROFILE R2] OPEN SUCCESS",

          data: {
            readyState:
              xhr.readyState,

            method:
              "PUT",
          },
        });

      } catch (error) {

        void uploadDebug({
          event:
            "[PROFILE R2] OPEN FAILED",

          data: {
            error:
              error instanceof Error
                ? error.message
                : String(error),
          },
        });

        finishReject(
          error instanceof Error
            ? error
            : new Error(
                "Failed to initialize profile upload."
              )
        );

        return;
      }

      try {

        /**
         * Expo's File implements Blob and exposes
         * arrayBuffer(), so we can send the native
         * file contents without using browser File.
         */
        const arrayBuffer =
          await file.arrayBuffer();

        if (signal?.aborted) {
          finishReject(
            createAbortError()
          );

          return;
        }

        void uploadDebug({
          event:
            "[PROFILE R2] BEFORE SEND",

          data: {
            size:
              fileSize,

            type:
              fileType,

            byteLength:
              arrayBuffer.byteLength,

            readyState:
              xhr.readyState,
          },
        });

        xhr.send(
          arrayBuffer
        );

        void uploadDebug({
          event:
            "[PROFILE R2] SEND SUCCESS",

          data: {
            readyState:
              xhr.readyState,
          },
        });

      } catch (error) {

        void uploadDebug({
          event:
            "[PROFILE R2] SEND FAILED",

          data: {
            error:
              error instanceof Error
                ? error.message
                : String(error),
          },
        });

        finishReject(
          error instanceof Error
            ? error
            : new Error(
                "Failed to send profile media upload."
              )
        );
      }
    }
  );
}