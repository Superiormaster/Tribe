import { apiRequest } from "@/utils/api";

import {
  createUploadKey,
  getUploadByFile,
  saveUpload,
  updateUpload,
  markUploadUploading,
  markUploadFailed,
  pauseUpload,
  deleteUpload,
  type StoredUpload,
  type StoredUploadedPart,
} from "@/utils/mediaUpload/uploadDb";
import { UploadNetworkError } from "@/utils/mediaUpload/errors";
import { uploadPart } from "@/utils/mediaUpload/uploadPart";

type UploadedPart = {
  part_number: number;
  etag: string;
  size: number;
};

type MultipartPart = {
  part_number: number;
  upload_url: string;
};

type MultipartSession = {
  media_id: string;
  object_key?: string;
  multipart?: boolean;
  upload_id?: string;

  part_size: number;
  part_count: number;

  parts?: MultipartPart[];
  uploaded_parts?: UploadedPart[];
  remaining_parts?: MultipartPart[];

  completed?: boolean;
  success?: boolean;

  original_url?: string;
  thumbnail_url?: string | null;
};

type MultipartInitResponse = MultipartSession;
type ResumeResponse = MultipartSession;

type CompleteResponse = {
  success: boolean;
  id?: number;
  media_id: string | number;
  object_key: string;
  original_url: string;
  thumbnail_url?: string | null;
  media_type?: string;
  content_type?: string;
  size: number;
  status: string;
};

const MAX_RESUME_ATTEMPTS = 4;
const RESUME_RETRY_BASE_DELAY = 1000;
const MAX_COMPLETE_ATTEMPTS = 4;
const COMPLETE_RETRY_BASE_DELAY = 1000;

export async function uploadMediaResumable({
  file,
  onProgress,
  signal,
}: {
  file: File;

  onProgress?: (
    percent: number
  ) => void;

  signal?: AbortSignal;
}): Promise<CompleteResponse> {

  if (!file) {
    throw new Error(
      "No file provided."
    );
  }

  if (signal?.aborted) {
    throw new DOMException(
      "Upload cancelled.",
      "AbortError"
    );
  }

  const uploadKey =
    createUploadKey(file);

  let saved =
    await getUploadByFile(file);

  let session: MultipartSession | null = null;

  if (saved) {

    let resumed = false;

    for (
      let attempt = 1;
      attempt <= MAX_RESUME_ATTEMPTS;
      attempt++
    ) {

      if (signal?.aborted) {
        throw new DOMException(
          "Upload cancelled.",
          "AbortError"
        );
      }

      try {

        console.log(
          `[UPLOAD] Resume attempt ${attempt}/${MAX_RESUME_ATTEMPTS}`,
          saved.media_id
        );

        const response =
          await apiRequest(
            "api/media/multipart/resume/",
            {
              method: "POST",

              data: {
                media_id:
                  saved.media_id,
              },
            }
          ) as ResumeResponse;

        if (
          response?.completed === true ||
          (
            response?.success === true &&
            !!response?.original_url
          )
        ) {
          console.log(
            "[UPLOAD] Server says upload is already complete."
          );
        
          await deleteUpload(uploadKey);
        
          if (
            !response.original_url ||
            !response.object_key
          ) {
            throw new Error(
              "Server reported upload as complete but did not return the completed media details."
            );
          }
        
          return {
            success: true,
            media_id: response.media_id,
            object_key: response.object_key,
            original_url: response.original_url,
            thumbnail_url:
              response.thumbnail_url ?? null,
            media_type: undefined,
            content_type: file.type,
            size: file.size,
            status: "completed",
          };
        }

        if (
          response?.media_id &&
          response?.part_size &&
          response?.part_count
        ) {

          session =
            response;

          resumed = true;

          console.log(
            "[UPLOAD] Existing multipart session resumed.",
            {
              media_id:
                response.media_id,

              part_size:
                response.part_size,

              part_count:
                response.part_count,
            }
          );

          break;
        }

        console.warn(
          "[UPLOAD] Existing multipart session is no longer valid."
        );

        break;

      } catch (error) {

        console.warn(
          `[UPLOAD] Resume attempt ${attempt} failed:`,
          error
        );

        if (
          attempt >=
          MAX_RESUME_ATTEMPTS
        ) {

          throw (
            error instanceof Error
              ? error
              : new Error(
                  "Unable to resume upload."
                )
          );
        }

        await delay(
          RESUME_RETRY_BASE_DELAY *
            Math.pow(
              2,
              attempt - 1
            ),
          signal
        );
      }
    }

    if (!resumed) {

      console.log(
        "[UPLOAD] Creating replacement multipart session."
      );

      session =
        await initializeMultipart(
          file,
          signal
        );

      const now =
        Date.now();

      const newUpload:
        StoredUpload = {

          upload_key:
            uploadKey,

          media_id:
            session.media_id,

          file_name:
            file.name,

          file_type:
            file.type,

          file_size:
            file.size,

          file_last_modified:
            file.lastModified,

          file,

          multipart:
            true,

          part_size:
            session.part_size,

          part_count:
            session.part_count,

          uploaded_parts:
            [],

          status:
            "initialized",

          progress:
            0,

          created_at:
            saved.created_at ??
            now,

          updated_at:
            now,
        };


      await saveUpload(
        newUpload
      );

      saved =
        newUpload;

      console.log(
        "[UPLOAD] Replacement multipart session created:",
        session.media_id
      );
    }

  }

  else {

    console.log(
      "[UPLOAD] No local upload found. Creating new multipart session."
    );

    session =
      await initializeMultipart(
        file,
        signal
      );

    const now =
      Date.now();

    const newUpload:
      StoredUpload = {

        upload_key:
          uploadKey,

        media_id:
          session.media_id,

        file_name:
          file.name,

        file_type:
          file.type,

        file_size:
          file.size,

        file_last_modified:
          file.lastModified,

        file,

        multipart:
          true,

        part_size:
          session.part_size,

        part_count:
          session.part_count,

        uploaded_parts:
          [],

        status:
          "initialized",

        progress:
          0,

        created_at:
          now,

        updated_at:
          now,
      };

    await saveUpload(
      newUpload
    );

    saved =
      newUpload;
  }

  if (
    !session?.media_id ||
    !session?.part_size ||
    !session?.part_count
  ) {

    throw new Error(
      "Server returned an invalid multipart upload session."
    );
  }

  const serverUploadedParts =
    Array.isArray(
      session.uploaded_parts
    )
      ? session.uploaded_parts
      : [];

  const uploadedMap =
    new Map<
      number,
      UploadedPart
    >();


  for (
    const part
    of serverUploadedParts
  ) {

    if (
      part.part_number &&
      part.etag
    ) {

      uploadedMap.set(
        part.part_number,
        part
      );
    }
  }

  const urlMap =
    new Map<
      number,
      string
    >();

  if (
    "parts" in session &&
    Array.isArray(
      session.parts
    )
  ) {

    for (
      const part
      of session.parts
    ) {

      if (
        part.upload_url
      ) {

        urlMap.set(
          part.part_number,
          part.upload_url
        );
      }
    }
  }

  if (
    Array.isArray(
      session.remaining_parts
    )
  ) {

    for (
      const part
      of session.remaining_parts
    ) {

      if (
        part.upload_url
      ) {

        urlMap.set(
          part.part_number,
          part.upload_url
        );
      }
    }
  }

  const synchronizedParts:
    StoredUploadedPart[] =
      serverUploadedParts.map(
        part => ({

          part_number:
            part.part_number,

          etag:
            part.etag,

          size:
            getPartSize(
              part.part_number,

              session.part_size!,

              file.size
            ),
        })
      );

  const completedBytes =
    synchronizedParts.reduce(
      (
        total,
        part
      ) =>
        total +
        part.size,

      0
    );

  const initialProgress =
    file.size > 0
      ? Math.min(
          99,

          Math.round(
            (
              completedBytes /
              file.size
            ) *
              100
          )
        )

      : 0;

  await updateUpload(
    uploadKey,
    {
      media_id:
        session.media_id,
      multipart:
        true,
      part_size:
        session.part_size,
      part_count:
        session.part_count,
      uploaded_parts:
        synchronizedParts,
      progress:
        initialProgress,
      status:
        "uploading",
    }
  );

  await markUploadUploading(
    uploadKey
  );

  onProgress?.(
    initialProgress
  );

  for (
    let partNumber = 1;
    partNumber <=
      session.part_count;

    partNumber++
  ) {

    if (
      signal?.aborted
    ) {

      await pauseUpload(
        uploadKey,
        initialProgress
      );

      throw new DOMException(
        "Upload cancelled.",
        "AbortError"
      );
    }

    if (
      uploadedMap.has(
        partNumber
      )
    ) {

      continue;
    }

    const url =
      urlMap.get(
        partNumber
      );


    if (!url) {

      throw new Error(
        `Missing upload URL for part ${partNumber}. The multipart session may have expired.`
      );
    }

    const start =
      (
        partNumber -
        1
      ) *
      session.part_size;


    const end =
      Math.min(
        start +
          session.part_size,

        file.size
      );

    const currentPartSize =
      end -
      start;

    const previousCompletedBytes =
      synchronizedParts.reduce(
        (
          total,
          part
        ) =>
          total +
          part.size,

        0
      );

    try {

      const etag =
        await uploadPart({

          url,

          file,

          start,

          end,
          partNumber,
          uploadKey,
          signal,
          onProgress:
            loaded => {

              const totalLoaded =
                previousCompletedBytes +
                loaded;

              const progress =
                file.size > 0
                  ? Math.min(
                      99,
                      Math.round(
                        (
                          totalLoaded /
                          file.size
                        ) *
                          100
                      )
                    )

                  : 0;

              onProgress?.(
                progress
              );
            },
        });

      const uploadedPart:
        UploadedPart = {
          part_number:
            partNumber,
          etag,
          size:
            currentPartSize,
        };

      uploadedMap.set(
        partNumber,
        uploadedPart
      );

      synchronizedParts.push(
        uploadedPart
      );

      const totalCompletedBytes =
        synchronizedParts.reduce(
          (
            total,
            part
          ) =>
            total +
            part.size,
          0
        );

      const progress =
        file.size > 0
          ? Math.min(
              99,
              Math.round(
                (
                  totalCompletedBytes /
                  file.size
                ) *
                  100
              )
            )

          : 0;

      await updateUpload(
        uploadKey,
        {
          uploaded_parts:
            synchronizedParts,
          progress,
        }
      );

      onProgress?.(
        progress
      );

    } catch (error) {

      if (
        error instanceof DOMException &&
        error.name ===
          "AbortError"
      ) {

        const progress =
          file.size > 0
            ? Math.min(
                99,
                Math.round(
                  (
                    previousCompletedBytes /
                    file.size
                  ) *
                    100
                )
              )

            : 0;

        await pauseUpload(
          uploadKey,
          progress
        );

        throw error;
      }

      const progress =
        file.size > 0
          ? Math.min(
              99,
              Math.round(
                (
                  previousCompletedBytes /
                  file.size
                ) *
                  100
              )
            )

          : 0;

      await updateUpload(
        uploadKey,
        {
          progress,
          status:
            "paused",
        }
      );

      if (isNetworkError(error)) {
        throw new UploadNetworkError(
          "Network connection lost during media upload."
        );
      }
  
      throw error;
    }
  }

  const finalParts =
    Array.from(
      uploadedMap.values()
    )
      .sort(
        (
          a,
          b
        ) =>
          a.part_number -
          b.part_number
      );

  if (
    finalParts.length !==
    session.part_count
  ) {

    throw new Error(
      `Upload is incomplete. ${finalParts.length}/${session.part_count} parts are available.`
    );
  }

  if (
    signal?.aborted
  ) {

    await pauseUpload(
      uploadKey,
      99
    );

    throw new DOMException(
      "Upload cancelled.",
      "AbortError"
    );
  }

  let completed:
    CompleteResponse | null =
      null;

  for (
    let attempt = 1;
    attempt <=
      MAX_COMPLETE_ATTEMPTS;
    attempt++
  ) {

    if (
      signal?.aborted
    ) {

      await pauseUpload(
        uploadKey,
        99
      );

      throw new DOMException(
        "Upload cancelled.",
        "AbortError"
      );
    }

    try {

      console.log(
        `[UPLOAD] Complete attempt ${attempt}/${MAX_COMPLETE_ATTEMPTS}`
      );

      completed =
        await apiRequest(
          "api/media/multipart/complete/",
          {
            method:
              "POST",
            data: {
              media_id:
                session.media_id,
              parts:
                finalParts.map(
                  part => ({
                    part_number:
                      part.part_number,
                    etag:
                      part.etag,
                  })
                ),
            },
          }
        ) as CompleteResponse;

      console.log("COMPLETED MEDIA:", completed);
  
      if (
        completed?.success
      ) {

        break;
      }

      throw new Error(
        "Multipart completion failed."
      );

    } catch (error) {

      console.warn(
        `[UPLOAD] Complete attempt ${attempt} failed:`,
        error
      );

      if (
        attempt >=
        MAX_COMPLETE_ATTEMPTS
      ) {

        throw (
          error instanceof Error
            ? error
            : new Error(
                "Unable to complete multipart upload."
              )
        );
      }

      await delay(
        COMPLETE_RETRY_BASE_DELAY *
          Math.pow(
            2,
            attempt - 1
          ),
        signal
      );
    }
  }

  if (
    !completed?.success
  ) {

    throw new Error(
      "Multipart upload could not be completed."
    );
  }

  onProgress?.(
    100
  );

  await deleteUpload(
    uploadKey
  );

  console.log(
    "[UPLOAD] Upload completely finished.",
    completed
  );

  return completed;
}

async function initializeMultipart(
  file: File,
  signal?: AbortSignal
): Promise<MultipartSession> {

  if (
    signal?.aborted
  ) {

    throw new DOMException(
      "Upload cancelled.",
      "AbortError"
    );
  }

  const response =
    await apiRequest(
      "api/media/initialize/",
      {
        method: "POST",
        data: {
          content_type: file.type,
          size: file.size,
        },
      }
    ) as MultipartSession;

  if (
    !response?.multipart ||
    !response?.media_id ||
    !response?.part_size ||
    !response?.part_count
  ) {

    throw new Error(
      "Server did not create a valid multipart upload."
    );
  }

  return response;
}

function getPartSize(
  partNumber: number,
  partSize: number,
  fileSize: number
): number {

  const start =
    (
      partNumber -
      1
    ) *
    partSize;

  const end =
    Math.min(
      start +
        partSize,

      fileSize
    );

  return Math.max(
    0,

    end -
      start
  );
}

function delay(
  ms: number,

  signal?: AbortSignal
): Promise<void> {

  return new Promise(
    (
      resolve,
      reject
    ) => {

      if (
        signal?.aborted
      ) {

        reject(
          new DOMException(
            "Upload cancelled.",
            "AbortError"
          )
        );

        return;
      }

      let settled =
        false;

      const cleanup =
        () => {

          signal?.removeEventListener(
            "abort",
            onAbort
          );

          window.clearTimeout(
            timer
          );
        };


      const finish =
        () => {

          if (
            settled
          ) {

            return;
          }

          settled =
            true;

          cleanup();

          resolve();
        };


      const onAbort =
        () => {

          if (
            settled
          ) {

            return;
          }

          settled =
            true;

          cleanup();

          reject(
            new DOMException(
              "Upload cancelled.",
              "AbortError"
            )
          );
        };

      const timer =
        window.setTimeout(
          finish,
          ms
        );

      signal?.addEventListener(
        "abort",
        onAbort,
        {
          once:
            true,
        }
      );
    }
  );
}

export async function cancelMediaUpload(
  mediaId: string,

  uploadKey?: string
) {

  const response =
    await apiRequest(
      "api/media/multipart/cancel/",
      {

        method:
          "POST",

        data: {

          media_id:
            mediaId,
        },
      }
    );

  if (
    uploadKey
  ) {

    try {

      await deleteUpload(
        uploadKey
      );

    } catch {

    }
  }

  return response;
}

function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    return true;
  }

  if (error instanceof DOMException) {
    return error.name === "NetworkError";
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    return (
      message.includes("network") ||
      message.includes("failed to fetch") ||
      message.includes("fetch") ||
      message.includes("connection") ||
      message.includes("timeout")
    );
  }

  return false;
}