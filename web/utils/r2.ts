// utils/r2.ts

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

type UploadedPart = {
  part_number: number;
  etag: string;
};

type ProfileMediaType =
  | "avatar"
  | "cover";

const MAX_RETRIES = 3;
const MAX_CONCURRENT_UPLOADS = 3;

export async function uploadProfileMedia({
  file,
  mediaType,
  onProgress,
  signal,
}: {
  file: File;
  mediaType: ProfileMediaType;
  onProgress?: (
    percent: number
  ) => void;
  signal?: AbortSignal;
}): Promise<CompleteMediaResponse> {

  if (!file) {
    throw new Error(
      "No file provided for profile upload."
    );
  }

  if (signal?.aborted) {
    throw new DOMException(
      "Profile upload was cancelled.",
      "AbortError"
    );
  }

  const init =
    await apiRequest(
      "api/media/profile/init/",
      {
        method: "POST",

        data: {
          media_type:
            mediaType,
          content_type:
            file.type,
          size:
            file.size,
        },
      }
    );

  if (!init?.upload_url) {
    throw new Error(
      "Profile upload initialization failed."
    );
  }
  
  void uploadDebug({
    event: "[PROFILE R2] INIT SUCCESS",
    media_id: init.media_id,
    data: {
      mediaType,
      objectKey: init.object_key,
      fileSize: file.size,
      fileType: file.type,
    },
  });

  await uploadToPresignedUrl(
    init.upload_url,
    file,
    onProgress,
    signal
  );

  if (signal?.aborted) {
    throw new DOMException(
      "Profile upload was cancelled.",
      "AbortError"
    );
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
    event: "[PROFILE R2] COMPLETE SUCCESS",
    media_id: completed.media_id,
    data: {
      objectKey: completed.object_key,
      originalUrl: completed.original_url,
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
          new DOMException(
            "Media upload was cancelled.",
            "AbortError"
          )
        );
        return;
      }

      const timeout =
        window.setTimeout(
          () => {
            signal?.removeEventListener(
              "abort",
              handleAbort
            );
            resolve();
          },
          ms
        );

      const handleAbort = () => {
        window.clearTimeout(
          timeout
        );

        reject(
          new DOMException(
            "Media upload was cancelled.",
            "AbortError"
          )
        );
      };

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
  onProgress?: (percent: number) => void,
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
    throw new DOMException(
      "Media upload was cancelled.",
      "AbortError"
    );
  }

  let lastError: unknown = null;

  for (
    let attempt = 1;
    attempt <= MAX_RETRIES;
    attempt++
  ) {

    if (signal?.aborted) {
      throw new DOMException(
        "Media upload was cancelled.",
        "AbortError"
      );
    }

    try {

      void uploadDebug({
        event: "[PROFILE R2] UPLOAD ATTEMPT",
        data: {
          attempt,
          maxRetries: MAX_RETRIES,
          fileSize: file.size,
          fileType: file.type,
        },
      });
  
      await uploadWithXHR(
        uploadUrl,
        file,
        onProgress,
        signal
      );

      return;

    } catch (error) {

      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        throw error;
      }

      lastError = error;

      void uploadDebug({
        event: `[PROFILE R2] ATTEMPT ${attempt}/${MAX_RETRIES} FAILED`,
        level: "warn",
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
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
): Promise<void> {

  return new Promise(
    (
      resolve,
      reject
    ) => {

      const xhr =
        new XMLHttpRequest();

      let settled = false;
      let cancelledBySignal = false;

      void uploadDebug({
        event: "[PROFILE R2] BEFORE OPEN",
        data: {
          origin: window.location.origin,

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

          fileSize:
            file.size,

          fileType:
            file.type,
        }
      });

      const cleanup = () => {

        signal?.removeEventListener(
          "abort",
          handleAbort
        );
  
        xhr.upload.onprogress = null;
        xhr.onload = null;
        xhr.onerror = null;
        xhr.onabort = null;
        xhr.ontimeout = null;
      };

      const finishResolve = () => {

        if (settled) {
          return;
        }

        settled = true;
        cleanup();
        resolve();
      };

      const finishReject = (
        error: unknown
      ) => {

        if (settled) {
          return;
        }

        settled = true;
        cleanup();
        reject(error);
      };

      const handleAbort = () => {

        if (settled) {
          return;
        }
  
        cancelledBySignal = true;

        void uploadDebug({
          event: "[PROFILE R2] SIGNAL ABORT",
          data: {
            readyState:
              xhr.readyState,
            status:
              xhr.status,
          },
        });
  
        xhr.abort();

        finishReject(
          new DOMException(
            "Media upload was cancelled.",
            "AbortError"
          )
        );
      };

      xhr.upload.onprogress = (
        event
      ) => {

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

      xhr.onload = () => {

        void uploadDebug({
          event: "[PROFILE R2] LOAD",
          data: {
            status: xhr.status,
            statusText: xhr.statusText,
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

      xhr.onerror = () => {

        void uploadDebug({
          event: "[PROFILE R2] NETWORK ERROR",
          level: "error",
          data: {
            status:
              xhr.status,
            statusText:
              xhr.statusText,
            readyState:
              xhr.readyState,
            responseURL:
              xhr.responseURL,
            withCredentials:
              xhr.withCredentials,
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

      xhr.onabort = () => {

        void uploadDebug({
          event: "[PROFILE R2] ABORT",
          data: {
            status: xhr.status,
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

        if (!settled) {

          finishReject(
            new DOMException(
              "Media upload was cancelled.",
              "AbortError"
            )
          );
        }
      };

      xhr.ontimeout = () => {

        void uploadDebug({
          event: "[PROFILE R2] TIMEOUT",
          data: {
            status: xhr.status,
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

      xhr.onloadend = () => {

        void uploadDebug({
          event: "[PROFILE R2] LOAD END",
          data: {
            status: xhr.status,
            statusText: xhr.statusText,
            readyState:
              xhr.readyState,
            responseURL:
              xhr.responseURL,
          },
        });
      };

      void uploadDebug({
        event: "[PROFILE R2] BEFORE SEND",
        data: {
          size:
            file.size,
          type:
            file.type,
          readyState:
            xhr.readyState,
          withCredentials:
            xhr.withCredentials,
        },
      });

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

        void uploadDebug({
          event: "[PROFILE R2] OPEN SUCCESS",
          data: {
            readyState:
              xhr.readyState,
            method:
              "PUT",
          },
        });

      } catch (error) {

        void uploadDebug({
          event: "[PROFILE R2] OPEN FAILED",
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

        xhr.send(
          file
        );

        void uploadDebug({
          event: "[PROFILE R2] SEND SUCCESS",
          data: {
            readyState:
              xhr.readyState,
          },
        });

      } catch (error) {

        void uploadDebug({
          event: "[PROFILE R2] SEND FAILED",
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