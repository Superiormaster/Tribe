"use client";

import {
  useCallback,
  useEffect,
  useRef,
} from "react";

import { useNetwork } from "@/components/networkConnection/NetworkContext";

import {
  registerPushToken,
} from "@/utils/notifications/pushRegistration";

export function usePushNotifications(
  userId?: number | string | null
) {
  const { isOnline } =
    useNetwork();

  const initialized =
    useRef(false);

  const registering =
    useRef(false);

  const register = useCallback(
    async (
      requestPermission = false
    ) => {
      if (!userId) return;

      if (!isOnline) return;

      if (
        typeof window ===
        "undefined"
      ) {
        return;
      }

      if (
        !("Notification" in window) ||
        !("serviceWorker" in navigator)
      ) {
        return;
      }

      if (registering.current) {
        return;
      }

      registering.current = true;

      try {
        let permission =
          Notification.permission;

        /*
         * Only ask when permission
         * has never been decided.
         */
        if (
          permission === "default" &&
          requestPermission
        ) {
          permission =
            await Notification.requestPermission();
        }

        if (
          permission !== "granted"
        ) {
          return;
        }

        await registerPushToken();

        initialized.current = true;

        console.log(
          "[Push] Registration synchronized"
        );
      } catch (error) {
        console.warn(
          "[Push] Registration failed",
          error
        );
      } finally {
        registering.current = false;
      }
    },
    [
      userId,
      isOnline,
    ]
  );

  /*
   * Initial registration.
   */
  useEffect(() => {
    if (!userId) return;

    register(
      !initialized.current
    );
  }, [
    userId,
    register,
  ]);

  /*
   * Recover when internet
   * returns.
   */
  useEffect(() => {
    if (!userId || !isOnline) {
      return;
    }

    register(false);
  }, [
    userId,
    isOnline,
    register,
  ]);

  return {
    registerPush: register,
  };
}