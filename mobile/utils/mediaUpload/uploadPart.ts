import {
  uploadChunkXHR,
} from "@/utils/mediaUpload/uploadChunkXHR";

import {
  uploadDebug,
} from "@/utils/mediaUpload/uploadDebug";

import {
  File,
} from "expo-file-system";

const MAX_RETRIES = 3;

const RETRY_BASE_DELAY = 1000;

export type NativeUploadFile = {
  uri: string;
  name: string;
  type: string;
  size: number;
};

export type UploadPartOptions = {
  url: string;
  file: NativeUploadFile;
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

  if (
    !file ||
    typeof file.uri !== "string" ||
    !file.uri
  ) {
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

  throwIfAborted(signal);

  const safeEnd =
    Math.min(
      end,
      file.size
    );

  const chunkSize =
    safeEnd - start;

  if (chunkSize <= 0) {
    throw new Error(
      `Empty upload chunk for part ${partNumber}.`
    );
  }

  const chunkFile =
    await createChunkFile(
      file.uri,
      start,
      safeEnd,
      partNumber,
      uploadKey,
      signal
    );

  let attempt = 0;

  try {

    while (
      attempt <= MAX_RETRIES
    ) {

      throwIfAborted(signal);

      void uploadDebug({
        event:
          "PART_UPLOAD_START",

        part_number:
          partNumber,

        data: {
          chunk_size:
            chunkSize,
        },
      });

      try {

        const etag =
          await uploadChunkXHR(
            url,
            chunkFile.uri,
            signal,
            loaded => {
              onProgress?.(
                loaded
              );
            },
            partNumber,
            attempt + 1,
          );

        void uploadDebug({
          event:
            "PART_UPLOAD_SUCCESS",

          part_number:
            partNumber,

          data: {
            start,
            end: safeEnd,
            chunk_size:
              chunkSize,
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
          event:
            "PART_UPLOAD_FAILED",

          level:
            "error",

          part_number:
            partNumber,

          data: {
            attempt,

            error:
              error instanceof Error
                ? error.message
                : String(error),
          },
        });

        if (
          isAbortError(error)
        ) {
          throw error;
        }

        attempt++;

        if (
          attempt >
          MAX_RETRIES
        ) {
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

  } finally {

    /*
     * Delete the temporary chunk file.
     */
    try {
      if (
        chunkFile.exists
      ) {
        chunkFile.delete();
      }
    } catch {
      // Ignore cleanup failures.
    }
  }
}

async function createChunkFile(
  sourceUri: string,
  start: number,
  end: number,
  partNumber: number,
  uploadKey: string,
  signal?: AbortSignal,
): Promise<File> {

  throwIfAborted(signal);

  const source =
    new File(
      sourceUri
    );

  if (
    !source.exists
  ) {
    throw new Error(
      "Source file does not exist."
    );
  }

  const sourceBytes =
    await source.bytes();

  throwIfAborted(signal);

  const safeStart =
    Math.max(
      0,
      Math.floor(start)
    );

  const safeEnd =
    Math.min(
      sourceBytes.length,
      Math.floor(end)
    );

  if (
    safeEnd <= safeStart
  ) {
    throw new Error(
      `Unable to create chunk ${partNumber}.`
    );
  }

  const chunkBytes =
    sourceBytes.slice(
      safeStart,
      safeEnd
    );

  throwIfAborted(signal);

  const cacheDirectory =
    File.cacheDirectory;

  if (!cacheDirectory) {
    throw new Error(
      "Native cache directory is unavailable."
    );
  }

  const safeKey =
    uploadKey.replace(
      /[^a-zA-Z0-9_-]/g,
      "_"
    );

  const chunkName =
    `upload-${safeKey}-part-${partNumber}-${Date.now()}.chunk`;

  const chunkFile =
    new File(
      cacheDirectory,
      chunkName
    );

  chunkFile.create({
    overwrite:
      true,
  });

  chunkFile.write(
    chunkBytes
  );

  throwIfAborted(signal);

  return chunkFile;
}

function throwIfAborted(
  signal?: AbortSignal
) {
  if (
    signal?.aborted
  ) {
    throw createAbortError();
  }
}

function createAbortError(): Error {
  const error =
    new Error(
      "Upload cancelled."
    );

  error.name =
    "AbortError";

  return error;
}

function isAbortError(
  error: unknown
): boolean {

  return (
    error instanceof Error &&
    error.name === "AbortError"
  );
}

function sleep(
  ms: number,
  signal?: AbortSignal
): Promise<void> {

  return new Promise(
    (resolve, reject) => {

      let timeout:
        ReturnType<
          typeof setTimeout
        >;

      const cleanup = () => {

        signal?.removeEventListener(
          "abort",
          handleAbort
        );

        clearTimeout(
          timeout
        );
      };

      const handleAbort = () => {

        cleanup();

        reject(
          createAbortError()
        );
      };

      if (
        signal?.aborted
      ) {
        handleAbort();
        return;
      }

      timeout =
        setTimeout(
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