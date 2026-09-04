"use client";

import { useEffect, useState } from "react";

import {
  Bell,
  Flag,
  LifeBuoy,
  MessageSquareWarning,
  Moon,
  Shield,
  X,
} from "lucide-react";

import SettingsItem from "@/components/settings/SettingsItem";
import SettingsCard from "@/components/settings/SettingsCard";
import { useAccountSwitcher } from "@/components/AccountSwitcherContext";

import {
  getAccounts,
  getActiveAccount,
} from "@/utils/accounts";

import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from "@/utils/notifications/notificationPreferences";

import type {
  NotificationPreferences,
} from "@/utils/notifications/notificationTypes";

export default function SettingsPage() {
  const { openSwitcher } = useAccountSwitcher();

  const [currentAccount, setCurrentAccount] =
    useState<any>(null);

  const [
    notificationPreferences,
    setNotificationPreferences,
  ] = useState<NotificationPreferences | null>(null);

  const [quietHoursModal, setQuietHoursModal] =
    useState(false);

  const [quietHoursStart, setQuietHoursStart] =
    useState("22:00");

  const [quietHoursEnd, setQuietHoursEnd] =
    useState("07:00");

  const [savingQuietHours, setSavingQuietHours] =
    useState(false);

  // -----------------------------------------
  // ACCOUNT
  // -----------------------------------------

  useEffect(() => {
    const accounts = getAccounts();
    const activeEmail = getActiveAccount();

    const active =
      accounts.find(
        (account) =>
          account.email === activeEmail
      ) || accounts[0];

    setCurrentAccount(active);
  }, []);

  // -----------------------------------------
  // NOTIFICATION PREFERENCES
  // -----------------------------------------

  useEffect(() => {
    let mounted = true;

    getNotificationPreferences()
      .then((data) => {
        if (!mounted) return;

        setNotificationPreferences(data);

        setQuietHoursStart(
          data.quiet_hours_start || "22:00"
        );

        setQuietHoursEnd(
          data.quiet_hours_end || "07:00"
        );
      })
      .catch((error) => {
        console.error(
          "Failed to load notification preferences:",
          error
        );
      });

    return () => {
      mounted = false;
    };
  }, []);

  // -----------------------------------------
  // NOTIFICATIONS TOGGLE
  // -----------------------------------------

  const handleNotificationsToggle = async (
    value: boolean
  ) => {
    if (!notificationPreferences) return;

    const previous =
      notificationPreferences;

    setNotificationPreferences({
      ...previous,
      push_enabled: value,
    });

    try {
      const updated =
        await updateNotificationPreferences({
          push_enabled: value,
        });

      setNotificationPreferences(updated);
    } catch (error) {
      console.error(
        "Failed to update notification preference:",
        error
      );

      setNotificationPreferences(previous);
    }
  };

  // -----------------------------------------
  // QUIET HOURS TOGGLE
  // -----------------------------------------

  const handleQuietHoursToggle = async (
    value: boolean
  ) => {
    if (!notificationPreferences) return;

    const previous =
      notificationPreferences;

    // Optimistic UI
    setNotificationPreferences({
      ...previous,
      quiet_hours_enabled: value,
    });

    try {
      const updated =
        await updateNotificationPreferences({
          quiet_hours_enabled: value,
        });

      setNotificationPreferences(updated);

      // If enabled, open the time editor
      if (value) {
        setQuietHoursStart(
          updated.quiet_hours_start ||
            "22:00"
        );

        setQuietHoursEnd(
          updated.quiet_hours_end ||
            "07:00"
        );

        setQuietHoursModal(true);
      }
    } catch (error) {
      console.error(
        "Failed to update quiet hours:",
        error
      );

      setNotificationPreferences(previous);
    }
  };

  // -----------------------------------------
  // SAVE QUIET HOURS
  // -----------------------------------------

  const saveQuietHours = async () => {
    if (!notificationPreferences) return;

    setSavingQuietHours(true);

    try {
      const updated =
        await updateNotificationPreferences({
          quiet_hours_start:
            quietHoursStart,

          quiet_hours_end:
            quietHoursEnd,
        });

      setNotificationPreferences(updated);

      setQuietHoursModal(false);
    } catch (error) {
      console.error(
        "Failed to save quiet hours:",
        error
      );
    } finally {
      setSavingQuietHours(false);
    }
  };

  // -----------------------------------------
  // FORMAT TIME
  // -----------------------------------------

  const formatTime = (time: string) => {
    if (!time) return "";

    const [hours, minutes] =
      time.split(":").map(Number);

    const date = new Date();

    date.setHours(hours);
    date.setMinutes(minutes);

    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <>
      <div className="mx-auto min-h-screen max-w-xl bg-white dark:bg-gray-900">

        {/* HEADER */}

        <div className="sticky top-0 z-20 border-b bg-white dark:bg-gray-900">
          <div className="p-4">
            <h1 className="text-2xl font-bold text-gray-700 dark:text-gray-300">
              Settings & Privacy
            </h1>
          </div>
        </div>

        <div className="space-y-8 p-4">

          {/* ACCOUNT */}

          <section>
            <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300">
              Account
            </h2>

            <p className="mt-1 text-gray-500">
              Update your info to keep your
              account secure.
            </p>

            <div className="mt-4">
              <SettingsCard
                avatar={currentAccount?.avatar}
                title={
                  currentAccount?.username ||
                  "Current Account"
                }
                description={
                  currentAccount?.email
                }
                buttonText="Switch Account"
                onClick={openSwitcher}
              />
            </div>
          </section>

          {/* PREFERENCES */}

          <section>
            <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300">
              Preferences
            </h2>

            <p className="mt-1 text-gray-500">
              Customise your experience on Tribe.
            </p>

            <div className="mt-4 divide-y">

              {/* NOTIFICATIONS */}

              <SettingsItem
                icon={<Bell />}
                title="Allow Notifications"
                description="Receive push notifications"
                type="toggle"
                value={
                  notificationPreferences
                    ?.push_enabled ?? true
                }
                onToggle={
                  handleNotificationsToggle
                }
              />

              {/* QUIET HOURS */}

              <SettingsItem
                icon={<Moon />}
                title="Quiet Hours"
                description={
                  notificationPreferences
                    ?.quiet_hours_enabled
                    ? `${formatTime(
                        quietHoursStart
                      )} – ${formatTime(
                        quietHoursEnd
                      )}`
                    : "Notifications are allowed anytime"
                }
                type="toggle"
                value={
                  notificationPreferences
                    ?.quiet_hours_enabled ?? false
                }
                onToggle={
                  handleQuietHoursToggle
                }
                onClick={() => {
                  if (
                    notificationPreferences
                      ?.quiet_hours_enabled
                  ) {
                    setQuietHoursModal(true);
                  }
                }}
              />

              {/* FEEDBACK */}

              <SettingsItem
                icon={<MessageSquareWarning />}
                title="Feedback"
                href="/main/feedback/"
              />

              {/* REPORT */}

              <SettingsItem
                icon={<Flag />}
                title="Report"
                href="/main/settings/report/"
              />

              {/* SUPPORT */}

              <SettingsItem
                icon={<LifeBuoy />}
                title="Support"
                href="/main/settings/support/"
              />

              {/* PRIVACY */}

              <SettingsItem
                icon={<Shield />}
                title="Privacy"
                href="/main/privacy/"
              />

            </div>
          </section>
        </div>
      </div>

      {/* QUIET HOURS MODAL */}

      {quietHoursModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          onClick={() =>
            setQuietHoursModal(false)
          }
        >
          <div
            className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-xl dark:bg-gray-900 sm:rounded-3xl"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            {/* MODAL HEADER */}

            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Quiet Hours
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  Choose when Tribe should pause
                  notifications.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setQuietHoursModal(false)
                }
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X size={20} />
              </button>
            </div>

            {/* START */}

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                From
              </label>

              <input
                type="time"
                value={quietHoursStart}
                onChange={(e) =>
                  setQuietHoursStart(
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-lg text-gray-900 outline-none focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            {/* END */}

            <div className="mt-4 space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Until
              </label>

              <input
                type="time"
                value={quietHoursEnd}
                onChange={(e) =>
                  setQuietHoursEnd(
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-lg text-gray-900 outline-none focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            {/* ACTIONS */}

            <div className="mt-6 flex gap-3">

              <button
                type="button"
                onClick={() =>
                  setQuietHoursModal(false)
                }
                className="flex-1 rounded-xl border border-gray-200 px-4 py-3 font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={savingQuietHours}
                onClick={saveQuietHours}
                className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white disabled:opacity-50"
              >
                {savingQuietHours
                  ? "Saving..."
                  : "Save"}
              </button>

            </div>
          </div>
        </div>
      )}
    </>
  );
}