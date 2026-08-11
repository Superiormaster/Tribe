import {
  uploadChunkXHR,
} from "@/utils/mediaUpload/uploadChunkXHR";

const MAX_RETRIES = 3;

const RETRY_BASE_DELAY = 1000;

export type UploadPartOptions = {
  url: string;
  file: File;
  start: number;
  end: number;
  partNumber: number;
  uploadKey: string;
  signal?: AbortSignal;
  onProgress?: (
    loaded: number
  ) => void;
};

/**
 * Upload one multipart part.
 *
 * Flow:
 *
 * uploadPart()
 *      ↓
 * uploadChunkXHR()
 *      ↓
 * R2
 *      ↓
 * ETag
 *      ↓
 * saveUploadedPart()
 *      ↓
 * IndexedDB
 *
 * A part is NEVER saved to IndexedDB
 * until R2 confirms the upload.
 */
export async function uploadPart({
  url,
  file,
  start,
  end,
  partNumber,
  uploadKey,
  signal,
  onProgress,
}: UploadPartOptions): Promise<string> {
  
  if (!(file instanceof File)) {
    throw new Error(
      `No file provided for part ${partNumber}.`
    );
  }

  if (!url) {
    throw new Error(
      `No upload URL provided for part ${partNumber}.`
    );
  }

  if (
    !Number.isInteger(partNumber) ||
    partNumber < 1
  ) {
    throw new Error(
      `Invalid part number: ${partNumber}`
    );
  }

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start < 0 ||
    end <= start ||
    start >= file.size
  ) {
    throw new Error(
      `Invalid upload range: ${start}-${end} for file size ${file.size}`
    );
  }

  if (signal?.aborted) {

    throw new DOMException(
      "Upload cancelled.",
      "AbortError"
    );
  }

  const safeEnd =
    Math.min(end, file.size);
  
  const chunk =
    file.slice(
      start,
      safeEnd
    );

  const chunkSize =
    chunk.size;

  if (chunkSize <= 0) {
    throw new Error(
      `Empty upload chunk for part ${partNumber}.`
    );
  }
  
  let attempt = 0;

  while (attempt <= MAX_RETRIES) {

    if (signal?.aborted) {

      throw new DOMException(
        "Upload cancelled.",
        "AbortError"
      );
    }

    try {
      const etag =
        await uploadChunkXHR(
          url,
          chunk,
          signal,
          loaded => {
            onProgress?.(loaded);
          }
        );
  
      if (!etag) {
        throw new Error(
          "R2 did not return an ETag."
        );
      }

      return etag;

    } catch (error) {

      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {

        throw error;
      }

      attempt++;

      if (attempt > MAX_RETRIES) {
        throw (
          error instanceof Error
            ? error
            : new Error(
                `Part ${partNumber} upload failed.`
              )
        );
      }

      const delay =
        RETRY_BASE_DELAY *
        Math.pow(
          2,
          attempt - 1
        );

      await sleep(
        delay,
        signal
      );
    }
  }
  
  throw new Error(
    `Part ${partNumber} upload failed.`
  );
}

function sleep(
  ms: number,
  signal?: AbortSignal
): Promise<void> {
  return new Promise(
    (resolve, reject) => {
      let timeout:
        ReturnType<typeof setTimeout>;

      const cleanup = () => {
        signal?.removeEventListener(
          "abort",
          handleAbort
        );

        clearTimeout(timeout);
      };

      const handleAbort = () => {
        cleanup();

        reject(
          new DOMException(
            "Upload cancelled.",
            "AbortError"
          )
        );
      };

      if (signal?.aborted) {
        handleAbort();
        return;
      }

      timeout = setTimeout(
        () => {
          cleanup();
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