"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  emitPostCreated,
} from "@/lib/postEvents";
import toast from "react-hot-toast";

import { postUploadManager } from "@/utils/postUploadManager";

import {
  type StoredPostUploadJob,
} from "@/lib/postUploadDB";

import {
  type UploadedMedia,
  toPostMediaPayload,
} from "@/utils/media";

import {
  useNetwork,
} from "@/components/networkConnection/NetworkContext";

import { apiRequest } from "@/utils/api";

import {
  insertFeedPost,
} from "@/lib/feedDb";

type CreatePostResponse = {
  id: number;
  content_type?: string;
  require_post_approval?: boolean;
  status?: string;
  [key: string]: unknown;
};

type UploadResult = {
  media_id: string | number;
  original_url: string;
  thumbnail_url?: string | null;
  media_type?: string;
  file?: File;
  [key: string]: unknown;
};

type CreatePostRequest = (
  job: StoredPostUploadJob,
  media: UploadResult[],
) => Promise<CreatePostResponse>;

type PostUploadContextValue = {
  jobs: StoredPostUploadJob[];

  isReady: boolean;
  isOnline: boolean;

  activeJobs: StoredPostUploadJob[];
  uploadingJobs: StoredPostUploadJob[];
  failedJobs: StoredPostUploadJob[];
  pausedJobs: StoredPostUploadJob[];
  completedJobs: StoredPostUploadJob[];

  enqueuePost: (
    job: StoredPostUploadJob,
  ) => Promise<StoredPostUploadJob>;

  retryJob: (
    jobId: string,
  ) => Promise<void>;

  pauseJob: (
    jobId: string,
  ) => Promise<void>;

  resumeJob: (
    jobId: string,
  ) => Promise<void>;

  cancelJob: (
    jobId: string,
  ) => Promise<void>;

  refreshJobs: () => Promise<void>;

  getJob: (
    jobId: string,
  ) => Promise<StoredPostUploadJob | null>;
};

const PostUploadContext =
  createContext<PostUploadContextValue | null>(null);

type Props = {
  children: React.ReactNode;

  ownerId: string | number;

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

export function PostUploadProvider({
  children,
  ownerId,
  onOptimisticPost,
  onPostCreated,
  onError,
  onCompleted,
  onCancelled,
}: Props) {
  const [jobs, setJobs] =
    useState<StoredPostUploadJob[]>([]);

  const { isOnline } = useNetwork();
  const [isReady, setIsReady] =
    useState(false);

  const mountedRef =
    useRef(true);

  const initializedRef =
    useRef(false);

  console.log(
    "[POST PROVIDER][RENDER]",
    {
      ownerId,
      ownerIdType: typeof ownerId,
      isOnline,
      initialized: initializedRef.current,
    }
  );
  const callbacksRef = useRef({
    onOptimisticPost,
    onPostCreated,
    onError,
    onCompleted,
    onCancelled,
  });

  useEffect(() => {
    callbacksRef.current = {
      onOptimisticPost,
      onPostCreated,
      onError,
      onCompleted,
      onCancelled,
    };
  }, [
    onOptimisticPost,
    onPostCreated,
    onError,
    onCompleted,
    onCancelled,
  ]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refreshJobs =
    useCallback(async () => {
      console.log(
        "[POST PROVIDER][REFRESH][1] Starting refreshJobs()"
      );
  
      try {
        const nextJobs =
          await postUploadManager.getJobs();
  
        console.log(
          "[POST PROVIDER][REFRESH][2] Manager returned jobs",
          {
            count: nextJobs.length,
            jobs: nextJobs.map((job) => ({
              jobId: job.job_id,
              ownerId: job.owner_id,
              status: job.status,
              progress: job.progress,
              mediaCount: job.media?.length ?? 0,
            })),
          }
        );
  
        const sortedJobs =
          [...nextJobs].sort(
            (a, b) =>
              b.created_at -
              a.created_at
          );
  
        if (!mountedRef.current) {
          console.warn(
            "[POST PROVIDER][REFRESH][STOP] Component no longer mounted"
          );
          return;
        }
  
        setJobs(sortedJobs);
  
        console.log(
          "[POST PROVIDER][REFRESH][3] jobs state updated"
        );
      } catch (error) {
        console.error(
          "[POST PROVIDER][REFRESH][ERROR] refreshJobs failed",
          error
        );
  
        throw error;
      }
    }, []);

  useEffect(() => {
    console.log(
      "[PostUploadProvider][NETWORK]",
      {
        isOnline,
        isReady,
      },
    );
  
    if (!isReady) {
      console.log(
        "[PostUploadProvider][NETWORK] Manager not ready yet",
      );
  
      return;
    }
  
    console.log(
      "[PostUploadProvider][NETWORK] Sending state to manager:",
      isOnline,
    );
  
    postUploadManager.setNetworkState(
      isOnline,
    );
  
    void refreshJobs();
  }, [
    isOnline,
    isReady,
    refreshJobs,
  ]);
  
  const createPost =
    useCallback<CreatePostRequest>(
      async (
        job,
        media,
      ) => {
        console.log(
          "[POST PROVIDER][CREATE POST][1] Preparing API request",
          {
            jobId: job.job_id,
            clientPostId: job.client_post_id,
            contentType: job.content_type,
            community: job.selected_community,
            mediaCount: media.length,
          }
        );
        
        const media_files = media.map((item) => ({
          media_id: String(item.media_id),
          original_url: item.original_url,
          thumbnail_url: item.thumbnail_url ?? null,
          media_type: item.media_type ?? null,
        }));
        
        console.log(
          "[POST PROVIDER][CREATE POST][2] Media payload created",
          {
            mediaCount:
              media_files.length,
            mediaFiles: media_files,
          }
        );
        
        const payload = {
          caption: job.content,
        
          content_type:
            job.content_type,
        
          media_files,
        
          community:
            job.selected_community,
        
          client_post_id:
            job.client_post_id,
        };
        
        console.log(
          "[POST PROVIDER][CREATE POST][3] Calling apiRequest()",
          {
            jobId: job.job_id,
            payload,
          }
        );
        
        const newPost =
          await apiRequest(
            "api/post/",
            {
              method: "POST",
              data: payload,
            }
          );
        
        console.log(
          "[POST PROVIDER][CREATE POST][4] apiRequest() RETURNED",
          {
            jobId: job.job_id,
            response: newPost,
          }
        );
        
        if (
          !newPost ||
          newPost.id == null
        ) {
          console.error(
            "[POST PROVIDER][CREATE POST][STOP] INVALID API RESPONSE",
            {
              newPost,
            }
          );
        
          throw new Error(
            "Post API returned an invalid response."
          );
        }
        
        console.log(
          "[POST PROVIDER][CREATE POST][5] POST CREATED SUCCESSFULLY",
          {
            postId: newPost.id,
            jobId: job.job_id,
          }
        );
        
        return newPost;
      },
      [],
    );

  const handleOptimisticPost =
    useCallback(
      (
        job: StoredPostUploadJob,
      ) => {
        callbacksRef.current
          .onOptimisticPost?.(
            job,
          );
      },
      [],
    );

  const handlePostCreated =
    useCallback(
      async (
        job: StoredPostUploadJob,
        serverPost: CreatePostResponse,
      ) => {
        try {
  
          const requiresApproval =
            serverPost.require_post_approval === true;
  
          console.log(
            "[POST PROVIDER][POST CREATED]",
            {
              postId: serverPost.id,
              status: serverPost.status,
              requiresApproval,
              contentType:
                serverPost.content_type,
            }
          );
  
          const feedPost = {
            ...serverPost,
  
            reactKey:
              `post-${serverPost.id}`,
  
            feed_type:
              "post",
  
            is_starred_by_user:
              false,
  
            _local_created:
              true,
  
            requires_approval:
              requiresApproval,
  
            is_pending_approval:
              requiresApproval,
          };
  
          if (!requiresApproval) {
            await insertFeedPost(
              "all",
              null,
              feedPost,
            );
  
            if (
              job.selected_community
            ) {
              await insertFeedPost(
                "tribes",
                job.selected_community,
                feedPost,
              );
            }
          }
  
          if (
            !requiresApproval &&
            serverPost.content_type ===
              "short_video"
          ) {
            if (
              typeof window !==
              "undefined"
            ) {
              sessionStorage.setItem(
                "clicked_reel_id",
                String(
                  serverPost.id,
                ),
              );
            }
          }
  
          toast.success(
            requiresApproval
              ? "Post submitted for approval!"
              : "Post created successfully!"
          );
  
          callbacksRef.current
            .onPostCreated?.(
              job,
              serverPost,
            );
  
          if (!requiresApproval) {
            emitPostCreated(
              feedPost,
            );
          }
  
        } catch (error) {
          console.error(
            "[PostUploadProvider] Feed insertion failed:",
            error,
          );
  
          callbacksRef.current
            .onError?.(
              job,
              error,
            );
        }
      },
      [],
    );

  useEffect(() => {
    console.log(
      "[POST PROVIDER][INIT][0] Initialization effect entered",
      {
        ownerId,
        ownerIdType: typeof ownerId,
        isOnline,
        alreadyInitialized:
          initializedRef.current,
      }
    );
  
    if (isReady) {
      console.log(
        "[POST PROVIDER][INIT][STOP] Already ready"
      );
  
      return;
    }

    if (initializedRef.current) {
      console.log(
        "[POST PROVIDER][INIT][STOP] Already initialized"
      );
  
      return;
    }
  
    if (
      ownerId === null ||
      ownerId === undefined ||
      ownerId === ""
    ) {
      console.error(
        "[POST PROVIDER][INIT][STOP] MISSING OWNER ID",
        {
          ownerId,
          ownerIdType: typeof ownerId,
        }
      );
  
      return;
    }
  
    console.log(
      "[POST PROVIDER][INIT][PASS] ownerId exists",
      {
        ownerId,
      }
    );
  
    initializedRef.current = true;
    let cancelled = false;
  
    const configureManager =
      async () => {
        console.log(
          "[POST PROVIDER][INIT][1] Starting manager configuration"
        );
  
        try {
          console.log(
            "[POST PROVIDER][INIT][1A] Calling manager.configure()"
          );
  
          postUploadManager.configure({
            ownerId,
  
            createPost,
  
            onOptimisticPost:
              handleOptimisticPost,
  
            onPostCreated:
              (
                job,
                serverPost,
              ) => {
                console.log(
                  "[POST PROVIDER][CALLBACK][POST CREATED]",
                  {
                    jobId: job.job_id,
                    serverPostId:
                      serverPost.id,
                  }
                );
  
                void handlePostCreated(
                  job,
                  serverPost,
                ).finally(() => {
                  console.log(
                    "[POST PROVIDER][CALLBACK][POST CREATED] Feed handling finished"
                  );
  
                  void refreshJobs();
                });
              },
  
            onError:
              (
                job,
                error,
              ) => {
                console.error(
                  "[POST PROVIDER][CALLBACK][ERROR]",
                  {
                    jobId: job.job_id,
                    error,
                  }
                );
  
                callbacksRef.current
                  .onError?.(
                    job,
                    error,
                  );
  
                void refreshJobs();
              },
  
            onCompleted:
              (job) => {
                console.log(
                  "[POST PROVIDER][CALLBACK][COMPLETED]",
                  {
                    jobId: job.job_id,
                  }
                );
  
                callbacksRef.current
                  .onCompleted?.(
                    job,
                  );
  
                void refreshJobs();
              },
  
            onCancelled:
              (jobId) => {
                console.log(
                  "[POST PROVIDER][CALLBACK][CANCELLED]",
                  {
                    jobId,
                  }
                );
  
                callbacksRef.current
                  .onCancelled?.(
                    jobId,
                  );
  
                void refreshJobs();
              },
          });
  
          console.log(
            "[POST PROVIDER][INIT][1B] manager.configure() returned"
          );
  
          console.log(
            "[POST PROVIDER][INIT][2] Calling manager.setNetworkState()",
            {
              isOnline,
            }
          );
  
          postUploadManager.setNetworkState(
            isOnline
          );
  
          console.log(
            "[POST PROVIDER][INIT][2B] setNetworkState() returned"
          );
  
          console.log(
            "[POST PROVIDER][INIT][3] Calling refreshJobs()"
          );
  
          await refreshJobs();
  
          console.log(
            "[POST PROVIDER][INIT][3B] refreshJobs() returned"
          );
  
          if (
            cancelled ||
            !mountedRef.current
          ) {
            console.warn(
              "[POST PROVIDER][INIT][STOP] Cancelled/unmounted before ready",
              {
                cancelled,
                mounted:
                  mountedRef.current,
              }
            );
  
            return;
          }
  
          console.log(
            "[POST PROVIDER][INIT][5] isReady state requested"
          );
  
          console.log(
            "[POST PROVIDER][INIT][6] Calling manager.start()"
          );
  
          await postUploadManager.start();
  
          console.log(
            "[POST PROVIDER][INIT][7] manager.start() returned"
          );
  
          await refreshJobs();
  
          console.log(
            "[POST PROVIDER][INIT][4] Setting isReady=true"
          );
  
          setIsReady(true);
  
          console.log(
            "[POST PROVIDER][INIT][8] FINAL INITIALIZATION COMPLETE"
          );
  
        } catch (error) {
          console.error(
            "[POST PROVIDER][INIT][ERROR] INITIALIZATION FAILED",
            error
          );
        }
      };
  
    void configureManager();
  
    return () => {
      cancelled = true;
  
      console.log(
        "[POST PROVIDER][INIT][CLEANUP]",
        {
          ownerId,
        }
      );
    };
  }, [
    ownerId,
    createPost,
    isOnline,
    handleOptimisticPost,
    handlePostCreated,
    refreshJobs,
  ]);

  useEffect(() => {
    const unsubscribe =
      postUploadManager.subscribe(
        (nextJobs) => {
          if (
            !mountedRef.current
          ) {
            return;
          }

          const sortedJobs =
            [...nextJobs].sort(
              (a, b) =>
                b.created_at -
                a.created_at,
            );

          setJobs(sortedJobs);
        },
      );

    return () => {
      unsubscribe();
    };
  }, []);

  const enqueuePost =
    useCallback(
      async (
        job: StoredPostUploadJob,
      ) => {
        console.log(
          "[POST PROVIDER][ENQUEUE][0] enqueuePost ENTERED",
          {
            ownerId,
            jobId: job?.job_id,
            jobOwnerId: job?.owner_id,
            status: job?.status,
            mediaCount: job?.media?.length,
            contentType: job?.content_type,
          }
        );
        console.log(
          "[PostUploadProvider][1] enqueuePost()",
          {
            providerOwnerId:
              ownerId,
  
            providerOwnerIdString:
              String(ownerId),
  
            jobOwnerId:
              job.owner_id,
  
            jobOwnerIdString:
              String(job.owner_id),
  
            ownerMatch:
              String(job.owner_id) ===
              String(ownerId),
  
            jobId:
              job.job_id,
  
            clientPostId:
              job.client_post_id,
  
            status:
              job.status,
  
            mediaCount:
              job.media.length,
  
            isOnline,
          },
        );
  
        if (
          String(job.owner_id) !==
          String(ownerId)
        ) {
          console.error(
            "[PostUploadProvider][STOP] OWNER MISMATCH",
            {
              providerOwnerId:
                ownerId,
              jobOwnerId:
                job.owner_id,
            },
          );
  
          throw new Error(
            "Cannot enqueue a post belonging to another user.",
          );
        }
  
        console.log(
          "[PostUploadProvider][2] Owner check PASSED",
        );
  
        console.log(
          "[PostUploadProvider][3] Calling manager.enqueue()",
        );
  
        const createdJob =
          await postUploadManager.enqueue(
            job,
          );
  
        console.log(
          "[PostUploadProvider][4] manager.enqueue() RETURNED",
          {
            jobId:
              createdJob.job_id,
            status:
              createdJob.status,
            progress:
              createdJob.progress,
          },
        );
        
        console.log(
          "[POST PROVIDER][ENQUEUE][MANAGER RETURNED]",
          {
            jobId: createdJob.job_id,
            status: createdJob.status,
            progress: createdJob.progress,
            media: createdJob.media.map(
              (m) => ({
                mediaKey: m.media_key,
                status: m.status,
                progress: m.progress,
                fileName: m.file_name,
              })
            ),
          }
        );
  
        await refreshJobs();
  
        console.log(
          "[PostUploadProvider][5] refreshJobs() complete",
        );
  
        return createdJob;
      },
      [
        ownerId,
        refreshJobs,
        isOnline,
      ],
    );

  const retryJob =
    useCallback(
      async (
        jobId: string,
      ) => {
        await postUploadManager.retry(
          jobId,
        );

        await refreshJobs();
      },
      [refreshJobs],
    );

  const pauseJob =
    useCallback(
      async (
        jobId: string,
      ) => {
        await postUploadManager.pause(
          jobId,
        );

        await refreshJobs();
      },
      [refreshJobs],
    );

  const resumeJob =
    useCallback(
      async (
        jobId: string,
      ) => {
        await postUploadManager.resume(
          jobId,
        );

        await refreshJobs();
      },
      [refreshJobs],
    );

  const cancelJob =
    useCallback(
      async (
        jobId: string,
      ) => {
        await postUploadManager.cancel(
          jobId,
        );

        await refreshJobs();
      },
      [refreshJobs],
    );

  const getJob =
    useCallback(
      async (
        jobId: string,
      ) => {
        return postUploadManager.getJob(
          jobId,
        );
      },
      [],
    );

  const activeJobs =
    useMemo(
      () =>
        jobs.filter(
          (job) =>
            job.status !==
              "completed" &&
            job.status !==
              "cancelled",
        ),
      [jobs],
    );

  const uploadingJobs =
    useMemo(
      () =>
        jobs.filter(
          (job) =>
            job.status ===
              "uploading" ||
            job.status ===
              "creating",
        ),
      [jobs],
    );

  const failedJobs =
    useMemo(
      () =>
        jobs.filter(
          (job) =>
            job.status ===
            "failed",
        ),
      [jobs],
    );

  const pausedJobs =
    useMemo(
      () =>
        jobs.filter(
          (job) =>
            job.status ===
            "paused",
        ),
      [jobs],
    );

  const completedJobs =
    useMemo(
      () =>
        jobs.filter(
          (job) =>
            job.status ===
            "completed",
        ),
      [jobs],
    );

  const value =
    useMemo<PostUploadContextValue>(
      () => ({
        jobs,

        isReady,
        isOnline,

        activeJobs,
        uploadingJobs,
        failedJobs,
        pausedJobs,
        completedJobs,

        enqueuePost,

        retryJob,
        pauseJob,
        resumeJob,
        cancelJob,

        refreshJobs,
        getJob,
      }),
      [
        jobs,

        isReady,
        isOnline,

        activeJobs,
        uploadingJobs,
        failedJobs,
        pausedJobs,
        completedJobs,

        enqueuePost,

        retryJob,
        pauseJob,
        resumeJob,
        cancelJob,

        refreshJobs,
        getJob,
      ],
    );

  return (
    <PostUploadContext.Provider
      value={value}
    >
      {children}
    </PostUploadContext.Provider>
  );
}

export function usePostUpload() {
  const context =
    useContext(
      PostUploadContext,
    );

  if (!context) {
    throw new Error(
      "usePostUpload must be used inside PostUploadProvider",
    );
  }

  return context;
}