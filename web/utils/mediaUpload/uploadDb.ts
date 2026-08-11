// utils/uploadDb.ts

const DB_NAME = "tribe-media-uploads";
const DB_VERSION = 1;
const STORE_NAME = "uploads";

export type UploadStatus =
  | "initialized"
  | "uploading"
  | "paused"
  | "cancelled"
  | "failed"
  | "completed";

export type StoredUploadedPart = {
  part_number: number;
  etag: string;
  size: number;
};

export type StoredUpload = {
  /**
   * Local identifier.
   *
   * This lets us identify the same browser upload
   * across page reloads.
   */
  upload_key: string;

  /**
   * Backend media ID.
   */
  media_id: string;

  /**
   * File information.
   */
  file_name: string;
  file_type: string;
  file_size: number;
  file_last_modified: number;

  /**
   * The actual File object.
   *
   * IndexedDB can store File objects using
   * structured cloning.
   */
  file: File;

  /**
   * Multipart information.
   */
  multipart: boolean;
  part_size?: number;
  part_count?: number;

  /**
   * Parts that R2 has successfully received.
   *
   * IMPORTANT:
   * A part is only added here after R2 returns
   * a successful response + ETag.
   */
  uploaded_parts: StoredUploadedPart[];

  /**
   * Current state.
   */
  status: UploadStatus;

  /**
   * Last known progress.
   */
  progress: number;

  /**
   * Used for UI / debugging.
   */
  updated_at: number;

  created_at: number;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise(
    (
      resolve,
      reject
    ) => {

      if (
        typeof window === "undefined" ||
        !window.indexedDB
      ) {
        reject(
          new Error(
            "IndexedDB is not available in this browser."
          )
        );

        return;
      }

      const request =
        indexedDB.open(
          DB_NAME,
          DB_VERSION
        );

      request.onupgradeneeded = () => {

        const db =
          request.result;

        if (
          !db.objectStoreNames.contains(
            STORE_NAME
          )
        ) {

          const store =
            db.createObjectStore(
              STORE_NAME,
              {
                keyPath:
                  "upload_key",
              }
            );

          store.createIndex(
            "media_id",
            "media_id",
            {
              unique: false,
            }
          );

          store.createIndex(
            "status",
            "status",
            {
              unique: false,
            }
          );

          store.createIndex(
            "updated_at",
            "updated_at",
            {
              unique: false,
            }
          );
        }
      };

      request.onsuccess = () => {

        const db =
          request.result;

        db.onversionchange = () => {
          db.close();
        };

        resolve(db);
      };

      request.onerror = () => {

        reject(
          request.error ||
          new Error(
            "Failed to open upload IndexedDB."
          )
        );
      };
    }
  );
}


/**
 * Creates a reasonably stable identifier for the same
 * file selected again after a page reload.
 *
 * We do NOT use the media_id here because media_id
 * does not exist before initialization.
 */
export function createUploadKey(
  file: File
): string {

  return [
    file.name,
    file.size,
    file.type,
    file.lastModified,
  ].join("::");
}


/**
 * Save a completely new upload session.
 */
export async function saveUpload(
  upload: StoredUpload
): Promise<void> {

  const db =
    await openDatabase();

  return new Promise(
    (
      resolve,
      reject
    ) => {

      const transaction =
        db.transaction(
          STORE_NAME,
          "readwrite"
        );

      const store =
        transaction.objectStore(
          STORE_NAME
        );

      store.put(
        upload
      );

      transaction.oncomplete = () => {
        db.close();
        resolve();
      };

      transaction.onerror = () => {
        db.close();

        reject(
          transaction.error ||
          new Error(
            "Failed to save upload."
          )
        );
      };

      transaction.onabort = () => {
        db.close();

        reject(
          transaction.error ||
          new Error(
            "Upload transaction was aborted."
          )
        );
      };
    }
  );
}


/**
 * Update only selected fields of an upload.
 */
export async function updateUpload(
  uploadKey: string,
  updates: Partial<StoredUpload>
): Promise<void> {

  const db =
    await openDatabase();

  return new Promise(
    (
      resolve,
      reject
    ) => {

      const transaction =
        db.transaction(
          STORE_NAME,
          "readwrite"
        );

      const store =
        transaction.objectStore(
          STORE_NAME
        );

      const request =
        store.get(
          uploadKey
        );

      request.onsuccess = () => {

        const existing =
          request.result as
            | StoredUpload
            | undefined;

        if (!existing) {

          transaction.abort();

          reject(
            new Error(
              `Upload ${uploadKey} was not found.`
            )
          );

          return;
        }

        store.put({
          ...existing,
          ...updates,
          updated_at:
            Date.now(),
        });
      };

      request.onerror = () => {

        transaction.abort();

        reject(
          request.error ||
          new Error(
            "Failed to read upload."
          )
        );
      };

      transaction.oncomplete = () => {
        db.close();
        resolve();
      };

      transaction.onerror = () => {
        db.close();

        reject(
          transaction.error ||
          new Error(
            "Failed to update upload."
          )
        );
      };

      transaction.onabort = () => {
        db.close();

        reject(
          transaction.error ||
          new Error(
            "Upload update was aborted."
          )
        );
      };
    }
  );
}


/**
 * Get one upload.
 */
export async function getUpload(
  uploadKey: string
): Promise<StoredUpload | null> {

  const db =
    await openDatabase();

  return new Promise(
    (
      resolve,
      reject
    ) => {

      const transaction =
        db.transaction(
          STORE_NAME,
          "readonly"
        );

      const store =
        transaction.objectStore(
          STORE_NAME
        );

      const request =
        store.get(
          uploadKey
        );

      request.onsuccess = () => {

        db.close();

        resolve(
          request.result ||
          null
        );
      };

      request.onerror = () => {

        db.close();

        reject(
          request.error ||
          new Error(
            "Failed to get upload."
          )
        );
      };
    }
  );
}


/**
 * Find an existing upload for a selected file.
 */
export async function getUploadByFile(
  file: File
): Promise<StoredUpload | null> {

  const uploadKey =
    createUploadKey(file);

  return getUpload(
    uploadKey
  );
}


/**
 * Find an upload by backend media ID.
 */
export async function getUploadByMediaId(
  mediaId: string
): Promise<StoredUpload | null> {

  const db =
    await openDatabase();

  return new Promise(
    (
      resolve,
      reject
    ) => {

      const transaction =
        db.transaction(
          STORE_NAME,
          "readonly"
        );

      const store =
        transaction.objectStore(
          STORE_NAME
        );

      const index =
        store.index(
          "media_id"
        );

      const request =
        index.get(
          mediaId
        );

      request.onsuccess = () => {

        db.close();

        resolve(
          request.result ||
          null
        );
      };

      request.onerror = () => {

        db.close();

        reject(
          request.error ||
          new Error(
            "Failed to find upload by media ID."
          )
        );
      };
    }
  );
}


/**
 * Delete an upload from IndexedDB.
 *
 * We do this after successful completion or
 * explicit permanent cancellation.
 */
export async function deleteUpload(
  uploadKey: string
): Promise<void> {

  const db =
    await openDatabase();

  return new Promise(
    (
      resolve,
      reject
    ) => {

      const transaction =
        db.transaction(
          STORE_NAME,
          "readwrite"
        );

      const store =
        transaction.objectStore(
          STORE_NAME
        );

      store.delete(
        uploadKey
      );

      transaction.oncomplete = () => {
        db.close();
        resolve();
      };

      transaction.onerror = () => {

        db.close();

        reject(
          transaction.error ||
          new Error(
            "Failed to delete upload."
          )
        );
      };
    }
  );
}


/**
 * Mark an upload as paused.
 *
 * We keep its data because it may be resumed.
 */
export async function pauseUpload(
  uploadKey: string,
  progress?: number
): Promise<void> {

  await updateUpload(
    uploadKey,
    {
      status: "paused",

      ...(progress !== undefined
        ? {
            progress,
          }
        : {}),
    }
  );
}


/**
 * Mark an upload as uploading.
 */
export async function markUploadUploading(
  uploadKey: string
): Promise<void> {

  await updateUpload(
    uploadKey,
    {
      status:
        "uploading",
    }
  );
}


/**
 * Mark an upload as failed.
 *
 * We deliberately DO NOT delete it.
 * This is what allows resume/retry.
 */
export async function markUploadFailed(
  uploadKey: string,
  progress?: number
): Promise<void> {

  await updateUpload(
    uploadKey,
    {
      status: "failed",

      ...(progress !== undefined
        ? {
            progress,
          }
        : {}),
    }
  );
}


/**
 * Add a successfully uploaded multipart part.
 *
 * This is the most important persistence operation.
 */
export async function saveUploadedPart(
  uploadKey: string,
  part: StoredUploadedPart
): Promise<void> {

  const upload =
    await getUpload(
      uploadKey
    );

  if (!upload) {

    throw new Error(
      `Cannot save part. Upload ${uploadKey} was not found.`
    );
  }

  const existingIndex =
    upload.uploaded_parts.findIndex(
      existing =>
        existing.part_number ===
        part.part_number
    );

  const uploadedParts =
    [
      ...upload.uploaded_parts,
    ];

  if (
    existingIndex >= 0
  ) {

    uploadedParts[
      existingIndex
    ] = part;

  } else {

    uploadedParts.push(
      part
    );
  }

  uploadedParts.sort(
    (
      a,
      b
    ) =>
      a.part_number -
      b.part_number
  );

  const completedBytes =
    uploadedParts.reduce(
      (
        total,
        item
      ) =>
        total + item.size,
      0
    );

  const progress =
    upload.file_size > 0
      ? Math.min(
          99,
          Math.round(
            (
              completedBytes /
              upload.file_size
            ) * 100
          )
        )
      : 0;

  await updateUpload(
    uploadKey,
    {
      uploaded_parts:
        uploadedParts,

      progress,

      status:
        "uploading",
    }
  );
}