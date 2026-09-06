import { apiRequest } from "@/utils/api";

export type NativeMediaFile = {
  uri: string;
  name: string;
  type: string;
  size: number;
  lastModified?: number;
};

type DirectUploadResponse = {
  media_id: string;
  upload_url: string;
  object_key: string;
  original_url: string | string[];
  media_type: string;
  content_type: string;
  status: string;
};

export type CompleteResponse = {
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
  file: NativeMediaFile,
  onProgress?: (percent: number) => void
) {
  console.log(
    "=== R2 PUT START ===",
    {
      name: file.name,
      type: file.type,
      size: file.size,
      sizeMB: (file.size / 1024 / 1024).toFixed(2),
      uri: file.uri,
      uploadUrl,
    }
  );

  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("PUT", uploadUrl, true);

    xhr.setRequestHeader(
      "Content-Type",
      file.type || "application/octet-stream"
    );

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || file.size <= 0) {
        return;
      }

      const percent = Math.min(
        100,
        Math.round((event.loaded / file.size) * 100)
      );

      console.log(
        "=== R2 UPLOAD PROGRESS ===",
        {
          loaded: event.loaded,
          total: event.total,
          percent,
        }
      );

      // Reserve the final 10% for the Django complete request.
      onProgress?.(
        Math.min(90, Math.round(percent * 0.9))
      );
    };

    xhr.onload = () => {
      console.log(
        "=== R2 PUT RESPONSE ===",
        {
          status: xhr.status,
          statusText: xhr.statusText,
          response: xhr.responseText,
        }
      );

      if (xhr.status >= 200 && xhr.status < 300) {
        console.log(
          "=== R2 PUT SUCCESS ==="
        );

        onProgress?.(90);
        resolve();
        return;
      }

      console.error(
        "=== R2 PUT FAILED ===",
        {
          status: xhr.status,
          statusText: xhr.statusText,
          body: xhr.responseText,
        }
      );

      reject(
        new Error(
          `Media upload failed: ${xhr.status}`
        )
      );
    };

    xhr.onerror = () => {
      console.error(
        "=== R2 PUT NETWORK ERROR ==="
      );

      reject(
        new Error(
          "Network error while uploading media."
        )
      );
    };

    xhr.onabort = () => {
      console.warn(
        "=== R2 PUT ABORTED ==="
      );

      reject(
        new Error("Media upload cancelled.")
      );
    };

    xhr.ontimeout = () => {
      console.error(
        "=== R2 PUT TIMEOUT ==="
      );

      reject(
        new Error(
          "Media upload timed out."
        )
      );
    };

    try {
      // React Native XHR accepts a native file URI.
      xhr.send({
        uri: file.uri,
        type: file.type || "application/octet-stream",
        name: file.name,
      } as any);
    } catch (error) {
      console.error(
        "=== R2 PUT SEND ERROR ===",
        error
      );

      reject(error);
    }
  });
}

export async function uploadMedia(
  file: NativeMediaFile,
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
      uri: file?.uri,
    }
  );

  if (!file) {
    throw new Error("No file provided.");
  }

  if (!file.uri) {
    throw new Error("Media file URI is missing.");
  }

  if (!file.size || file.size <= 0) {
    throw new Error("Media file size is invalid.");
  }

  // 1. Ask Django to initialize the upload
  const session =
    await apiRequest(
      "api/media/initialize/",
      {
        method: "POST",
        data: {
          content_type:
            file.type || "application/octet-stream",
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

  if (!session?.media_id) {
    throw new Error(
      "Invalid media upload session."
    );
  }

  if (!session?.upload_url) {
    throw new Error(
      "Server did not provide a direct upload URL."
    );
  }

  onProgress?.(0);

  // 2. Upload directly to R2
  console.log(
    "🔥 [MEDIA] INITIALIZED"
  );

  await putFileToR2(
    session.upload_url,
    file,
    onProgress
  );

  console.log(
    "🔥 [MEDIA] R2 UPLOAD SUCCESS"
  );

  onProgress?.(90);

  // 3. Tell Django to complete the upload
  console.log(
    "🔥 [MEDIA] CALLING COMPLETE",
    session.media_id
  );

  const completed =
    await apiRequest(
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