// utils/mediaUpload/uploadFile.ts

import { uploadMedia } from "./uploadMedia";
import { uploadMediaResumable } from "./uploadMediaResumable";

const DIRECT_UPLOAD_MAX = 8 * 1024 * 1024; // 8 MB

export type NativeUploadFile = {
  uri: string;
  name: string;
  type: string;
  size: number;
  lastModified?: number;
};

function createAbortError(): Error {
  const error = new Error("Upload cancelled.");
  error.name = "AbortError";
  return error;
}

export async function uploadFile({
  file,
  duration,
  onProgress,
  signal,
}: {
  file: NativeUploadFile;
  duration?: number | null;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}) {
  if (!file) {
    throw new Error(
      "No file provided."
    );
  }

  if (
    !file.uri ||
    !file.name ||
    !file.type ||
    !file.size ||
    file.size <= 0
  ) {
    throw new Error(
      "Invalid file provided."
    );
  }

  if (signal?.aborted) {
    throw createAbortError();
  }

  const isVideo =
    file.type.startsWith("video/");

  const isAudio =
    file.type.startsWith("audio/");

  const isLarge =
    file.size > DIRECT_UPLOAD_MAX;

  const useMultipart =
    isVideo ||
    isAudio ||
    isLarge;

  console.log(
    "🚦 [UPLOAD ROUTER]",
    {
      name: file.name,
      type: file.type,
      size: file.size,
      sizeMB:
        (
          file.size /
          1024 /
          1024
        ).toFixed(2),

      uri: file.uri,

      isVideo,
      isAudio,
      isLarge,

      thresholdMB: 8,

      strategy:
        useMultipart
          ? "MULTIPART"
          : "DIRECT",
    }
  );

  if (useMultipart) {
    console.log(
      "🧩 [UPLOAD ROUTER] Using multipart upload"
    );

    return uploadMediaResumable({
      file,
      duration,
      onProgress,
      signal,
    });
  }

  console.log(
    "⚡ [UPLOAD ROUTER] Using direct upload"
  );

  return uploadMedia(
    file,
    onProgress
  );
}