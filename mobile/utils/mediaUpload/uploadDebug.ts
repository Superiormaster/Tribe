// utils/mediaUpload/uploadDebug.ts

import { apiRequest } from "@/utils/api";

type UploadDebugLevel =
  | "info"
  | "warn"
  | "error";

type UploadDebugPayload = {
  event: string;
  level?: UploadDebugLevel;
  media_id?: string | number;
  part_number?: number;
  data?: Record<string, unknown>;
};

let debugEnabled = true;

export function setUploadDebugEnabled(
  enabled: boolean
) {
  debugEnabled = enabled;
}

export async function uploadDebug({
  event,
  level = "info",
  media_id,
  part_number,
  data,
}: UploadDebugPayload): Promise<void> {

  if (!debugEnabled) {
    return;
  }

  const prefix =
    `[UPLOAD DEBUG] ${event}`;

  if (level === "error") {
    console.error(
      prefix,
      data
    );
  } else if (level === "warn") {
    console.warn(
      prefix,
      data
    );
  } else {
    console.log(
      prefix,
      data
    );
  }

  try {
    await apiRequest(
      "api/media/debug/",
      {
        method: "POST",
        data: {
          event,
          level,
          media_id,
          part_number,
          data,
        },
      }
    );
  } catch (error) {
    console.warn(
      "[UPLOAD DEBUG] Failed to send debug event:",
      error
    );
  }
}