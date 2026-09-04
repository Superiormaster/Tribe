import {
  getMessaging,
  getToken,
  isSupported,
} from "firebase/messaging";

import { app } from "@/lib/firebase";
import { apiRequest } from "@/utils/api";

const VAPID_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

const SW_PATH =
  "/firebase-messaging-sw.js";

let registrationPromise:
  Promise<ServiceWorkerRegistration> | null = null;

let tokenPromise:
  Promise<string | null> | null = null;

export async function registerNotificationServiceWorker() {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator)
  ) {
    return null;
  }

  if (!registrationPromise) {
    registrationPromise =
      navigator.serviceWorker.register(
        SW_PATH,
        {
          scope: "/",
        }
      );
  }

  return registrationPromise;
}

export async function getFCMToken() {
  if (
    typeof window === "undefined" ||
    !("Notification" in window)
  ) {
    return null;
  }

  if (Notification.permission !== "granted") {
    return null;
  }

  if (!VAPID_KEY) {
    console.error(
      "[Push] Missing VAPID key"
    );

    return null;
  }

  if (!tokenPromise) {
    tokenPromise = (async () => {
      const supported =
        await isSupported();

      if (!supported) {
        return null;
      }

      const registration =
        await registerNotificationServiceWorker();

      if (!registration) {
        return null;
      }

      const messaging =
        getMessaging(app);

      return getToken(
        messaging,
        {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration:
            registration,
        }
      );
    })().finally(() => {
      tokenPromise = null;
    });
  }

  return tokenPromise;
}

export async function registerPushToken() {
  const token =
    await getFCMToken();

  if (!token) {
    return null;
  }

  await apiRequest(
    "api/users/fcm-token/",
    {
      method: "POST",
      data: {
        token,
        platform: "web",
        browser:
          navigator.userAgent,
      },
    }
  );

  return token;
}