'use client';

const DB_NAME = 'tribe-post-uploads';
const DB_VERSION = 1;
const STORE_NAME = 'post_jobs';

export type PostUploadJobStatus =
  | 'queued'
  | 'uploading'
  | 'creating'
  | 'paused'
  | 'failed'
  | 'completed'
  | 'cancelled';

export type PostMediaType =
  | 'image'
  | 'video';

export type PostUploadedPart = {
  part_number: number;
  etag: string;
  size: number;
};

export type PostMediaUpload = {

  media_key: string;

  file: File;

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
    | 'queued'
    | 'compressing'
    | 'uploading'
    | 'paused'
    | 'uploaded'
    | 'failed';

  progress: number;

  error?: string;
};


export type StoredPostUploadJob = {

  job_id: string;

  owner_id: string;

  client_post_id: string;

  content: string;

  mode: 'global' | 'community' | 'reel';

  content_type:
    | 'text'
    | 'image'
    | 'long_video'
    | 'short_video';

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

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (
      typeof window === 'undefined' ||
      !window.indexedDB
    ) {
      reject(
        new Error(
          'IndexedDB is not available in this browser.'
        )
      );

      return;
    }

    const request = indexedDB.open(
      DB_NAME,
      DB_VERSION
    );

    request.onupgradeneeded = () => {
      const db = request.result;

      if (
        !db.objectStoreNames.contains(
          STORE_NAME
        )
      ) {
        const store =
          db.createObjectStore(
            STORE_NAME,
            {
              keyPath: 'job_id',
            }
          );

        store.createIndex(
          'owner_id',
          'owner_id',
          {
            unique: false,
          }
        );

        store.createIndex(
          'status',
          'status',
          {
            unique: false,
          }
        );

        store.createIndex(
          'created_at',
          'created_at',
          {
            unique: false,
          }
        );

        store.createIndex(
          'updated_at',
          'updated_at',
          {
            unique: false,
          }
        );

        store.createIndex(
          'client_post_id',
          'client_post_id',
          {
            unique: false,
          }
        );
      }
    };

    request.onsuccess = () => {
      const db = request.result;

      db.onversionchange = () => {
        db.close();
      };

      resolve(db);
    };

    request.onerror = () => {
      reject(
        request.error ||
        new Error(
          'Failed to open post upload database.'
        )
      );
    };
  });
}

export async function createPostUploadJob(
  job: StoredPostUploadJob
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
          'readwrite'
        );

      const store =
        transaction.objectStore(
          STORE_NAME
        );

      store.put({
        ...job,
        created_at:
          job.created_at ||
          Date.now(),

        updated_at:
          Date.now(),
      });

      transaction.oncomplete = () => {
        db.close();
        resolve();
      };

      transaction.onerror = () => {
        db.close();

        reject(
          transaction.error ||
          new Error(
            'Failed to create post upload job.'
          )
        );
      };

      transaction.onabort = () => {
        db.close();

        reject(
          transaction.error ||
          new Error(
            'Post upload transaction was aborted.'
          )
        );
      };
    }
  );
}

export async function getPostUploadJob(
  jobId: string
): Promise<StoredPostUploadJob | null> {
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
          'readonly'
        );

      const store =
        transaction.objectStore(
          STORE_NAME
        );

      const request =
        store.get(jobId);

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
            'Failed to get post upload job.'
          )
        );
      };
    }
  );
}

export async function getPostUploadJobByClientPostId(
  clientPostId: string
): Promise<StoredPostUploadJob | null> {
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
          'readonly'
        );

      const store =
        transaction.objectStore(
          STORE_NAME
        );

      const index =
        store.index(
          'client_post_id'
        );

      const request =
        index.get(
          clientPostId
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
            'Failed to find post upload job.'
          )
        );
      };
    }
  );
}

export async function getPostUploadJobs(
  ownerId: string
): Promise<StoredPostUploadJob[]> {
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
          'readonly'
        );

      const store =
        transaction.objectStore(
          STORE_NAME
        );

      const index =
        store.index(
          'owner_id'
        );

      const request =
        index.getAll(
          ownerId
        );

      request.onsuccess = () => {
        db.close();

        const jobs =
          (
            request.result ||
            []
          ) as StoredPostUploadJob[];

        jobs.sort(
          (
            a,
            b
          ) =>
            b.updated_at -
            a.updated_at
        );

        resolve(jobs);
      };

      request.onerror = () => {
        db.close();

        reject(
          request.error ||
          new Error(
            'Failed to get post upload jobs.'
          )
        );
      };
    }
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
      job.status === 'queued' ||
      job.status === 'uploading' ||
      job.status === 'creating' ||
      job.status === 'paused' ||
      job.status === 'failed'
  );
}

export async function updatePostUploadJob(
  jobId: string,
  updates: Partial<StoredPostUploadJob>
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
          'readwrite'
        );

      const store =
        transaction.objectStore(
          STORE_NAME
        );

      const request =
        store.get(
          jobId
        );

      request.onsuccess = () => {
        const existing =
          request.result as
            | StoredPostUploadJob
            | undefined;

        if (!existing) {
          transaction.abort();

          reject(
            new Error(
              `Post upload job ${jobId} was not found.`
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
            'Failed to read post upload job.'
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
            'Failed to update post upload job.'
          )
        );
      };

      transaction.onabort = () => {
        db.close();

        reject(
          transaction.error ||
          new Error(
            'Post upload update was aborted.'
          )
        );
      };
    }
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
        'uploading',
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
        'uploading',
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
        'creating',
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
        'paused',

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
        'failed',

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
        'completed',

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
        'cancelled',
    }
  );
}

export async function deletePostUploadJob(
  jobId: string
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
          'readwrite'
        );

      const store =
        transaction.objectStore(
          STORE_NAME
        );

      store.delete(
        jobId
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
            'Failed to delete post upload job.'
          )
        );
      };
    }
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
      job.status === 'completed' ||
      job.status === 'cancelled'
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
        'completed' &&
      job.status !==
        'cancelled'
  ).length;
}