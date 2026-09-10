"use client";

import React from "react";
import {
  ChevronDown,
  ChevronUp,
  X,
  RotateCcw,
  Pause,
  Play,
  Upload,
  CheckCircle2,
  AlertCircle,
  Clock3,
  Loader2,
  Video,
  Image as ImageIcon,
} from "lucide-react";
import { useNetwork } from "@/components/networkConnection/NetworkContext";

import { usePostUpload } from "@/components/PostUploadProvider";

type JobStatus =
  | "queued"
  | "uploading"
  | "creating"
  | "paused"
  | "failed"
  | "completed"
  | "cancelled";

type MediaStatus =
  | "queued"
  | "compressing"
  | "uploading"
  | "paused"
  | "uploaded"
  | "failed";

function formatBytes(bytes: number) {
  if (!bytes || bytes < 1) {
    return "0 B";
  }

  const units = [
    "B",
    "KB",
    "MB",
    "GB",
  ];

  const index = Math.floor(
    Math.log(bytes) /
      Math.log(1024),
  );

  return `${(
    bytes /
    Math.pow(
      1024,
      index,
    )
  ).toFixed(index === 0 ? 0 : 1)} ${
    units[index] ?? "GB"
  }`;
}

function getJobTitle(
  job: any,
) {
  if (job.content?.trim()) {
    return job.content.trim();
  }

  if (job.media?.length === 1) {
    return job.media[0].file_name;
  }

  if (job.media?.length > 1) {
    return `${job.media.length} media files`;
  }

  return "New post";
}

function getStatusText(
  status: JobStatus,
) {
  switch (status) {
    case "queued":
      return "Waiting to upload";

    case "uploading":
      return "Uploading media";

    case "creating":
      return "Publishing post";

    case "paused":
      return "Upload paused";

    case "failed":
      return "Upload failed";

    case "completed":
      return "Published";

    case "cancelled":
      return "Cancelled";

    default:
      return "Preparing";
  }
}

function getMediaStatusText(
  status: MediaStatus,
) {
  switch (status) {
    case "queued":
      return "Waiting";

    case "compressing":
      return "Compressing";

    case "uploading":
      return "Uploading";

    case "paused":
      return "Paused";

    case "uploaded":
      return "Uploaded";

    case "failed":
      return "Failed";

    default:
      return "Waiting";
  }
}

function StatusIcon({
  status,
}: {
  status: JobStatus;
}) {
  switch (status) {
    case "uploading":
    case "creating":
      return (
        <Loader2
          className="h-4 w-4 animate-spin"
        />
      );

    case "completed":
      return (
        <CheckCircle2 className="h-4 w-4" />
      );

    case "failed":
      return (
        <AlertCircle className="h-4 w-4" />
      );

    case "paused":
      return (
        <Pause className="h-4 w-4" />
      );

    default:
      return (
        <Clock3 className="h-4 w-4" />
      );
  }
}

function MediaIcon({
  mediaType,
}: {
  mediaType?: string;
}) {
  if (
    mediaType === "video"
  ) {
    return (
      <Video className="h-4 w-4" />
    );
  }

  return (
    <ImageIcon className="h-4 w-4" />
  );
}

function ProgressBar({
  progress,
}: {
  progress: number;
}) {
  const safeProgress = Math.max(
    0,
    Math.min(
      100,
      Number(progress) || 0,
    ),
  );

  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
      <div
        className="h-full rounded-full bg-current transition-all duration-300"
        style={{
          width: `${safeProgress}%`,
        }}
      />
    </div>
  );
}

export default function UploadCenter() {
  const {
    jobs,
    retryJob,
    pauseJob,
    resumeJob,
    cancelJob,
  } = usePostUpload();
  const { isOnline } = useNetwork();

  const [expanded, setExpanded] =
    React.useState(false);

  const activeJobs = jobs.filter(
    (job: any) =>
      job.status !== "completed" &&
      job.status !== "cancelled",
  );
  
  if (!activeJobs.length) {
    return null;
  }

  const uploadingCount =
    activeJobs.filter(
      (job: any) =>
        job.status ===
          "uploading" ||
        job.status ===
          "creating",
    ).length;

  const failedCount =
    activeJobs.filter(
      (job: any) =>
        job.status === "failed",
    ).length;

  return (
    <div className="pointer-events-none fixed bottom-14 right-4 z-[9999] w-[calc(100vw-2rem)] max-w-sm">
      <div className="pointer-events-auto overflow-hidden rounded-2xl border text-gray-700 dark:text-gray-200 border-black/10 bg-white shadow-2xl dark:border-white/10 dark:bg-gray-950">

        <button
          type="button"
          onClick={() =>
            setExpanded(
              (value) => !value,
            )
          }
          className="flex w-full items-center gap-3 px-4 py-3 text-left"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-white dark:bg-white dark:text-black">
            {uploadingCount >
            0 ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : failedCount >
              0 ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">
                {activeJobs.length ===
                0
                  ? "Uploads"
                  : `${activeJobs.length} ${
                      activeJobs.length ===
                      1
                        ? "post"
                        : "posts"
                    }`}
              </p>

              <span className="text-xs opacity-60">
                {expanded
                  ? "Hide"
                  : "View"}
              </span>
            </div>

            <p className="truncate text-xs opacity-60">
              {!isOnline
                ? "Waiting for network"
                : uploadingCount > 0
                ? `${uploadingCount} uploading`
                : failedCount >
                  0
                ? `${failedCount} failed`
                : "Background uploads"}
            </p>
          </div>

          {expanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
          ) : (
            <ChevronUp className="h-4 w-4 shrink-0 opacity-60" />
          )}
        </button>

        {expanded && (
          <div className="max-h-[70vh] overflow-y-auto border-t border-black/10 dark:border-white/10">
            {activeJobs.map(
              (job: any) => (
                <UploadJob
                  key={job.job_id}
                  job={job}
                  onRetry={() =>
                    retryJob(
                      job.job_id,
                    )
                  }
                  onPause={() =>
                    pauseJob(
                      job.job_id,
                    )
                  }
                  onResume={() =>
                    resumeJob(
                      job.job_id,
                    )
                  }
                  onCancel={() =>
                    cancelJob(
                      job.job_id,
                    )
                  }
                />
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function UploadJob({
  job,
  onRetry,
  onPause,
  onResume,
  onCancel,
}: {
  job: any;
  onRetry: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
}) {
  const status =
    job.status as JobStatus;

  const progress = Math.max(
    0,
    Math.min(
      100,
      Number(job.progress) || 0,
    ),
  );

  const isActive =
    status === "uploading" ||
    status === "creating";

  const isPaused =
    status === "paused";

  const isFailed =
    status === "failed";

  const isCompleted =
    status === "completed";

  return (
    <div className="border-b border-black/10 px-4 py-4 last:border-b-0 dark:border-white/10">
 
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-black/5 dark:bg-white/10">
          {job.media?.[0] ? (
            <MediaIcon
              mediaType={
                job.media[0]
                  .media_type
              }
            />
          ) : (
            <Upload className="h-4 w-4" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {getJobTitle(job)}
          </p>

          <div className="mt-0.5 flex items-center gap-1.5 text-xs opacity-60">
            <StatusIcon
              status={status}
            />

            <span>
              {getStatusText(
                status,
              )}
            </span>
          </div>
        </div>

        {!isCompleted && (
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel upload"
            className="rounded-full p-1.5 opacity-60 transition hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {!isCompleted && (
        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="opacity-60">
              {progress.toFixed(0)}%
            </span>

            {job.media?.length >
              0 && (
              <span className="opacity-50">
                {job.media.length}{" "}
                {job.media.length ===
                1
                  ? "file"
                  : "files"}
              </span>
            )}
          </div>

          <ProgressBar
            progress={progress}
          />
        </div>
      )}

      {isFailed &&
        job.error && (
          <div className="mt-3 rounded-xl bg-black/5 px-3 py-2 text-xs dark:bg-white/10">
            <p className="font-medium">
              Upload failed
            </p>

            <p className="mt-1 break-words opacity-60">
              {job.error}
            </p>
          </div>
        )}

      {isPaused && (
        <div className="mt-3 rounded-xl bg-black/5 px-3 py-2 text-xs opacity-70 dark:bg-white/10">
          Your post is saved. Uploading
          will continue when the network
          is available.
        </div>
      )}

      {job.media?.length >
        0 && (
        <div className="mt-3 space-y-2">
          {job.media.map(
            (media: any) => (
              <MediaRow
                key={
                  media.media_key
                }
                media={media}
              />
            ),
          )}
        </div>
      )}

      {!isCompleted && (
        <div className="mt-3 flex items-center gap-2">
          {isFailed && (
            <button
              type="button"
              onClick={onRetry}
              className="flex items-center gap-1.5 rounded-lg bg-black px-3 py-2 text-xs font-medium text-white dark:bg-white dark:text-black"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Retry
            </button>
          )}

          {isPaused && (
            <button
              type="button"
              onClick={onResume}
              className="flex items-center gap-1.5 rounded-lg bg-black px-3 py-2 text-xs font-medium text-white dark:bg-white dark:text-black"
            >
              <Play className="h-3.5 w-3.5" />
              Resume
            </button>
          )}

          {isActive && (
            <button
              type="button"
              onClick={onPause}
              className="flex items-center gap-1.5 rounded-lg border border-black/10 px-3 py-2 text-xs font-medium dark:border-white/10"
            >
              <Pause className="h-3.5 w-3.5" />
              Pause
            </button>
          )}

          {status ===
            "queued" && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-black/10 px-3 py-2 text-xs font-medium dark:border-white/10"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {isCompleted && (
        <div className="mt-3 flex items-center gap-1.5 text-xs opacity-60">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Post published successfully
        </div>
      )}
    </div>
  );
}

function MediaRow({
  media,
}: {
  media: any;
}) {
  const status =
    media.status as MediaStatus;

  const progress = Math.max(
    0,
    Math.min(
      100,
      Number(media.progress) || 0,
    ),
  );

  return (
    <div className="rounded-xl bg-black/5 p-2.5 dark:bg-white/5">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/5 dark:bg-white/10">
          <MediaIcon
            mediaType={
              media.media_type
            }
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">
            {media.file_name}
          </p>

          <div className="mt-0.5 flex items-center gap-1 text-[11px] opacity-50">
            <span>
              {getMediaStatusText(
                status,
              )}
            </span>

            {media.file_size >
              0 && (
              <>
                <span>•</span>
                <span>
                  {formatBytes(
                    media.file_size,
                  )}
                </span>
              </>
            )}
          </div>
        </div>

        <span className="shrink-0 text-[11px] opacity-50">
          {progress.toFixed(0)}%
        </span>
      </div>

      {status !==
        "uploaded" && (
        <div className="mt-2">
          <ProgressBar
            progress={progress}
          />
        </div>
      )}
    </div>
  );
}