// utils/r2.ts

import { apiRequest } from "@/utils/api";

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

      const cleanup = () => {

        signal?.removeEventListener(
          "abort",
          handleAbort
        );
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

        finishReject(
          new Error(
            "Network error while uploading profile media."
          )
        );
      };

      xhr.onabort = () => {

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

        finishReject(
          new Error(
            "Profile media upload timed out."
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

      xhr.open(
        "PUT",
        uploadUrl
      );

      /*
       * IMPORTANT:
       *
       * Do not add Authorization,
       * Content-Type overrides,
       * or custom headers unless
       * your backend explicitly included
       * them when generating the presigned URL.
       *
       * The presigned URL determines what
       * R2/S3 will accept.
       */

      xhr.send(
        file
      );
    }
  );
}