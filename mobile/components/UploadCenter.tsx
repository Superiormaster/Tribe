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
} from "lucide-react-native";

import {
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

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
          size={16}
          className="animate-spin"
        />
      );

    case "completed":
      return (
        <CheckCircle2 size={16} />
      );

    case "failed":
      return (
        <AlertCircle size={16} />
      );

    case "paused":
      return (
        <Pause size={16} />
      );

    default:
      return (
        <Clock3 size={16} />
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
      <Video size={16} />
    );
  }

  return (
    <ImageIcon size={16} />
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
    <View className="h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
      <View
        className="h-full rounded-full bg-black dark:bg-white"
        style={{
          width: `${safeProgress}%`,
        }}
      />
    </View>
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

  const { isOnline } =
    useNetwork();

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
    <View className="pointer-events-none absolute bottom-14 right-4 z-[9999] w-[calc(100%-2rem)] max-w-sm">
      <View className="pointer-events-auto overflow-hidden rounded-2xl border border-black/10 bg-white text-gray-700 shadow-2xl dark:border-white/10 dark:bg-gray-950 dark:text-gray-200">

        <Pressable
          onPress={() =>
            setExpanded(
              (value) => !value,
            )
          }
          className="flex-row items-center gap-3 px-4 py-3"
        >
          <View className="h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black dark:bg-white">
            {uploadingCount >
            0 ? (
              <Loader2
                size={16}
                color="#ffffff"
              />
            ) : failedCount >
              0 ? (
              <AlertCircle
                size={16}
                color="#ffffff"
              />
            ) : (
              <Upload
                size={16}
                color="#ffffff"
              />
            )}
          </View>

          <View className="min-w-0 flex-1">
            <View className="flex-row items-center justify-between gap-2">
              <Text className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                {activeJobs.length ===
                1
                  ? "1 post"
                  : `${activeJobs.length} posts`}
              </Text>

              <Text className="text-xs text-gray-500">
                {expanded
                  ? "Hide"
                  : "View"}
              </Text>
            </View>

            <Text
              numberOfLines={1}
              className="text-xs text-gray-500"
            >
              {!isOnline
                ? "Waiting for network"
                : uploadingCount > 0
                ? `${uploadingCount} uploading`
                : failedCount >
                  0
                ? `${failedCount} failed`
                : "Background uploads"}
            </Text>
          </View>

          {expanded ? (
            <ChevronDown
              size={16}
              color="#6b7280"
            />
          ) : (
            <ChevronUp
              size={16}
              color="#6b7280"
            />
          )}
        </Pressable>

        {expanded && (
          <View className="border-t border-black/10 dark:border-white/10">
            <ScrollView
              className="max-h-[70vh]"
              nestedScrollEnabled
            >
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
            </ScrollView>
          </View>
        )}
      </View>
    </View>
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
    <View className="border-b border-black/10 px-4 py-4 dark:border-white/10">

      <View className="flex-row items-start gap-3">
        <View className="h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-black/5 dark:bg-white/10">
          {job.media?.[0] ? (
            <MediaIcon
              mediaType={
                job.media[0]
                  .media_type
              }
            />
          ) : (
            <Upload size={16} />
          )}
        </View>

        <View className="min-w-0 flex-1">
          <Text
            numberOfLines={1}
            className="text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            {getJobTitle(job)}
          </Text>

          <View className="mt-0.5 flex-row items-center gap-1.5">
            <StatusIcon
              status={status}
            />

            <Text className="text-xs text-gray-500">
              {getStatusText(
                status,
              )}
            </Text>
          </View>
        </View>

        {!isCompleted && (
          <Pressable
            onPress={onCancel}
            accessibilityLabel="Cancel upload"
            className="rounded-full p-1.5"
          >
            <X
              size={16}
              color="#6b7280"
            />
          </Pressable>
        )}
      </View>

      {!isCompleted && (
        <View className="mt-3">
          <View className="mb-1.5 flex-row items-center justify-between">
            <Text className="text-xs text-gray-500">
              {progress.toFixed(0)}%
            </Text>

            {job.media?.length >
              0 && (
              <Text className="text-xs text-gray-500">
                {job.media.length}{" "}
                {job.media.length ===
                1
                  ? "file"
                  : "files"}
              </Text>
            )}
          </View>

          <ProgressBar
            progress={progress}
          />
        </View>
      )}

      {isFailed &&
        job.error && (
          <View className="mt-3 rounded-xl bg-black/5 px-3 py-2 dark:bg-white/10">
            <Text className="text-xs font-medium text-gray-700 dark:text-gray-200">
              Upload failed
            </Text>

            <Text className="mt-1 text-xs text-gray-500">
              {job.error}
            </Text>
          </View>
        )}

      {isPaused && (
        <View className="mt-3 rounded-xl bg-black/5 px-3 py-2 dark:bg-white/10">
          <Text className="text-xs text-gray-500">
            Your post is saved. Uploading
            will continue when the network
            is available.
          </Text>
        </View>
      )}

      {job.media?.length >
        0 && (
        <View className="mt-3 gap-2">
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
        </View>
      )}

      {!isCompleted && (
        <View className="mt-3 flex-row items-center gap-2">

          {isFailed && (
            <Pressable
              onPress={onRetry}
              className="flex-row items-center gap-1.5 rounded-lg bg-black px-3 py-2 dark:bg-white"
            >
              <RotateCcw
                size={14}
                color="#ffffff"
              />

              <Text className="text-xs font-medium text-white dark:text-black">
                Retry
              </Text>
            </Pressable>
          )}

          {isPaused && (
            <Pressable
              onPress={onResume}
              className="flex-row items-center gap-1.5 rounded-lg bg-black px-3 py-2 dark:bg-white"
            >
              <Play
                size={14}
                color="#ffffff"
              />

              <Text className="text-xs font-medium text-white dark:text-black">
                Resume
              </Text>
            </Pressable>
          )}

          {isActive && (
            <Pressable
              onPress={onPause}
              className="flex-row items-center gap-1.5 rounded-lg border border-black/10 px-3 py-2 dark:border-white/10"
            >
              <Pause
                size={14}
              />

              <Text className="text-xs font-medium text-gray-700 dark:text-gray-200">
                Pause
              </Text>
            </Pressable>
          )}

          {status ===
            "queued" && (
            <Pressable
              onPress={onCancel}
              className="rounded-lg border border-black/10 px-3 py-2 dark:border-white/10"
            >
              <Text className="text-xs font-medium text-gray-700 dark:text-gray-200">
                Cancel
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {isCompleted && (
        <View className="mt-3 flex-row items-center gap-1.5">
          <CheckCircle2
            size={14}
          />

          <Text className="text-xs text-gray-500">
            Post published successfully
          </Text>
        </View>
      )}
    </View>
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
    <View className="rounded-xl bg-black/5 p-2.5 dark:bg-white/5">
      <View className="flex-row items-center gap-2">

        <View className="h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/5 dark:bg-white/10">
          <MediaIcon
            mediaType={
              media.media_type
            }
          />
        </View>

        <View className="min-w-0 flex-1">
          <Text
            numberOfLines={1}
            className="text-xs font-medium text-gray-700 dark:text-gray-200"
          >
            {media.file_name}
          </Text>

          <View className="mt-0.5 flex-row items-center gap-1">
            <Text className="text-[11px] text-gray-500">
              {getMediaStatusText(
                status,
              )}
            </Text>

            {media.file_size >
              0 && (
              <>
                <Text className="text-[11px] text-gray-500">
                  •
                </Text>

                <Text className="text-[11px] text-gray-500">
                  {formatBytes(
                    media.file_size,
                  )}
                </Text>
              </>
            )}
          </View>
        </View>

        <Text className="text-[11px] text-gray-500">
          {progress.toFixed(0)}%
        </Text>
      </View>

      {status !==
        "uploaded" && (
        <View className="mt-2">
          <ProgressBar
            progress={progress}
          />
        </View>
      )}
    </View>
  );
}