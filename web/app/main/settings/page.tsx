"use client";

import { useState, useEffect } from 'react';

import {
  Bell,
  Shield,
  Download,
  FileText,
  Flag,
  MessageSquareWarning,
} from "lucide-react";

import SettingsItem from "@/components/settings/SettingsItem";
import SettingsCard from "@/components/settings/SettingsCard";
import SettingsSearch from "@/components/settings/SettingsSearch";
import { useAccountSwitcher } from "@/components/AccountSwitcherContext";
import {
  getAccounts,
  getActiveAccount,
} from "@/utils/accounts";
import { apiRequest } from "@/utils/api";

export default function SettingsPage() {
  const [search, setSearch] = useState("");
  const [currentAccount, setCurrentAccount] = useState<any>(null);
  const { openSwitcher } = useAccountSwitcher();
  const [notificationsEnabled,
  setNotificationsEnabled] =
    useState(true);
  
  useEffect(() => {
    const accounts = getAccounts();
    const activeEmail = getActiveAccount();
  
    const active =
      accounts.find(
        acc => acc.email === activeEmail
      ) || accounts[0];
  
    setCurrentAccount(active);
  }, []);
  
  useEffect(() => {
    apiRequest(
      "api/notifications/settings/me/"
    ).then((data) => {
      setNotificationsEnabled(
        data.notifications_enabled
      );
    });
  }, []);
  
  return (
    <div className="mx-auto max-w-xl dark:bg-gray-900 mt-20 bg-white min-h-screen">
      {/* Header */}

      <div className="sticky top-0 dark:bg-gray-900 bg-white z-20 border-b">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-2xl text-gray-700 dark:text-gray-300 font-bold">
            Settings & Privacy
          </h1>
        </div>

        {/*
        <SettingsSearch
          value={search}
          onChange={setSearch}
        />
        */}
      </div>

      <div className="space-y-8 p-4">
        {/* Account */}

        <section>
          <h2 className="text-2xl text-gray-700 dark:text-gray-300 font-bold">
            Account
          </h2>

          <p className="text-gray-500 mt-1">
            Update your info to keep your
            account secure.
          </p>

          <div className="mt-4">
            <SettingsCard
              avatar={currentAccount?.avatar}
              title={currentAccount?.username || "Current Account"}
              description={currentAccount?.email}
              buttonText="Switch Account"
              onClick={openSwitcher}
            />
          </div>
        </section>

        {/* Preferences */}

        <section>
          <h2 className="text-2xl text-gray-700 dark:text-gray-300 font-bold">
            Preferences
          </h2>

          <p className="text-gray-500">
            Customise your experience on Tribe.
          </p>

          <div className="mt-4 divide-y">
            <SettingsItem
              icon={<Bell />}
              title="Allow Notifications"
              type="toggle"
              value={notificationsEnabled}
              onToggle={async (value) => {
                setNotificationsEnabled(value);
            
                await apiRequest(
                  "api/notifications/settings/me/",
                  {
                    method: "PATCH",
                    data: {
                      notifications_enabled: value,
                    },
                  }
                );
              }}
            />

            <SettingsItem
              icon={<MessageSquareWarning />}
              title="Feedback"
              href="/main/feedback/"
            />
            
            <SettingsItem
              icon={<Flag />}
              title="Report"
              href="/main/settings/report/"
            />
            
            <SettingsItem
              icon={<Shield />}
              title="Privacy"
              href="/main/privacy/"
            />
          </div>
        </section>

        {/* Your Information */}

        {/*
        <section>
          <h2 className="text-2xl text-gray-700 dark:text-gray-300 font-bold">
            Your Information
          </h2>

          <p className="text-gray-500">
            Manage your account data.
          </p>

          <div className="mt-4 divide-y">
            <SettingsItem
              icon={<FileText />}
              title="Activity Log"
            />

            <SettingsItem
              icon={<Shield />}
              title="Access and Control"
            />

            <SettingsItem
              icon={<Download />}
              title="Download Your Information"
            />
          </div>
        </section>
        */}
      </div>
    </div>
  );
}