export type NotificationCategory =
  | "social"
  | "message"
  | "community"
  | "recommendation"
  | "marketing";

export type PushRegistrationResult = {
  token: string;
  registered: boolean;
};

export interface NotificationPreferences {
  push_enabled: boolean;
  social_notifications: boolean;
  message_notifications: boolean;
  community_notifications: boolean;
  recommendation_notifications: boolean;
  marketing_notifications: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  updated_at?: string;
}