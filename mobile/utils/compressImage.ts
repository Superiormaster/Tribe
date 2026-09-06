// utils/media/compressImage.ts

import {
  manipulateAsync,
  SaveFormat,
} from "expo-image-manipulator";

import { File } from "expo-file-system";

export type NativeImageFile = {
  uri: string;
  name?: string;
  type?: string;
  size?: number;
};

export async function compressImage(
  file: NativeImageFile,
  maxSizeMB: number
): Promise<NativeImageFile> {
  const maxBytes = maxSizeMB * 1024 * 1024;

  // Don't compress files already below the limit.
  if (
    typeof file.size === "number" &&
    file.size <= maxBytes
  ) {
    return file;
  }

  try {
    const result = await manipulateAsync(
      file.uri,
      [
        {
          resize: {
            width: 1920,
          },
        },
      ],
      {
        compress: 0.85,
        format: SaveFormat.WEBP,
      }
    );

    const compressedFile = new File(result.uri);

    const compressedSize = compressedFile.size;

    return {
      uri: result.uri,
      name: (file.name ?? "image").replace(
        /\.[^/.]+$/,
        ".webp"
      ),
      type: "image/webp",
      size: compressedSize,
    };

  } catch (error) {
    console.error(
      "Image compression failed:",
      error
    );

    return file;
  }
}