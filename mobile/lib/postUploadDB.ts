import * as SQLite from "expo-sqlite";
import type { NativeUploadFile } from "@/utils/mediaUpload/uploadFile";

const DB_NAME = "tribe-post-uploads.db";
const TABLE_NAME = "post_jobs";

export type PostUploadJobStatus =
  | "queued"
  | "uploading"
  | "creating"
  | "paused"
  | "failed"
  | "completed"
  | "cancelled";

export type PostMediaType =
  | "image"
  | "video";

export type PostUploadedPart = {
  part_number: number;
  etag: string;
  size: number;
};

export type PostMediaUpload = {
  media_key: string;

  /**
   * Native React Native file reference.
   *
   * This replaces the browser File object.
   */
  file: NativeUploadFile;

  file_name: string;
  file_type: string;
  file_size: number;
  file_last_modified: number;

  media_type: PostMediaType;

  upload_key?: string;
  media_id?: string;

  multipart?: boolean;
  part_size?: number;
  part_count?: number;

  uploaded_parts: PostUploadedPart[];

  uploaded_url?: string;
  thumbnail_url?: string;

  /**
   * Media state.
   */
  status:
    | "queued"
    | "compressing"
    | "uploading"
    | "paused"
    | "uploaded"
    | "failed";

  progress: number;

  error?: string;
};

export type StoredPostUploadJob = {
  job_id: string;

  owner_id: string;

  client_post_id: string;

  content: string;

  mode: "global" | "community" | "reel";

  content_type:
    | "text"
    | "image"
    | "long_video"
    | "short_video";

  selected_community: number | null;

  community_name?: string;
  tribe_name?: string;

  media: PostMediaUpload[];

  status: PostUploadJobStatus;

  progress: number;

  server_post_id?: number | string;

  error?: string;

  retry_count: number;
  last_error_at?: number;

  is_draft: boolean;

  notification_shown?: boolean;

  created_at: number;
  updated_at: number;
};

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);

      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
          job_id TEXT PRIMARY KEY NOT NULL,
          owner_id TEXT NOT NULL,
          client_post_id TEXT NOT NULL,
          content TEXT NOT NULL,
          mode TEXT NOT NULL,
          content_type TEXT NOT NULL,
          selected_community INTEGER,
          community_name TEXT,
          tribe_name TEXT,
          media TEXT NOT NULL,
          status TEXT NOT NULL,
          progress REAL NOT NULL DEFAULT 0,
          server_post_id TEXT,
          error TEXT,
          retry_count INTEGER NOT NULL DEFAULT 0,
          last_error_at INTEGER,
          is_draft INTEGER NOT NULL DEFAULT 0,
          notification_shown INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_post_jobs_owner_id
        ON ${TABLE_NAME}(owner_id);

        CREATE INDEX IF NOT EXISTS idx_post_jobs_status
        ON ${TABLE_NAME}(status);

        CREATE INDEX IF NOT EXISTS idx_post_jobs_created_at
        ON ${TABLE_NAME}(created_at);

        CREATE INDEX IF NOT EXISTS idx_post_jobs_updated_at
        ON ${TABLE_NAME}(updated_at);

        CREATE INDEX IF NOT EXISTS idx_post_jobs_client_post_id
        ON ${TABLE_NAME}(client_post_id);
      `);

      return db;
    })();
  }

  return dbPromise;
}

function serializeJob(job: StoredPostUploadJob) {
  return {
    job_id: job.job_id,
    owner_id: job.owner_id,
    client_post_id: job.client_post_id,
    content: job.content,
    mode: job.mode,
    content_type: job.content_type,
    selected_community: job.selected_community,
    community_name: job.community_name ?? null,
    tribe_name: job.tribe_name ?? null,

    media: JSON.stringify(job.media ?? []),

    status: job.status,
    progress: job.progress ?? 0,

    server_post_id:
      job.server_post_id !== undefined &&
      job.server_post_id !== null
        ? String(job.server_post_id)
        : null,

    error: job.error ?? null,

    retry_count: job.retry_count ?? 0,
    last_error_at: job.last_error_at ?? null,

    is_draft: job.is_draft ? 1 : 0,

    notification_shown:
      job.notification_shown ? 1 : 0,

    created_at:
      job.created_at || Date.now(),

    updated_at: Date.now(),
  };
}

function deserializeJob(
  row: any
): StoredPostUploadJob {
  let media: PostMediaUpload[] = [];

  try {
    media = row.media
      ? JSON.parse(row.media)
      : [];
  } catch {
    media = [];
  }

  return {
    job_id: row.job_id,

    owner_id: row.owner_id,

    client_post_id:
      row.client_post_id,

    content:
      row.content ?? "",

    mode:
      row.mode,

    content_type:
      row.content_type,

    selected_community:
      row.selected_community !== null &&
      row.selected_community !== undefined
        ? Number(row.selected_community)
        : null,

    community_name:
      row.community_name ??
      undefined,

    tribe_name:
      row.tribe_name ??
      undefined,

    media,

    status:
      row.status,

    progress:
      Number(row.progress ?? 0),

    server_post_id:
      row.server_post_id !== null &&
      row.server_post_id !== undefined
        ? row.server_post_id
        : undefined,

    error:
      row.error ??
      undefined,

    retry_count:
      Number(row.retry_count ?? 0),

    last_error_at:
      row.last_error_at !== null &&
      row.last_error_at !== undefined
        ? Number(row.last_error_at)
        : undefined,

    is_draft:
      Boolean(row.is_draft),

    notification_shown:
      Boolean(row.notification_shown),

    created_at:
      Number(row.created_at),

    updated_at:
      Number(row.updated_at),
  };
}

export async function createPostUploadJob(
  job: StoredPostUploadJob
): Promise<void> {
  const db =
    await openDatabase();

  const stored =
    serializeJob(job);

  await db.runAsync(
    `
      INSERT OR REPLACE INTO ${TABLE_NAME} (
        job_id,
        owner_id,
        client_post_id,
        content,
        mode,
        content_type,
        selected_community,
        community_name,
        tribe_name,
        media,
        status,
        progress,
        server_post_id,
        error,
        retry_count,
        last_error_at,
        is_draft,
        notification_shown,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      stored.job_id,
      stored.owner_id,
      stored.client_post_id,
      stored.content,
      stored.mode,
      stored.content_type,
      stored.selected_community,
      stored.community_name,
      stored.tribe_name,
      stored.media,
      stored.status,
      stored.progress,
      stored.server_post_id,
      stored.error,
      stored.retry_count,
      stored.last_error_at,
      stored.is_draft,
      stored.notification_shown,
      stored.created_at,
      stored.updated_at,
    ]
  );
}

export async function getPostUploadJob(
  jobId: string
): Promise<StoredPostUploadJob | null> {
  const db =
    await openDatabase();

  const row =
    await db.getFirstAsync(
      `
        SELECT *
        FROM ${TABLE_NAME}
        WHERE job_id = ?
        LIMIT 1
      `,
      [jobId]
    );

  if (!row) {
    return null;
  }

  return deserializeJob(row);
}

export async function getPostUploadJobByClientPostId(
  clientPostId: string
): Promise<StoredPostUploadJob | null> {
  const db =
    await openDatabase();

  const row =
    await db.getFirstAsync(
      `
        SELECT *
        FROM ${TABLE_NAME}
        WHERE client_post_id = ?
        LIMIT 1
      `,
      [clientPostId]
    );

  if (!row) {
    return null;
  }

  return deserializeJob(row);
}

export async function getPostUploadJobs(
  ownerId: string
): Promise<StoredPostUploadJob[]> {
  const db =
    await openDatabase();

  const rows =
    await db.getAllAsync(
      `
        SELECT *
        FROM ${TABLE_NAME}
        WHERE owner_id = ?
        ORDER BY updated_at DESC
      `,
      [ownerId]
    );

  return rows.map(
    row =>
      deserializeJob(row)
  );
}

export async function getActivePostUploadJobs(
  ownerId: string
): Promise<StoredPostUploadJob[]> {
  const jobs =
    await getPostUploadJobs(
      ownerId
    );

  return jobs.filter(
    job =>
      job.status === "queued" ||
      job.status === "uploading" ||
      job.status === "creating" ||
      job.status === "paused" ||
      job.status === "failed"
  );
}

export async function updatePostUploadJob(
  jobId: string,
  updates: Partial<StoredPostUploadJob>
): Promise<void> {
  const existing =
    await getPostUploadJob(
      jobId
    );

  if (!existing) {
    throw new Error(
      `Post upload job ${jobId} was not found.`
    );
  }

  const updated: StoredPostUploadJob = {
    ...existing,
    ...updates,
    updated_at:
      Date.now(),
  };

  const db =
    await openDatabase();

  const stored =
    serializeJob(updated);

  await db.runAsync(
    `
      UPDATE ${TABLE_NAME}
      SET
        owner_id = ?,
        client_post_id = ?,
        content = ?,
        mode = ?,
        content_type = ?,
        selected_community = ?,
        community_name = ?,
        tribe_name = ?,
        media = ?,
        status = ?,
        progress = ?,
        server_post_id = ?,
        error = ?,
        retry_count = ?,
        last_error_at = ?,
        is_draft = ?,
        notification_shown = ?,
        created_at = ?,
        updated_at = ?
      WHERE job_id = ?
    `,
    [
      stored.owner_id,
      stored.client_post_id,
      stored.content,
      stored.mode,
      stored.content_type,
      stored.selected_community,
      stored.community_name,
      stored.tribe_name,
      stored.media,
      stored.status,
      stored.progress,
      stored.server_post_id,
      stored.error,
      stored.retry_count,
      stored.last_error_at,
      stored.is_draft,
      stored.notification_shown,
      stored.created_at,
      stored.updated_at,
      jobId,
    ]
  );
}

export async function updatePostMedia(
  jobId: string,
  mediaKey: string,
  updates: Partial<PostMediaUpload>
): Promise<void> {
  const job =
    await getPostUploadJob(
      jobId
    );

  if (!job) {
    throw new Error(
      `Post upload job ${jobId} was not found.`
    );
  }

  const mediaIndex =
    job.media.findIndex(
      media =>
        media.media_key ===
        mediaKey
    );

  if (
    mediaIndex === -1
  ) {
    throw new Error(
      `Media ${mediaKey} was not found in post ${jobId}.`
    );
  }

  const media =
    job.media[
      mediaIndex
    ];

  const updatedMedia: PostMediaUpload = {
    ...media,
    ...updates,
  };

  const updatedMediaList =
    [...job.media];

  updatedMediaList[
    mediaIndex
  ] = updatedMedia;

  await updatePostUploadJob(
    jobId,
    {
      media:
        updatedMediaList,
    }
  );
}

export async function savePostUploadedPart(
  jobId: string,
  mediaKey: string,
  part: PostUploadedPart
): Promise<void> {
  const job =
    await getPostUploadJob(
      jobId
    );

  if (!job) {
    throw new Error(
      `Post upload job ${jobId} was not found.`
    );
  }

  const media =
    job.media.find(
      item =>
        item.media_key ===
        mediaKey
    );

  if (!media) {
    throw new Error(
      `Media ${mediaKey} was not found.`
    );
  }

  const parts =
    [
      ...(media.uploaded_parts || []),
    ];

  const existingIndex =
    parts.findIndex(
      item =>
        item.part_number ===
        part.part_number
    );

  if (
    existingIndex >= 0
  ) {
    parts[
      existingIndex
    ] = part;
  } else {
    parts.push(part);
  }

  parts.sort(
    (
      a,
      b
    ) =>
      a.part_number -
      b.part_number
  );

  const completedBytes =
    parts.reduce(
      (
        total,
        item
      ) =>
        total + item.size,
      0
    );

  const progress =
    media.file_size > 0
      ? Math.min(
          99,
          Math.round(
            (
              completedBytes /
              media.file_size
            ) * 100
          )
        )
      : 0;

  await updatePostMedia(
    jobId,
    mediaKey,
    {
      uploaded_parts:
        parts,

      progress,

      status:
        "uploading",
    }
  );
}

export async function recalculatePostProgress(
  jobId: string
): Promise<number> {
  const job =
    await getPostUploadJob(
      jobId
    );

  if (!job) {
    throw new Error(
      `Post upload job ${jobId} was not found.`
    );
  }

  if (!job.media.length) {
    await updatePostUploadJob(
      jobId,
      {
        progress: 100,
      }
    );

    return 100;
  }

  const totalSize =
    job.media.reduce(
      (
        total,
        media
      ) =>
        total +
        media.file_size,
      0
    );

  if (!totalSize) {
    return 0;
  }

  const completedBytes =
    job.media.reduce(
      (
        total,
        media
      ) => {
        const mediaProgress =
          Math.min(
            100,
            Math.max(
              0,
              media.progress || 0
            )
          );

        return (
          total +
          (
            media.file_size *
            mediaProgress
          ) /
            100
        );
      },
      0
    );

  const progress =
    Math.round(
      (
        completedBytes /
        totalSize
      ) * 100
    );

  await updatePostUploadJob(
    jobId,
    {
      progress:
        Math.min(
          100,
          progress
        ),
    }
  );

  return progress;
}

export async function markPostUploadUploading(
  jobId: string
): Promise<void> {
  await updatePostUploadJob(
    jobId,
    {
      status:
        "uploading",

      error:
        undefined,
    }
  );
}

export async function markPostUploadCreating(
  jobId: string
): Promise<void> {
  await updatePostUploadJob(
    jobId,
    {
      status:
        "creating",

      error:
        undefined,
    }
  );
}

export async function markPostUploadPaused(
  jobId: string,
  error?: string
): Promise<void> {
  await updatePostUploadJob(
    jobId,
    {
      status:
        "paused",

      ...(error
        ? {
            error,
          }
        : {}),
    }
  );
}

export async function markPostUploadFailed(
  jobId: string,
  error?: string
): Promise<void> {
  const job =
    await getPostUploadJob(
      jobId
    );

  if (!job) {
    throw new Error(
      `Post upload job ${jobId} was not found.`
    );
  }

  await updatePostUploadJob(
    jobId,
    {
      status:
        "failed",

      retry_count:
        (job.retry_count || 0) + 1,

      last_error_at:
        Date.now(),

      ...(error
        ? {
            error,
          }
        : {}),
    }
  );
}

export async function markPostUploadCompleted(
  jobId: string,
  serverPostId: number | string
): Promise<void> {
  await updatePostUploadJob(
    jobId,
    {
      status:
        "completed",

      progress:
        100,

      server_post_id:
        serverPostId,

      error:
        undefined,
    }
  );
}

export async function markPostUploadCancelled(
  jobId: string
): Promise<void> {
  await updatePostUploadJob(
    jobId,
    {
      status:
        "cancelled",
    }
  );
}

export async function deletePostUploadJob(
  jobId: string
): Promise<void> {
  const db =
    await openDatabase();

  await db.runAsync(
    `
      DELETE FROM ${TABLE_NAME}
      WHERE job_id = ?
    `,
    [jobId]
  );
}

export async function cleanupFinishedPostUploadJobs(
  ownerId: string
): Promise<void> {
  const jobs =
    await getPostUploadJobs(
      ownerId
    );

  for (const job of jobs) {
    if (
      job.status === "completed" ||
      job.status === "cancelled"
    ) {
      await deletePostUploadJob(
        job.job_id
      );
    }
  }
}

export async function countActivePostUploadJobs(
  ownerId: string
): Promise<number> {
  const jobs =
    await getActivePostUploadJobs(
      ownerId
    );

  return jobs.filter(
    job =>
      job.status !==
        "completed" &&
      job.status !==
        "cancelled"
  ).length;
}