"use client";

import {
  FFmpeg,
} from "@ffmpeg/ffmpeg";

import {
  fetchFile,
  toBlobURL,
} from "@ffmpeg/util";

import type {
  NetworkStatus,
  ConnectionType,
} from "@/components/networkConnection/NetworkContext";

export type VideoCompressionQuality =
  | "720p"
  | "1080p";

interface CompressVideoOptions {
  file: File;
  networkStatus: NetworkStatus;
  connectionType: ConnectionType;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

let ffmpeg: FFmpeg | null = null;

let ffmpegLoading:
  Promise<FFmpeg> | null = null;


function throwIfAborted(
  signal?: AbortSignal
) {
  if (signal?.aborted) {
    throw new DOMException(
      "Video compression cancelled.",
      "AbortError"
    );
  }
}

export function getVideoQuality(
  networkStatus: NetworkStatus,
  connectionType: ConnectionType
): VideoCompressionQuality {

  if (
    networkStatus === "poor" ||
    networkStatus === "slow"
  ) {
    return "720p";
  }

  if (
    networkStatus === "good"
  ) {
    return "1080p";
  }

  if (
    connectionType === "cellular"
  ) {
    return "720p";
  }

  return "720p";
}

async function loadFFmpeg(
  signal?: AbortSignal
): Promise<FFmpeg> {

  if (
    typeof window === "undefined"
  ) {
    throw new Error(
      "FFmpeg can only run in the browser."
    );
  }

  if (
    ffmpeg?.loaded
  ) {
    return ffmpeg;
  }

  if (
    ffmpegLoading
  ) {
    return ffmpegLoading;
  }

  ffmpegLoading =
    (async () => {

      throwIfAborted(signal);

      const instance =
        new FFmpeg();

      const baseURL =
        "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd";

      await instance.load({

        coreURL:
          await toBlobURL(
            `${baseURL}/ffmpeg-core.js`,
            "text/javascript"
          ),

        wasmURL:
          await toBlobURL(
            `${baseURL}/ffmpeg-core.wasm`,
            "application/wasm"
          ),
      });

      throwIfAborted(signal);

      ffmpeg =
        instance;

      return instance;
    })();

  try {

    return await ffmpegLoading;

  } finally {

    ffmpegLoading = null;
  }
}

export async function compressVideo({
  file,
  networkStatus,
  connectionType,
  onProgress,
  signal,
}: CompressVideoOptions): Promise<File> {

  if (
    typeof window === "undefined"
  ) {
    throw new Error(
      "Video compression is browser-only."
    );
  }

  if (
    !(file instanceof File)
  ) {
    throw new Error(
      "Invalid video file."
    );
  }

  if (
    !file.type.startsWith("video/")
  ) {
    throw new Error(
      "The selected file is not a video."
    );
  }

  throwIfAborted(signal);

  const quality =
    getVideoQuality(
      networkStatus,
      connectionType
    );

  const is720p =
    quality === "720p";

  const timestamp =
    Date.now();

  const inputName =
    `input-${timestamp}.${getExtension(file)}`;

  const outputName =
    `output-${timestamp}.mp4`;

  onProgress?.(0);

  const encoder =
    await loadFFmpeg(signal);

  throwIfAborted(signal);

  const progressHandler =
    ({
      progress,
    }: {
      progress: number;
      time: number;
    }) => {

      const percent =
        Math.min(
          99,
          Math.max(
            0,
            Math.round(
              progress * 100
            )
          )
        );

      onProgress?.(
        percent
      );
    };

  encoder.on(
    "progress",
    progressHandler
  );

  try {

    await encoder.writeFile(
      inputName,
      await fetchFile(file)
    );

    throwIfAborted(signal);

    const scale =
      is720p
        ? "scale=1280:720:force_original_aspect_ratio=decrease"
        : "scale=1920:1080:force_original_aspect_ratio=decrease";

    await encoder.exec([

      "-i",
      inputName,

      "-vf",
      scale,

      "-c:v",
      "libx264",

      "-preset",
      "veryfast",

      "-crf",
      is720p
        ? "28"
        : "26",

      "-maxrate",
      is720p
        ? "2500k"
        : "5000k",

      "-bufsize",
      is720p
        ? "5000k"
        : "10000k",

      "-c:a",
      "aac",

      "-b:a",
      is720p
        ? "96k"
        : "128k",

      "-movflags",
      "+faststart",

      outputName,
    ]);

    throwIfAborted(signal);

    const output =
      await encoder.readFile(
        outputName
      );

    console.log(
      "🎥 [FFMPEG] Output:",
      {
        type:
          typeof output,
    
        constructor:
          output?.constructor?.name,
    
        length:
          typeof output === "string"
            ? output.length
            : output?.length,
    
        byteLength:
          output instanceof Uint8Array
            ? output.byteLength
            : undefined,
      }
    );

    throwIfAborted(signal);

    const outputBytes =
      typeof output === "string"
        ? new TextEncoder().encode(output)
        : output;
    
    const outputBuffer =
      new ArrayBuffer(
        outputBytes.byteLength
      );
    
    new Uint8Array(
      outputBuffer
    ).set(outputBytes);
    
    const outputBlob =
      new Blob(
        [outputBuffer],
        {
          type: "video/mp4",
        }
      );
    
    console.log(
      "🎥 [FFMPEG] Output blob:",
      {
        size:
          outputBlob.size,
    
        type:
          outputBlob.type,
      }
    );
    
    if (outputBlob.size <= 0) {
      throw new Error(
        "FFmpeg produced an empty video."
      );
    }

    if (
      outputBlob.size >=
      file.size
    ) {

      onProgress?.(100);

      return file;
    }

    const compressedFile =
      new File(
        [outputBlob],
        `${removeExtension(
          file.name
        )}-${quality}.mp4`,
        {
          type: "video/mp4",
          lastModified: Date.now(),
        }
      );

    onProgress?.(100);

    return compressedFile;

  } finally {

    try {
      await encoder.deleteFile(
        inputName
      );
    } catch {}

    try {
      await encoder.deleteFile(
        outputName
      );
    } catch {}

    encoder.off(
      "progress",
      progressHandler
    );
  }
}


function getExtension(
  file: File
): string {

  const parts =
    file.name.split(".");

  return (
    parts.length > 1
      ? parts[parts.length - 1]
      : "mp4"
  ).toLowerCase();
}


function removeExtension(
  filename: string
): string {

  return filename.replace(
    /\.[^/.]+$/,
    ""
  );
}