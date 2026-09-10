"use client";

import {
  createPostUploadJob,
  getPostUploadJobs,
  getPostUploadJob,
  updatePostUploadJob,
  updatePostMedia,
  markPostUploadPaused,
  markPostUploadUploading,
  markPostUploadCreating,
  markPostUploadFailed,
  markPostUploadCompleted,
  markPostUploadCancelled,
  deletePostUploadJob,
  recalculatePostProgress,
  type StoredPostUploadJob,
  type PostMediaUpload,
} from "@/lib/postUploadDB";

import {
  uploadFile,
} from "@/utils/mediaUpload/uploadFile";

import {
  compressImage,
} from "@/utils/compressImage";

import {
  getCompressedVideo,
  getCompressedVideoKey,
  saveCompressedVideo,
  deleteCompressedVideo,
} from "@/utils/mediaUpload/compressedVideoStore";

import type {
  NetworkStatus,
  ConnectionType,
} from "@/components/networkConnection/NetworkContext";

type ManagerStatus =
  | "idle"
  | "running"
  | "paused"
  | "destroyed";

type UploadManagerListener = (
  jobs: StoredPostUploadJob[],
) => void;

export type CreatePostResponse = {
  id: number;
  [key: string]: unknown;
};

export type UploadResult = {
  media_id: string | number;
  original_url: string;
  thumbnail_url?: string | null;
  media_type?: string;
  [key: string]: unknown;
};

type CreatePostFn = (
  job: StoredPostUploadJob,
  media: UploadResult[],
) => Promise<CreatePostResponse>;

type ManagerCallbacks = {
  createPost: CreatePostFn;

  onOptimisticPost?: (
    job: StoredPostUploadJob,
  ) => void;

  onPostCreated?: (
    job: StoredPostUploadJob,
    serverPost: CreatePostResponse,
  ) => void;

  onError?: (
    job: StoredPostUploadJob,
    error: unknown,
  ) => void;

  onCompleted?: (
    job: StoredPostUploadJob,
  ) => void;

  onCancelled?: (
    jobId: string,
  ) => void;
};

type CompressionResult = {
  file: File;
  compressedVideoKey?: string;
};

const MAX_POST_JOBS = 3;
const MAX_CONCURRENT_MEDIA = 2;

function sleep(
  milliseconds: number,
): Promise<void> {
  return new Promise(
    resolve =>
      setTimeout(
        resolve,
        milliseconds,
      ),
  );
}

function clampProgress(
  value: number,
): number {
  return Math.max(
    0,
    Math.min(
      100,
      Number(value) || 0,
    ),
  );
}

function isFile(
  value: unknown,
): value is File {
  return (
    typeof File !== "undefined" &&
    value instanceof File
  );
}

class PostUploadManager {
  private status: ManagerStatus = "idle";

  private online = true;

  private listeners =
    new Set<UploadManagerListener>();

  private controllers =
    new Map<
      string,
      AbortController
    >();

  private runningJobs =
    new Set<string>();

  private runningMedia = 0;

  private draining = false;

  private generation = 0;

  private destroyed = false;

  private networkStatus: NetworkStatus = "offline";

  private connectionType: ConnectionType = "unknown";

  private ownerId: string | null = null;

  private createPostRequest:
    CreatePostFn | null = null;

  private onOptimisticPost:
    | ((
        job: StoredPostUploadJob,
      ) => void)
    | null = null;

  private onPostCreated:
    | ((
        job: StoredPostUploadJob,
        serverPost: CreatePostResponse,
      ) => void)
    | null = null;

  private onError:
    | ((
        job: StoredPostUploadJob,
        error: unknown,
      ) => void)
    | null = null;

  private onCompleted:
    | ((
        job: StoredPostUploadJob,
      ) => void)
    | null = null;

  private onCancelled:
    | ((
        jobId: string,
      ) => void)
    | null = null;

  setNetworkState(isOnline: boolean) {
    if (this.destroyed) {
      return;
    }
  
    const wasOnline = this.online;
  
    this.online = isOnline;
  
    if (!isOnline) {
      this.status = "paused";
      this.generation++;
  
      for (const controller of this.controllers.values()) {
        controller.abort();
      }
  
      void this.pauseAll();
  
      return;
    }
  
    this.status = "running";
  
    if (!wasOnline) {
      void this.resume();
      void this.drain();
    }
  }
  
  configure(
    options: ManagerCallbacks & {
      ownerId?: string | number | null;
  
      networkStatus?: NetworkStatus;
  
      connectionType?: ConnectionType;
    },
  ) {
    console.log(
      "[PostUploadManager][CONFIGURE]",
      {
        ownerId:
          options.ownerId,
        hasCreatePost:
          !!options.createPost,
      },
    );
  
    if (this.destroyed) {
      return;
    }
  
    this.createPostRequest =
      options.createPost;
  
    this.onOptimisticPost =
      options.onOptimisticPost ??
      null;
  
    this.onPostCreated =
      options.onPostCreated ??
      null;
  
    this.onError =
      options.onError ??
      null;
  
    this.onCompleted =
      options.onCompleted ??
      null;
  
    this.onCancelled =
      options.onCancelled ??
      null;
  
    if (
      options.ownerId !==
        undefined &&
      options.ownerId !== null
    ) {
      this.ownerId =
        String(options.ownerId);
    }
  
    if (
      options.networkStatus !==
        undefined
    ) {
      this.networkStatus =
        options.networkStatus;
    }
  
    if (
      options.connectionType !==
        undefined
    ) {
      this.connectionType =
        options.connectionType;
    }
  }
  
  
  setOwnerId(
    ownerId: string | number | null,
  ) {
    this.ownerId =
      ownerId === null
        ? null
        : String(ownerId);
  }
  
  
  setNetworkQuality(
    networkStatus: NetworkStatus,
    connectionType?: ConnectionType,
  ) {
    this.networkStatus =
      networkStatus;
  
    if (
      connectionType !==
        undefined
    ) {
      this.connectionType =
        connectionType;
    }
  }

  subscribe(
    listener: UploadManagerListener,
  ) {
    this.listeners.add(
      listener,
    );

    return () => {
      this.listeners.delete(
        listener,
      );
    };
  }


  private async notify() {
    try {
      if (!this.ownerId) {
        return;
      }

      const jobs =
        await getPostUploadJobs(
          this.ownerId,
        );

      const sorted =
        [...jobs].sort(
          (a, b) =>
            b.updated_at -
            a.updated_at,
        );

      for (
        const listener of this.listeners
      ) {
        listener(sorted);
      }
    } catch (error) {
      console.error(
        "[PostUploadManager] notify failed",
        error,
      );
    }
  }

  async start() {
    console.log(
      "[PostUploadManager][START][1]",
      {
        ownerId:
          this.ownerId,
        online:
          this.online,
        status:
          this.status,
      },
    );
  
    if (
      this.destroyed ||
      this.status ===
        "destroyed"
    ) {
      return;
    }

    if (
      this.status ===
        "running" &&
      this.draining
    ) {
      return;
    }

    this.status =
      this.online
        ? "running"
        : "paused";

    await this.notify();

    console.log(
      "[PostUploadManager][START][2] Calling drain()",
    );

    if (this.online) {
      void this.drain();
    }

    console.log(
      "[PostUploadManager][START][3] drain() returned",
    );
  }

  async enqueue(
    job: StoredPostUploadJob,
  ) {
    console.log(
      "[PostUploadManager][ENQUEUE][1]",
      {
        jobId:
          job.job_id,
  
        ownerId:
          job.owner_id,
  
        managerOwnerId:
          this.ownerId,
  
        status:
          job.status,
  
        online:
          this.online,
  
        mediaCount:
          job.media.length,
      },
    );
  
    if (
      this.destroyed ||
      this.status ===
        "destroyed"
    ) {
      throw new Error(
        "PostUploadManager has been destroyed.",
      );
    }

    if (!job.owner_id) {
      throw new Error(
        "Post upload job is missing owner_id.",
      );
    }

    this.ownerId =
      String(job.owner_id);

    const existingJobs =
      await getPostUploadJobs(
        this.ownerId,
      );

    const activeJobs =
      existingJobs.filter(
        item =>
          item.status !==
            "completed" &&
          item.status !==
            "cancelled",
      );

    const alreadyExists =
      activeJobs.some(
        item =>
          item.job_id ===
            job.job_id ||
          item.client_post_id ===
            job.client_post_id,
      );

    if (
      !alreadyExists &&
      activeJobs.length >=
        MAX_POST_JOBS
    ) {
      throw new Error(
        "You already have 3 post uploads in progress. Please wait for one to finish.",
      );
    }

    const now =
      Date.now();

    const nextJob: StoredPostUploadJob =
      {
        ...job,

        status:
          this.online
            ? "queued"
            : "paused",

        progress: 0,

        retry_count:
          job.retry_count || 0,

        created_at:
          job.created_at ||
          now,

        updated_at:
          now,
      };

    nextJob.media =
      nextJob.media.map(
        media => ({
          ...media,

          status:
            media.status ===
              "uploaded"
              ? "uploaded"
              : this.online
                ? "queued"
                : "paused",

          progress:
            media.status ===
              "uploaded"
              ? 100
              : clampProgress(
                  media.progress,
                ),

          uploaded_parts:
            media.uploaded_parts ??
            [],
        }),
      );

    await createPostUploadJob(
      nextJob,
    );

    console.log(
      "[PostUploadManager][ENQUEUE][2] Job saved",
      {
        jobId:
          job.job_id,
      },
    );

    this.onOptimisticPost?.(
      nextJob,
    );

    await this.notify();

    console.log(
      "[PostUploadManager][ENQUEUE][3] About to drain",
      {
        online:
          this.online,
      },
    );

    if (this.online) {
      void this.drain();
    }

    return nextJob;
  }

  private async drain() {
    console.log("🔥🔥🔥 [DRAIN][ENTER]", {
      online: this.online,
      destroyed: this.destroyed,
      ownerId: this.ownerId,
      draining: this.draining,
      status: this.status,
      runningJobIds: Array.from(this.runningJobs),
      runningJobs: this.runningJobs.size,
      runningMedia: this.runningMedia,
    });
  
    if (
      this.draining ||
      !this.online ||
      this.destroyed
    ) {
      return;
    }

    if (!this.ownerId) {
      return;
    }

    this.draining = true;

    const drainGeneration =
      this.generation;

    try {
      while (
        this.online &&
        !this.destroyed &&
        drainGeneration ===
          this.generation
      ) {
        const jobs =
          await getPostUploadJobs(
            this.ownerId,
          );

        console.log("🔥🔥🔥 [DRAIN][JOBS]", {
          jobs: jobs.map((job) => ({
            jobId: job.job_id,
            ownerId: job.owner_id,
            status: job.status,
            progress: job.progress,
            mediaCount: job.media?.length ?? 0,
          })),
        });
  
        const candidates =
          jobs
            .filter(
              job =>
                [
                  "queued",
                  "uploading",
                  "creating",
                  "failed",
                  "paused",
                ].includes(
                  job.status,
                ),
            )
            .filter(
              job =>
                !this.runningJobs.has(
                  job.job_id,
                ),
            )
            .sort(
              (a, b) =>
                a.created_at -
                b.created_at,
            );

        if (
          !candidates.length
        ) {
          break;
        }

        let started =
          false;

        for (
          const job of candidates
        ) {
          if (
            this.runningJobs.size >=
            MAX_CONCURRENT_MEDIA
          ) {
            break;
          }

          if (
            this.runningJobs.has(
              job.job_id,
            )
          ) {
            continue;
          }

          this.runningJobs.add(
            job.job_id,
          );

          started = true;

          console.log("🔥🔥🔥 [DRAIN][LAUNCHING PROCESS JOB]", {
            jobId: job.job_id,
            ownerId: job.owner_id,
            status: job.status,
            progress: job.progress,
            mediaCount: job.media?.length ?? 0,
          });

          void this.processJob(
            job,
          )
            .catch(error => {
              console.error(
                "[PostUploadManager] processJob failed",
                error,
              );
            })
            .finally(() => {
              this.runningJobs.delete(
                job.job_id,
              );

              void this.notify();

              void this.drain();
            });
        }

        if (!started) {
          break;
        }

        await sleep(25);
      }
    } finally {
      this.draining = false;
    }
  }

  private async processJob(
    originalJob: StoredPostUploadJob,
  ) {
    console.log(
      "[PostUploadManager][JOB][1] processJob ENTERED",
      {
        jobId:
          originalJob.job_id,
  
        status:
          originalJob.status,
  
        ownerId:
          originalJob.owner_id,
  
        mediaCount:
          originalJob.media?.length ?? 0,
      },
    );
    
    console.log("🔥🔥🔥 [PROCESS JOB][ENTER]", {
      jobId: originalJob?.job_id,
      ownerId: originalJob?.owner_id,
      status: originalJob?.status,
      progress: originalJob?.progress,
      mediaCount: originalJob?.media?.length ?? 0,
    });
  
    console.log(
      "[PostUploadManager][JOB][2] Loading latest job from IndexedDB",
      {
        jobId:
          originalJob.job_id,
      },
    );
  
    let job =
      await getPostUploadJob(
        originalJob.job_id,
      );
  
    console.log(
      "[PostUploadManager][JOB][3] getPostUploadJob() returned",
      {
        found:
          !!job,
  
        jobId:
          job?.job_id,
  
        status:
          job?.status,
  
        progress:
          job?.progress,
  
        mediaCount:
          job?.media?.length ?? 0,
      },
    );
  
    if (!job) {
      console.error(
        "[PostUploadManager][JOB][STOP] Job NOT FOUND in IndexedDB",
        {
          jobId:
            originalJob.job_id,
        },
      );
  
      return;
    }
  
    if (
      job.status ===
        "completed" ||
      job.status ===
        "cancelled"
    ) {
      console.log(
        "[PostUploadManager][JOB][STOP] Job already finished",
        {
          jobId:
            job.job_id,
  
          status:
            job.status,
        },
      );
  
      return;
    }
  
    console.log(
      "[PostUploadManager][JOB][4] Job ready for processing",
      {
        jobId:
          job.job_id,
  
        status:
          job.status,
  
        online:
          this.online,
      },
    );
  
    try {
      if (!this.online) {
        await this.pauseJob(
          job,
        );

        return;
      }

      const uploadedMedia: UploadResult[] =
        [];

      for (
        const media of job.media
      ) {
        if (!this.online) {
          await this.pauseJob(
            job,
          );

          return;
        }

        job =
          (
            await getPostUploadJob(
              job.job_id,
            )
          ) ?? job;

        if (
          job.status ===
            "cancelled"
        ) {
          return;
        }

        /**
         * Already uploaded media.
         */
        if (
          media.status ===
            "uploaded" &&
          media.media_id &&
          media.uploaded_url
        ) {
          uploadedMedia.push({
            media_id:
              media.media_id,

            original_url:
              media.uploaded_url,

            thumbnail_url:
              media.thumbnail_url,

            media_type:
              media.media_type,
          });

          continue;
        }

        const result =
          await this.processMedia(
            job,
            media,
          );

        uploadedMedia.push(
          result,
        );

        job =
          (
            await getPostUploadJob(
              job.job_id,
            )
          ) ?? job;
      }

      if (!this.online) {
        await this.pauseJob(
          job,
        );

        return;
      }

      job =
        (
          await getPostUploadJob(
            job.job_id,
          )
        ) ?? job;

      if (
        job.status ===
          "cancelled"
      ) {
        return;
      }

      await markPostUploadCreating(
        job.job_id,
      );

      await this.notify();

      if (!this.createPostRequest) {
        throw new Error(
          "PostUploadManager.createPost() has not been configured.",
        );
      }

      const serverPost =
        await this.createPostRequest(
          job,
          uploadedMedia,
        );

      /**
       * Post was successfully created.
       */
      await markPostUploadCompleted(
        job.job_id,
        serverPost.id,
      );

      const completedJob =
        (
          await getPostUploadJob(
            job.job_id,
          )
        ) ?? job;

      this.onPostCreated?.(
        completedJob,
        serverPost,
      );

      this.onCompleted?.(
        completedJob,
      );

      await this.notify();
    } catch (error) {
      if (
        this.isAbortError(
          error,
        )
      ) {
        return;
      }

      if (
        !this.online ||
        this.isNetworkError(
          error,
        )
      ) {
        const current =
          (
            await getPostUploadJob(
              originalJob.job_id,
            )
          ) ?? originalJob;

        await this.pauseJob(
          current,
        );

        return;
      }

      const current =
        (
          await getPostUploadJob(
            originalJob.job_id,
          )
        ) ?? originalJob;

      await markPostUploadFailed(
        current.job_id,
        this.getErrorMessage(
          error,
        ),
      );

      const failedJob =
        (
          await getPostUploadJob(
            current.job_id,
          )
        ) ?? current;

      this.onError?.(
        failedJob,
        error,
      );

      await this.notify();
    }
  }

  private async processMedia(
    job: StoredPostUploadJob,
    media: PostMediaUpload,
  ): Promise<UploadResult> {
    console.log("🔥🔥🔥 [PROCESS MEDIA][ENTER]", {
      jobId: job.job_id,
      mediaKey: media.media_key,
      fileName: media.file_name,
      mediaType: media.media_type,
      status: media.status,
      progress: media.progress,
      file: media.file,
      fileType: media.file_type,
      fileSize: media.file_size,
    });
    
    if (!isFile(media.file)) {
      throw new Error(
        `Media file is missing for ${media.media_key}.`,
      );
    }

    if (!this.online) {
      throw new Error(
        "Network connection unavailable.",
      );
    }

    await this.acquireMediaSlot();

    const controller =
      new AbortController();

    const controllerKey =
      `${job.job_id}:${media.media_key}`;

    this.controllers.set(
      controllerKey,
      controller,
    );

    let compressedVideoKey:
      string | undefined;

    try {
      await updatePostMedia(
        job.job_id,
        media.media_key,
        {
          status:
            "compressing",

          progress:
            media.progress > 0
              ? media.progress
              : 0,

          error:
            undefined,
        },
      );

      await recalculatePostProgress(
        job.job_id,
      );

      await this.notify();

      /**
       * ------------------------------
       * 1. COMPRESSION
       * ------------------------------
       */
      const compression =
        await this.prepareMediaFile(
          job,
          media,
          controller,
        );

      compressedVideoKey =
        compression.compressedVideoKey;

      const fileToUpload =
        compression.file;

      if (
        controller.signal.aborted
      ) {
        throw this.createAbortError();
      }

      if (!this.online) {
        throw new Error(
          "Network connection unavailable.",
        );
      }

      /**
       * ------------------------------
       * 2. R2 UPLOAD
       * ------------------------------
       *
       * uploadFile() remains the authority for:
       *
       * - media initialization
       * - multipart upload
       * - uploaded parts
       * - R2 completion
       * - media ID
       * - resumable upload state
       */
      await updatePostMedia(
        job.job_id,
        media.media_key,
        {
          status:
            "uploading",

          progress:
            media.progress >= 50
              ? media.progress
              : 50,

          error:
            undefined,
        },
      );

      await markPostUploadUploading(
        job.job_id,
      );

      await recalculatePostProgress(
        job.job_id,
      );

      await this.notify();

      const uploaded =
        await uploadFile({
          file:
            fileToUpload,

          signal:
            controller.signal,

          onProgress:
            async (
              percent: number,
            ) => {
              if (
                controller.signal.aborted ||
                this.destroyed
              ) {
                return;
              }

              const uploadProgress =
                clampProgress(
                  percent,
                );

              const totalProgress =
                50 +
                Math.round(
                  uploadProgress /
                    2,
                );

              await updatePostMedia(
                job.job_id,
                media.media_key,
                {
                  status:
                    "uploading",

                  progress:
                    clampProgress(
                      totalProgress,
                    ),

                  error:
                    undefined,
                },
              );

              await recalculatePostProgress(
                job.job_id,
              );

              await this.notify();
            },
        });

      if (
        !uploaded ||
        uploaded.media_id ==
          null ||
        !uploaded.original_url
      ) {
        throw new Error(
          "Media upload completed without a valid media ID or URL.",
        );
      }

      const mediaId =
        String(
          uploaded.media_id,
        );

      const originalUrl =
        Array.isArray(
          uploaded.original_url,
        )
          ? uploaded.original_url[0]
          : uploaded.original_url;

      await updatePostMedia(
        job.job_id,
        media.media_key,
        {
          status:
            "uploaded",

          progress:
            100,

          media_id:
            mediaId,

          uploaded_url:
            originalUrl,

          thumbnail_url:
            uploaded.thumbnail_url ??
            undefined,

          error:
            undefined,
        },
      );

      await recalculatePostProgress(
        job.job_id,
      );

      await this.notify();

      if (
        compressedVideoKey
      ) {
        try {
          await deleteCompressedVideo(
            compressedVideoKey,
          );
        } catch (error) {
          console.warn(
            "[PostUploadManager] Could not delete compressed video cache",
            error,
          );
        }
      }

      return {
        ...uploaded,

        media_id:
          mediaId,

        original_url:
          originalUrl,

        thumbnail_url:
          uploaded.thumbnail_url,

        media_type:
          uploaded.media_type ??
          media.media_type,
      };
    } catch (error) {
      /**
       * Never classify an explicit abort as a permanent
       * media failure.
       */
      if (
        this.isAbortError(
          error,
        )
      ) {
        throw error;
      }

      if (
        !this.online ||
        this.isNetworkError(
          error,
        )
      ) {
        await updatePostMedia(
          job.job_id,
          media.media_key,
          {
            status:
              "paused",

            error:
              "Upload paused because the network is unavailable.",
          },
        );

        await recalculatePostProgress(
          job.job_id,
        );

        throw error;
      }

      await updatePostMedia(
        job.job_id,
        media.media_key,
        {
          status:
            "failed",

          error:
            this.getErrorMessage(
              error,
            ),
        },
      );

      await recalculatePostProgress(
        job.job_id,
      );

      await this.notify();

      throw error;
    } finally {
      this.controllers.delete(
        controllerKey,
      );

      this.releaseMediaSlot();
    }
  }

  private async prepareMediaFile(
    job: StoredPostUploadJob,
    media: PostMediaUpload,
    controller: AbortController,
  ): Promise<CompressionResult> {
    const originalFile =
      media.file;

    if (
      !isFile(originalFile)
    ) {
      throw new Error(
        `Original file is unavailable for ${media.media_key}.`,
      );
    }

    if (
      controller.signal.aborted
    ) {
      throw this.createAbortError();
    }

    if (
      originalFile.type.startsWith(
        "image/",
      )
    ) {
      const compressed =
        await compressImage(
          originalFile,
          1.5,
        );

      if (
        controller.signal.aborted
      ) {
        throw this.createAbortError();
      }

      await updatePostMedia(
        job.job_id,
        media.media_key,
        {
          status:
            "uploading",

          progress:
            50,

          error:
            undefined,
        },
      );

      await recalculatePostProgress(
        job.job_id,
      );

      await this.notify();

      return {
        file:
          compressed,
      };
    }

    if (
      originalFile.type.startsWith(
        "video/",
      )
    ) {
      const quality =
        this.getVideoQuality();

      const cacheKey =
        getCompressedVideoKey(
          originalFile,
          quality,
        );

      const cached =
        await getCompressedVideo(
          cacheKey,
        );

      if (
        cached
      ) {
        console.log(
          "[PostUploadManager] Using persisted compressed video:",
          {
            name:
              cached.name,

            size:
              (
                cached.size /
                1024 /
                1024
              ).toFixed(2) +
              " MB",

            quality,
          },
        );

        await updatePostMedia(
          job.job_id,
          media.media_key,
          {
            status:
              "uploading",

            progress:
              50,

            error:
              undefined,
          },
        );

        await recalculatePostProgress(
          job.job_id,
        );

        await this.notify();

        return {
          file:
            cached,

          compressedVideoKey:
            cacheKey,
        };
      }

      const {
        compressVideo,
      } =
        await import(
          "@/utils/mediaUpload/videoCompressor"
        );

      await updatePostMedia(
        job.job_id,
        media.media_key,
        {
          status:
            "compressing",

          progress:
            0,

          error:
            undefined,
        },
      );

      await this.notify();

      const compressed =
        await compressVideo({
          file:
            originalFile,

          networkStatus:
            this.networkStatus,

          connectionType:
            this.connectionType,

          signal:
            controller.signal,

          onProgress:
            async (
              percent: number,
            ) => {
              if (
                controller.signal.aborted
              ) {
                return;
              }

              /**
               * Video compression occupies
               * 0 → 50%.
               */
              const compressionProgress =
                Math.round(
                  clampProgress(
                    percent,
                  ) / 2,
                );

              await updatePostMedia(
                job.job_id,
                media.media_key,
                {
                  status:
                    "compressing",

                  progress:
                    compressionProgress,

                  error:
                    undefined,
                },
              );

              await recalculatePostProgress(
                job.job_id,
              );

              await this.notify();
            },
        });

      if (
        controller.signal.aborted
      ) {
        throw this.createAbortError();
      }

      /**
       * Persist the compressed video BEFORE upload.
       *
       * This means network failure during upload does
       * not require recompression.
       */
      await saveCompressedVideo(
        cacheKey,
        compressed,
        originalFile,
        quality,
      );

      await updatePostMedia(
        job.job_id,
        media.media_key,
        {
          status:
            "uploading",

          progress:
            50,

          error:
            undefined,
        },
      );

      await recalculatePostProgress(
        job.job_id,
      );

      await this.notify();

      return {
        file:
          compressed,

        compressedVideoKey:
          cacheKey,
      };
    }

    throw new Error(
      `Unsupported media type: ${originalFile.type}`,
    );
  }

  private getVideoQuality():
    "720p" | "1080p" {
    if (
      this.networkStatus ===
        "poor" ||
      this.networkStatus ===
        "slow"
    ) {
      return "720p";
    }

    return "1080p";
  }

  private async acquireMediaSlot() {
    while (
      this.runningMedia >=
      MAX_CONCURRENT_MEDIA
    ) {
      if (
        !this.online ||
        this.destroyed
      ) {
        throw new Error(
          "Network unavailable.",
        );
      }

      await sleep(100);
    }

    this.runningMedia++;
  }


  private releaseMediaSlot() {
    this.runningMedia =
      Math.max(
        0,
        this.runningMedia - 1,
      );
  }


  /* =======================================================
     PAUSE
  ======================================================= */

  private async pauseJob(
    job: StoredPostUploadJob,
  ) {
    if (
      job.status ===
        "completed" ||
      job.status ===
        "cancelled"
    ) {
      return;
    }

    /**
     * Abort active media requests belonging to
     * this post.
     */
    for (
      const [
        key,
        controller,
      ] of this.controllers
    ) {
      if (
        key.startsWith(
          `${job.job_id}:`,
        )
      ) {
        controller.abort();
      }
    }

    /**
     * Preserve all persisted upload state.
     */
    await markPostUploadPaused(
      job.job_id,
      "Upload paused because the network is unavailable.",
    );

    await this.notify();
  }


  async pause(
    jobId: string,
  ) {
    const job =
      await getPostUploadJob(
        jobId,
      );

    if (!job) {
      return;
    }

    await this.pauseJob(
      job,
    );

    await this.notify();
  }


  /* =======================================================
     RETRY
  ======================================================= */

  async retry(
    jobId: string,
  ) {
    if (
      this.destroyed
    ) {
      return;
    }

    const job =
      await getPostUploadJob(
        jobId,
      );

    if (!job) {
      throw new Error(
        "Post upload job not found.",
      );
    }

    if (
      job.status ===
        "completed" ||
      job.status ===
        "cancelled"
    ) {
      return;
    }

    /**
     * Only failed/paused media are reset.
     *
     * Already uploaded media remain uploaded.
     */
    for (
      const media of job.media
    ) {
      if (
        media.status ===
          "failed" ||
        media.status ===
          "paused"
      ) {
        await updatePostMedia(
          job.job_id,
          media.media_key,
          {
            status:
              "queued",

            error:
              undefined,
          },
        );
      }
    }

    await updatePostUploadJob(
      job.job_id,
      {
        status:
          this.online
            ? "queued"
            : "paused",

        error:
          undefined,

        updated_at:
          Date.now(),
      },
    );

    await this.notify();

    if (this.online) {
      void this.drain();
    }
  }


  /* =======================================================
     RESUME
  ======================================================= */

  async resume(
    jobId?: string,
  ) {
    if (
      !this.online ||
      this.destroyed
    ) {
      return;
    }

    if (
      jobId
    ) {
      const job =
        await getPostUploadJob(
          jobId,
        );

      if (!job) {
        return;
      }

      if (
        job.status !==
          "completed" &&
        job.status !==
          "cancelled"
      ) {
        /**
         * Only move the post job back to queued.
         *
         * Uploaded media remain untouched.
         */
        await updatePostUploadJob(
          job.job_id,
          {
            status:
              "queued",

            error:
              undefined,
          },
        );

        for (
          const media of job.media
        ) {
          if (
            media.status ===
              "paused"
          ) {
            await updatePostMedia(
              job.job_id,
              media.media_key,
              {
                status:
                  "queued",

                error:
                  undefined,
              },
            );
          }
        }
      }
    } else {
      if (!this.ownerId) {
        return;
      }

      const jobs =
        await getPostUploadJobs(
          this.ownerId,
        );

      for (
        const job of jobs
      ) {
        if (
          job.status ===
            "paused"
        ) {
          await updatePostUploadJob(
            job.job_id,
            {
              status:
                "queued",

              error:
                undefined,
            },
          );

          for (
            const media of job.media
          ) {
            if (
              media.status ===
                "paused"
            ) {
              await updatePostMedia(
                job.job_id,
                media.media_key,
                {
                  status:
                    "queued",

                  error:
                    undefined,
                },
              );
            }
          }
        }
      }
    }

    this.status =
      "running";

    await this.notify();

    void this.drain();
  }


  /* =======================================================
     CANCEL
  ======================================================= */

  async cancel(
    jobId: string,
  ) {
    const job =
      await getPostUploadJob(
        jobId,
      );

    if (!job) {
      return;
    }

    /**
     * Stop all active media requests.
     */
    for (
      const [
        key,
        controller,
      ] of this.controllers
    ) {
      if (
        key.startsWith(
          `${jobId}:`,
        )
      ) {
        controller.abort();
      }
    }

    await markPostUploadCancelled(
      jobId,
    );

    this.onCancelled?.(
      jobId,
    );

    await this.notify();

    try {
      await deletePostUploadJob(
        jobId,
      );
    } catch (error) {
      console.warn(
        "[PostUploadManager] Could not delete cancelled post job",
        error,
      );
    }

    await this.notify();
  }

  async pauseAll() {
    if (!this.ownerId) {
      return;
    }

    const jobs =
      await getPostUploadJobs(
        this.ownerId,
      );

    for (
      const job of jobs
    ) {
      if (
        [
          "queued",
          "uploading",
          "creating",
        ].includes(
          job.status,
        )
      ) {
        await this.pauseJob(
          job,
        );
      }
    }

    this.status =
      "paused";

    await this.notify();
  }

  private handleOnline =
    () => {
      if (
        this.destroyed
      ) {
        return;
      }

      this.online =
        true;

      this.status =
        "running";

      void this.resume();
    };


  private handleOffline =
    () => {
      if (
        this.destroyed
      ) {
        return;
      }

      this.online =
        false;

      this.status =
        "paused";

      this.generation++;

      void this.pauseAll();
    };

  async getJobs() {
    if (!this.ownerId) {
      return [];
    }

    return getPostUploadJobs(
      this.ownerId,
    );
  }


  async getJob(
    jobId: string,
  ) {
    return getPostUploadJob(
      jobId,
    );
  }


  getManagerStatus() {
    return {
      status:
        this.status,

      online:
        this.online,

      runningJobs:
        this.runningJobs.size,

      runningMedia:
        this.runningMedia,

      maxJobs:
        MAX_POST_JOBS,

      maxConcurrentMedia:
        MAX_CONCURRENT_MEDIA,

      ownerId:
        this.ownerId,
    };
  }

  destroy() {
    if (
      this.destroyed
    ) {
      return;
    }

    this.destroyed =
      true;

    this.generation++;

    this.status =
      "destroyed";

    for (
      const controller of
        this.controllers.values()
    ) {
      controller.abort();
    }

    this.controllers.clear();

    this.listeners.clear();
  }


  /* =======================================================
     ERROR HELPERS
  ======================================================= */

  private isAbortError(
    error: unknown,
  ): boolean {
    if (
      typeof DOMException !==
      "undefined"
    ) {
      if (
        error instanceof
          DOMException &&
        error.name ===
          "AbortError"
      ) {
        return true;
      }
    }

    if (
      error instanceof Error &&
      error.name ===
        "AbortError"
    ) {
      return true;
    }

    return false;
  }


  private createAbortError() {
    if (
      typeof DOMException !==
      "undefined"
    ) {
      return new DOMException(
        "Upload was cancelled.",
        "AbortError",
      );
    }

    const error =
      new Error(
        "Upload was cancelled.",
      );

    error.name =
      "AbortError";

    return error;
  }


  private isNetworkError(
    error: unknown,
  ): boolean {
    if (
      !this.online
    ) {
      return true;
    }

    if (
      error instanceof
      TypeError
    ) {
      return true;
    }

    const message =
      this.getErrorMessage(
        error,
      ).toLowerCase();

    return (
      message.includes(
        "network",
      ) ||
      message.includes(
        "failed to fetch",
      ) ||
      message.includes(
        "fetch failed",
      ) ||
      message.includes(
        "connection",
      ) ||
      message.includes(
        "offline",
      ) ||
      message.includes(
        "timeout",
      ) ||
      message.includes(
        "timed out",
      )
    );
  }


  private getErrorMessage(
    error: unknown,
  ): string {
    if (
      error instanceof
      Error
    ) {
      return error.message;
    }

    if (
      typeof error ===
      "string"
    ) {
      return error;
    }

    try {
      const serialized =
        JSON.stringify(
          error,
        );

      return (
        serialized ||
        "Unknown upload error"
      );
    } catch {
      return "Unknown upload error";
    }
  }
}


/* =========================================================
   SINGLE GLOBAL INSTANCE
========================================================= */

export const postUploadManager =
  new PostUploadManager();