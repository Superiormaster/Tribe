import { waitForAccessToken } from "@/utils/api";

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL;

export async function connectNotificationSocket() {
  const token = await waitForAccessToken();

  if (!token) {
    console.error("No access token for websocket");
    return null;
  }

  return new WebSocket(
    `${WS_BASE}/ws/notifications/?token=${token}`
  );
}