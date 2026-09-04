import {
  uploadChunkXHR,
} from "@/utils/mediaUpload/uploadChunkXHR";
import { uploadDebug } from "@/utils/mediaUpload/uploadDebug";

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

    void uploadDebug({
      event: "PART_UPLOAD_START",
      part_number: partNumber,
      data: {
        chunk_size: chunkSize,
      },
    });

    try {
      const etag =
        await uploadChunkXHR(
          url,
          chunk,
          signal,
          loaded => {
            onProgress?.(loaded);
          },
          partNumber,
          attempt + 1,
        );
  
      void uploadDebug({
        event: "PART_UPLOAD_SUCCESS",
        part_number: partNumber,
        data: {
          start,
          end: safeEnd,
          chunk_size: chunkSize,
        },
      });
  
      if (!etag) {
        throw new Error(
          "R2 did not return an ETag."
        );
      }

      return etag;

    } catch (error) {

      void uploadDebug({
        event: "PART_UPLOAD_FAILED",
        level: "error",
        part_number: partNumber,
        data: {
          attempt,
          error:
            error instanceof Error
              ? error.message
              : String(error),
        },
      });

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