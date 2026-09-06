// utils/uploadDb.ts

import * as SQLite from "expo-sqlite";

const DB_NAME = "tribe-media-uploads.db";
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

export type NativeUploadFile = {
  uri: string;
  name: string;
  type: string;
  size: number;
  lastModified?: number;
};

export type StoredUpload = {

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
   * Native file information.
   *
   * We store the URI and metadata, NOT the file bytes.
   */
  file: NativeUploadFile;

  /**
   * Multipart information.
   */
  multipart: boolean;
  part_size?: number;
  part_count?: number;

  /**
   * Parts that R2 has successfully received.
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

type UploadRow = {
  upload_key: string;
  media_id: string;

  file_name: string;
  file_type: string;
  file_size: number;
  file_last_modified: number;

  file_json: string;

  multipart: number;
  part_size: number | null;
  part_count: number | null;

  uploaded_parts_json: string;

  status: UploadStatus;
  progress: number;

  updated_at: number;
  created_at: number;
};

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync(DB_NAME);
  }

  return databasePromise;
}


/**
 * Create the upload table if it does not already exist.
 */
async function initializeDatabase(): Promise<void> {
  const db = await openDatabase();

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS ${STORE_NAME} (
      upload_key TEXT PRIMARY KEY NOT NULL,

      media_id TEXT NOT NULL,

      file_name TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      file_last_modified INTEGER NOT NULL,

      file_json TEXT NOT NULL,

      multipart INTEGER NOT NULL DEFAULT 1,
      part_size INTEGER,
      part_count INTEGER,

      uploaded_parts_json TEXT NOT NULL DEFAULT '[]',

      status TEXT NOT NULL,
      progress REAL NOT NULL DEFAULT 0,

      updated_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_uploads_media_id
      ON ${STORE_NAME}(media_id);

    CREATE INDEX IF NOT EXISTS idx_uploads_status
      ON ${STORE_NAME}(status);

    CREATE INDEX IF NOT EXISTS idx_uploads_updated_at
      ON ${STORE_NAME}(updated_at);
  `);
}


/**
 * Ensure the database is ready before any operation.
 */
async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await openDatabase();

  await initializeDatabase();

  return db;
}


/**
 * Convert a SQLite row back into the original StoredUpload shape.
 */
function rowToUpload(
  row: UploadRow
): StoredUpload {
  let file: NativeUploadFile;

  let uploadedParts: StoredUploadedPart[];

  try {
    file = JSON.parse(
      row.file_json
    ) as NativeUploadFile;
  } catch {
    throw new Error(
      `Invalid stored file data for upload ${row.upload_key}.`
    );
  }

  try {
    uploadedParts =
      JSON.parse(
        row.uploaded_parts_json
      ) as StoredUploadedPart[];
  } catch {
    throw new Error(
      `Invalid stored uploaded parts for upload ${row.upload_key}.`
    );
  }

  return {
    upload_key:
      row.upload_key,

    media_id:
      row.media_id,

    file_name:
      row.file_name,

    file_type:
      row.file_type,

    file_size:
      row.file_size,

    file_last_modified:
      row.file_last_modified,

    file,

    multipart:
      Boolean(row.multipart),

    ...(row.part_size !== null
      ? {
          part_size:
            row.part_size,
        }
      : {}),

    ...(row.part_count !== null
      ? {
          part_count:
            row.part_count,
        }
      : {}),

    uploaded_parts:
      uploadedParts,

    status:
      row.status,

    progress:
      row.progress,

    updated_at:
      row.updated_at,

    created_at:
      row.created_at,
  };
}


/**
 * Creates a reasonably stable identifier for the same
 * native file selected again after an app restart.
 *
 * We do NOT use media_id because media_id does not
 * exist before initialization.
 */
export function createUploadKey(
  file: NativeUploadFile
): string {
  return [
    file.name,
    file.size,
    file.type,
    file.lastModified ?? 0,
  ].join("::");
}


/**
 * Save a completely new upload session.
 */
export async function saveUpload(
  upload: StoredUpload
): Promise<void> {

  const db =
    await getDatabase();

  await db.runAsync(
    `
      INSERT OR REPLACE INTO ${STORE_NAME} (
        upload_key,
        media_id,

        file_name,
        file_type,
        file_size,
        file_last_modified,

        file_json,

        multipart,
        part_size,
        part_count,

        uploaded_parts_json,

        status,
        progress,

        updated_at,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    upload.upload_key,
    upload.media_id,

    upload.file_name,
    upload.file_type,
    upload.file_size,
    upload.file_last_modified,

    JSON.stringify(
      upload.file
    ),

    upload.multipart ? 1 : 0,
    upload.part_size ?? null,
    upload.part_count ?? null,

    JSON.stringify(
      upload.uploaded_parts
    ),

    upload.status,
    upload.progress,

    upload.updated_at,
    upload.created_at
  );
}


/**
 * Update only selected fields of an upload.
 */
export async function updateUpload(
  uploadKey: string,
  updates: Partial<StoredUpload>
): Promise<void> {

  const existing =
    await getUpload(
      uploadKey
    );

  if (!existing) {
    throw new Error(
      `Upload ${uploadKey} was not found.`
    );
  }

  const merged: StoredUpload = {
    ...existing,
    ...updates,
    updated_at:
      Date.now(),
  };

  await saveUpload(
    merged
  );
}


/**
 * Get one upload.
 */
export async function getUpload(
  uploadKey: string
): Promise<StoredUpload | null> {

  const db =
    await getDatabase();

  const row =
    await db.getFirstAsync<UploadRow>(
      `
        SELECT *
        FROM ${STORE_NAME}
        WHERE upload_key = ?
        LIMIT 1
      `,
      uploadKey
    );

  if (!row) {
    return null;
  }

  return rowToUpload(
    row
  );
}


/**
 * Find an existing upload for a selected file.
 */
export async function getUploadByFile(
  file: NativeUploadFile
): Promise<StoredUpload | null> {

  const uploadKey =
    createUploadKey(
      file
    );

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
    await getDatabase();

  const row =
    await db.getFirstAsync<UploadRow>(
      `
        SELECT *
        FROM ${STORE_NAME}
        WHERE media_id = ?
        LIMIT 1
      `,
      mediaId
    );

  if (!row) {
    return null;
  }

  return rowToUpload(
    row
  );
}


/**
 * Delete an upload from SQLite.
 *
 * We do this after successful completion or
 * explicit permanent cancellation.
 */
export async function deleteUpload(
  uploadKey: string
): Promise<void> {

  const db =
    await getDatabase();

  await db.runAsync(
    `
      DELETE FROM ${STORE_NAME}
      WHERE upload_key = ?
    `,
    uploadKey
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
      status:
        "paused",

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
 * This allows resume/retry.
 */
export async function markUploadFailed(
  uploadKey: string,
  progress?: number
): Promise<void> {

  await updateUpload(
    uploadKey,
    {
      status:
        "failed",

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

  if (existingIndex >= 0) {
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