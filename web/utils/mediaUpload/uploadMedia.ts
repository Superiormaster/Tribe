import { apiRequest } from "@/utils/api";

type DirectUploadResponse = {
  media_id: string;
  upload_url: string;
  object_key: string;
  original_url: string | string[];
  media_type: string;
  content_type: string;
  status: string;
};

type CompleteResponse = {
  success: boolean;
  id?: number;
  media_id: string;
  object_key: string;
  original_url: string | string[];
  thumbnail_url?: string | null;
  media_type?: string;
  content_type?: string;
  size: number;
  status: string;
};

async function putFileToR2(
  uploadUrl: string,
  file: File
) {
  const response = await fetch(
    uploadUrl,
    {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
      },
      body: file,
    }
  );

  if (!response.ok) {
    throw new Error(
      `Media upload failed: ${response.status}`
    );
  }
}

export async function uploadMedia(
  file: File,
  onProgress?: (percent: number) => void
): Promise<CompleteResponse> {

  if (!file) {
    throw new Error("No file provided.");
  }

  // 1. Ask Django to initialize the upload
  const session =
    await apiRequest(
      "api/media/initialize/",
      {
        method: "POST",
        data: {
          content_type: file.type,
          size: file.size,
        },
      }
    ) as DirectUploadResponse;

  if (!session.media_id) {
    throw new Error(
      "Invalid media upload session."
    );
  }

  if (!session.upload_url) {
    throw new Error(
      "Server did not provide a direct upload URL."
    );
  }

  onProgress?.(0);

  // 2. Upload directly to R2
  await putFileToR2(
    session.upload_url,
    file
  );

  onProgress?.(90);

  // 3. Tell Django the upload is complete
  const completed =
    await apiRequest(
      "api/media/complete/",
      {
        method: "POST",
        data: {
          media_id:
            session.media_id,
        },
      }
    ) as CompleteResponse;

  if (!completed?.success) {
    throw new Error(
      "Media upload could not be completed."
    );
  }

  onProgress?.(100);

  return completed;
}