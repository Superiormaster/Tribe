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

import {
  UploadNetworkError,
} from "@/utils/mediaUpload/errors";

import {
  uploadDebug,
} from "@/utils/mediaUpload/uploadDebug";

import {
  uploadPart,
  type NativeUploadFile,
} from "@/utils/mediaUpload/uploadPart";


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

type MultipartInitResponse =
  MultipartSession;

type ResumeResponse =
  MultipartSession;

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

export type NativeMediaFile = {
  uri: string;
  name: string;
  type: string;
  size: number;
  lastModified?: number;
};

export async function uploadMediaResumable({
  file,
  duration,
  onProgress,
  signal,
}: {
  file: NativeMediaFile;
  duration?: number | null;
  onProgress?: (
    percent: number
  ) => void;
  signal?: AbortSignal;
}): Promise<CompleteResponse> {

  void uploadDebug({
    event:
      "UPLOAD_START",

    data: {
      file_name:
        file?.name,

      file_size:
        file?.size,

      file_type:
        file?.type,

      file_uri:
        file?.uri,
    },
  });

  if (
    !file ||
    !file.uri
  ) {
    throw new Error(
      "No file provided."
    );
  }

  if (
    !Number.isFinite(file.size) ||
    file.size <= 0
  ) {
    throw new Error(
      "Invalid file size."
    );
  }

  if (
    !file.type ||
    !file.type.startsWith("video/")
  ) {
    throw new Error(
      "The selected file is not a video."
    );
  }

  throwIfAborted(
    signal
  );

  const uploadKey =
    createUploadKey(
      file
    );

  let saved =
    await getUploadByFile(
      file
    );

  let session:
    MultipartSession | null =
      null;

  if (saved) {

    let resumed =
      false;

    for (
      let attempt = 1;
      attempt <=
        MAX_RESUME_ATTEMPTS;
      attempt++
    ) {

      throwIfAborted(
        signal
      );

      try {

        console.log(
          `[UPLOAD] Resume attempt ${attempt}/${MAX_RESUME_ATTEMPTS}`,
          saved.media_id
        );

        const response =
          await apiRequest(
            "api/media/multipart/resume/",
            {
              method:
                "POST",

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

          await deleteUpload(
            uploadKey
          );

          if (
            !response.original_url ||
            !response.object_key
          ) {
            throw new Error(
              "Server reported upload as complete but did not return the completed media details."
            );
          }

          return {
            success:
              true,

            media_id:
              response.media_id,

            object_key:
              response.object_key,

            original_url:
              response.original_url,

            thumbnail_url:
              response.thumbnail_url ??
              null,

            media_type:
              undefined,

            content_type:
              file.type,

            size:
              file.size,

            status:
              "completed",
          };
        }

        /*
         * Valid resumable session.
         */
        if (
          response?.media_id &&
          response?.part_size &&
          response?.part_count
        ) {

          session =
            response;

          resumed =
            true;

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
          duration,
          signal
        );

      void uploadDebug({
        event:
          "MULTIPART_INITIALIZED",

        media_id:
          session.media_id,

        data: {
          part_size:
            session.part_size,

          part_count:
            session.part_count,

          multipart:
            session.multipart,
        },
      });

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
          file.lastModified ??
          now,

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

  } else {

    console.log(
      "[UPLOAD] No local upload found. Creating new multipart session."
    );

    session =
      await initializeMultipart(
        file,
        duration,
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
        file.lastModified ??
        now,

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


  void uploadDebug({
    event:
      "UPLOAD_URLS_READY",

    media_id:
      session.media_id,

    data: {
      part_count:
        session.part_count,

      urls_received:
        urlMap.size,

      expected_urls:
        session.part_count,

      uploaded_parts:
        uploadedMap.size,
    },
  });

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

      throw createAbortError();
    }

    /*
     * Already uploaded on server.
     */
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

    /*
     * Bytes completed before this part.
     */
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

          file: {
            uri:
              file.uri,

            name:
              file.name,

            type:
              file.type,

            size:
              file.size,
          } satisfies NativeUploadFile,

          start,

          end,

          partNumber,

          uploadKey,

          signal,

          onProgress:
            loaded => {

              const totalLoaded =
                previousCompletedBytes +
                Math.min(
                  loaded,
                  currentPartSize
                );

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

      void uploadDebug({
        event:
          "PART_PREPARING",

        media_id:
          session.media_id,

        part_number:
          partNumber,

        data: {
          start,

          end,

          size:
            currentPartSize,

          already_uploaded:
            uploadedMap.has(
              partNumber
            ),

          has_url:
            Boolean(
              url
            ),
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
        isAbortError(
          error
        )
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

      if (
        isNetworkError(
          error
        )
      ) {

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

    throw createAbortError();
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

      throw createAbortError();
    }

    try {

      console.log(
        `[UPLOAD] Complete attempt ${attempt}/${MAX_COMPLETE_ATTEMPTS}`
      );

      void uploadDebug({
        event:
          "MULTIPART_COMPLETE_START",

        media_id:
          session.media_id,

        data: {
          parts:
            finalParts.length,

          expected_parts:
            session.part_count,
        },
      });

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

      void uploadDebug({
        event:
          "MULTIPART_COMPLETE_SUCCESS",

        media_id:
          session.media_id,

        data: {
          parts:
            finalParts.length,

          status:
            completed.status,
        },
      });

      console.log(
        "COMPLETED MEDIA:",
        completed
      );

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

      void uploadDebug({
        event:
          "MULTIPART_COMPLETE_FAILED",

        level:
          "error",

        media_id:
          session.media_id,

        data: {
          attempt,

          error:
            error instanceof Error
              ? error.message
              : String(error),
        },
      });
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
  file: NativeMediaFile,
  duration?: number | null,
  signal?: AbortSignal
): Promise<MultipartSession> {

  throwIfAborted(
    signal
  );

  const response =
    await apiRequest(
      "api/media/initialize/",
      {
        method:
          "POST",

        data: {
          content_type:
            file.type,

          size:
            file.size,

          upload_mode:
            "multipart",

          duration,
        },
      }
    ) as MultipartInitResponse;

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

function createAbortError(): Error {

  const error =
    new Error(
      "Upload cancelled."
    );

  error.name =
    "AbortError";

  return error;
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

function isAbortError(
  error: unknown
): boolean {

  return (
    error instanceof Error &&
    error.name ===
      "AbortError"
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
          createAbortError()
        );

        return;
      }

      let settled =
        false;

      let timer:
        ReturnType<
          typeof setTimeout
        >;

      const cleanup =
        () => {

          signal?.removeEventListener(
            "abort",
            onAbort
          );

          clearTimeout(
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
            createAbortError()
          );
        };

      timer =
        setTimeout(
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

function isNetworkError(
  error: unknown
): boolean {

  if (
    error instanceof TypeError
  ) {
    return true;
  }

  if (
    error instanceof Error
  ) {

    const message =
      error.message.toLowerCase();

    return (
      message.includes(
        "network"
      ) ||
      message.includes(
        "failed to fetch"
      ) ||
      message.includes(
        "fetch"
      ) ||
      message.includes(
        "connection"
      ) ||
      message.includes(
        "timeout"
      )
    );
  }

  return false;
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
      // Ignore local cleanup failures.
    }
  }

  return response;
}