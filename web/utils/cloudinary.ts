// utils/cloudinary.ts
type CloudinaryUploadOptions = {
  file: File;
  folder?: string;            // optional Cloudinary folder, e.g., "Tribe/Posts"
  uploadPreset?: string;      // optional, default to env preset
  onProgress?: (percent: number) => void; // optional progress callback
};

/**
 * Upload a file (image/video) to Cloudinary
 * Supports progress updates via `onProgress`
 * @param options.file - File object from input
 * @param options.folder - Cloudinary folder path (optional)
 * @param options.uploadPreset - Cloudinary unsigned preset (optional)
 * @param options.onProgress - Callback for upload progress (optional)
 * @returns Promise<string> - Secure URL of uploaded file
 */
export const uploadToCloudinary = async ({
  file,
  folder,
  uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "default_unsigned",
  onProgress,
}: CloudinaryUploadOptions): Promise<string> => {
  if (!file) throw new Error("No file provided for Cloudinary upload");

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) throw new Error("CLOUDINARY_CLOUD_NAME not set in env");

  const resourceType = file.type.startsWith("video") ? "video" : "image";
  const finalFolder = folder || `Tribe/${resourceType === "video" ? "Videos" : "Images"}`;

  // Use XMLHttpRequest if progress callback is provided
  if (onProgress) {
    return new Promise((resolve, reject) => {
      const data = new FormData();
      data.append("file", file);
      data.append("upload_preset", uploadPreset);
      data.append("folder", finalFolder);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const resp = JSON.parse(xhr.responseText);
          resolve(resp.secure_url);
        } else {
          reject(`Cloudinary upload failed: ${xhr.statusText}`);
        }
      };

      xhr.onerror = () => reject("Upload failed due to network error");
      xhr.send(data);
    });
  }

  // Otherwise, fallback to simple fetch upload
  const data = new FormData();
  data.append("file", file);
  data.append("upload_preset", uploadPreset);
  data.append("folder", finalFolder);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
    { method: "POST", body: data }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloudinary upload failed: ${errorText}`);
  }

  const json = await response.json();
  return json.secure_url as string;
};