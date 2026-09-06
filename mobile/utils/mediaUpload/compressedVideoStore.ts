// utils/mediaUpload/compressedVideoStore.ts

import * as SQLite from "expo-sqlite";

const DB_NAME = "tribe-media-upload.db";
const STORE_NAME = "compressed_videos";

export type NativeCompressedVideoFile = {
  uri: string;
  name: string;
  type: string;
  size: number;
  lastModified?: number;
};

type StoredCompressedVideo = {
  key: string;
  file: NativeCompressedVideoFile;

  originalName: string;
  originalSize: number;
  originalLastModified: number;

  targetQuality:
    | "720p"
    | "1080p";

  createdAt: number;
};

type CompressedVideoRow = {
  key: string;

  file_json: string;

  original_name: string;
  original_size: number;
  original_last_modified: number;

  target_quality:
    | "720p"
    | "1080p";

  created_at: number;
};

let databasePromise:
  Promise<SQLite.SQLiteDatabase> | null = null;


/**
 * Open the native SQLite database.
 */
async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise =
      SQLite.openDatabaseAsync(
        DB_NAME
      );
  }

  return databasePromise;
}


/**
 * Initialize the compressed-video table.
 */
async function initializeDatabase(): Promise<void> {
  const db =
    await openDatabase();

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS ${STORE_NAME} (
      key TEXT PRIMARY KEY NOT NULL,

      file_json TEXT NOT NULL,

      original_name TEXT NOT NULL,
      original_size INTEGER NOT NULL,
      original_last_modified INTEGER NOT NULL,

      target_quality TEXT NOT NULL,

      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS
      idx_compressed_videos_created_at
    ON ${STORE_NAME}(created_at);
  `);
}


/**
 * Get an initialized database.
 */
async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db =
    await openDatabase();

  await initializeDatabase();

  return db;
}

export function getCompressedVideoKey(
  file: NativeCompressedVideoFile,
  targetQuality:
    | "720p"
    | "1080p"
): string {

  return [
    file.name,
    file.size,
    file.lastModified ?? 0,
    file.type,
    targetQuality,
  ].join("::");
}

export async function saveCompressedVideo(
  key: string,
  compressedFile: NativeCompressedVideoFile,
  originalFile: NativeCompressedVideoFile,
  targetQuality:
    | "720p"
    | "1080p"
): Promise<void> {

  const db =
    await getDatabase();

  const record:
    StoredCompressedVideo = {
      key,

      file:
        compressedFile,

      originalName:
        originalFile.name,

      originalSize:
        originalFile.size,

      originalLastModified:
        originalFile.lastModified ?? 0,

      targetQuality,

      createdAt:
        Date.now(),
    };

  await db.runAsync(
    `
      INSERT OR REPLACE INTO ${STORE_NAME} (
        key,
        file_json,

        original_name,
        original_size,
        original_last_modified,

        target_quality,

        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    record.key,

    JSON.stringify(
      record.file
    ),

    record.originalName,
    record.originalSize,
    record.originalLastModified,

    record.targetQuality,

    record.createdAt
  );
}


/**
 * Retrieve a compressed video.
 */
export async function getCompressedVideo(
  key: string
): Promise<NativeCompressedVideoFile | null> {

  const db =
    await getDatabase();

  const row =
    await db.getFirstAsync<
      CompressedVideoRow
    >(
      `
        SELECT *
        FROM ${STORE_NAME}
        WHERE key = ?
        LIMIT 1
      `,
      key
    );

  if (!row) {
    return null;
  }

  try {
    const file =
      JSON.parse(
        row.file_json
      ) as NativeCompressedVideoFile;

    if (!file?.uri) {
      return null;
    }

    return file;

  } catch (error) {

    console.warn(
      "[CompressedVideoStore] Failed to parse stored file:",
      error
    );

    return null;
  }
}

export async function deleteCompressedVideo(
  key: string
): Promise<void> {

  const db =
    await getDatabase();

  const row =
    await db.getFirstAsync<
      CompressedVideoRow
    >(
      `
        SELECT *
        FROM ${STORE_NAME}
        WHERE key = ?
        LIMIT 1
      `,
      key
    );

  await db.runAsync(
    `
      DELETE FROM ${STORE_NAME}
      WHERE key = ?
    `,
    key
  );
}

export async function cleanupOldCompressedVideos(
  maxAgeMs =
    24 * 60 * 60 * 1000
): Promise<void> {

  const db =
    await getDatabase();

  const cutoff =
    Date.now() -
    maxAgeMs;

  await db.runAsync(
    `
      DELETE FROM ${STORE_NAME}
      WHERE created_at < ?
    `,
    cutoff
  );
}