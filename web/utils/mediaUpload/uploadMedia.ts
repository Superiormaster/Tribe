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
  console.log(
    "=== R2 PUT START ===",
    {
      name: file.name,
      type: file.type,
      size: file.size,
      uploadUrl,
    }
  );

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

  console.log(
    "=== R2 PUT RESPONSE ===",
    {
      status: response.status,
      ok: response.ok,
      statusText: response.statusText,
    }
  );

  if (!response.ok) {
    const text = await response.text();

    console.error(
      "=== R2 PUT FAILED ===",
      {
        status: response.status,
        statusText: response.statusText,
        body: text,
      }
    );

    throw new Error(
      `Media upload failed: ${response.status}`
    );
  }

  console.log(
    "=== R2 PUT SUCCESS ==="
  );
}

export async function uploadMedia(
  file: File,
  onProgress?: (percent: number) => void
): Promise<CompleteResponse> {

  console.log(
    "🔥 [MEDIA UPLOAD START]",
    {
      name: file?.name,
      type: file?.type,
      size: file?.size,
      sizeMB: file
        ? (file.size / 1024 / 1024).toFixed(2)
        : null,
      instanceofFile:
        typeof File !== "undefined" &&
        file instanceof File,
      preview:
        (file as any)?.preview,
    }
  )

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
          upload_mode: "direct",
        },
      }
    ) as DirectUploadResponse;
  
  console.log(
    "🔥 [MEDIA INITIALIZE RESPONSE]",
    {
      session,
      has_media_id: !!session?.media_id,
      has_upload_url: !!session?.upload_url,
      has_object_key: !!session?.object_key,
      has_original_url: !!session?.original_url,
    }
  );

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
  console.log("🔥 [MEDIA] INITIALIZED");

  await putFileToR2(
    session.upload_url,
    file
  );
  
  console.log(
    "🔥 [MEDIA] R2 UPLOAD SUCCESS"
  );
  
  onProgress?.(90);
  
  console.log(
    "🔥 [MEDIA] CALLING COMPLETE",
    session.media_id
  );
  
  const completed = await apiRequest(
    "api/media/complete/",
    {
      method: "POST",
      data: {
        media_id: session.media_id,
      },
    }
  ) as CompleteResponse;
  
  console.log(
    "🔥 [MEDIA] COMPLETE SUCCESS",
    completed
  );

  if (!completed?.success) {
    throw new Error(
      "Media upload could not be completed."
    );
  }

  onProgress?.(100);

  return completed;
}