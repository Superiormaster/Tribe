import { apiRequest } from "@/utils/api";
import type {
  NotificationPreferences,
} from "./notificationTypes";

export async function getNotificationPreferences() {
  return apiRequest(
    "api/notifications/preferences/"
  ) as Promise<NotificationPreferences>;
}

export async function updateNotificationPreferences(
  patch: Partial<NotificationPreferences>
) {
  return apiRequest(
    "api/notifications/preferences/",
    {
      method: "PATCH",
      data: patch,
    }
  );
}