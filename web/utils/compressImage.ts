// utils/media/compressImage.ts

import imageCompression from "browser-image-compression";

export async function compressImage(
  file: File,
  maxSizeMB: number
): Promise<File> {

  // Don't compress files already below the limit.
  if (file.size <= maxSizeMB * 1024 * 1024) {
    return file;
  }

  const options = {
    maxSizeMB,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    initialQuality: 0.85,
    fileType: "image/webp",
  };

  try {
    const compressedFile =
      await imageCompression(
        file,
        options
      );

    return new File(
      [compressedFile],
      file.name.replace(
        /\.[^/.]+$/,
        ".webp"
      ),
      {
        type: "image/webp",
        lastModified: Date.now(),
      }
    );

  } catch (error) {

    console.error(
      "Image compression failed:",
      error
    );

    // Never prevent an upload just because
    // compression failed.
    return file;
  }
}