"use client";

import {
Eye,
MapPin,
BellOff,
UserX,
FileText,
Shield,
Lock,
} from "lucide-react";

import SettingsSection from "@/components/settings/SettingsSection";
import SettingsItem from "@/components/settings/SettingsItem";

export default function PrivacyPage() {
return (
<div className="min-h-screen my-20 bg-background">
<div className="mx-auto max-w-2xl px-4 py-6">
{/* Header */}

    <div className="mb-8">
      <h1 className="text-3xl font-bold text-gray-700 dark:text-gray-300">
        Privacy
      </h1>

      <p className="mt-2 text-gray-500">
        Control who can view your profile, interact with
        you, and manage your personal data.
      </p>
    </div>

    {/* Profile Privacy */}

    <SettingsSection
      title="Profile"
      description="Manage who can view your profile information."
    >
      <SettingsItem
        icon={<Eye />}
        title="Profile Visibility"
        description="Choose who can view your profile."
        href="/main/profile-visibility/"
      />
    </SettingsSection>

    {/* Interactions */}

    <div className="mt-8">
      <SettingsSection
        title="Interactions"
        description="Manage who can interact with you."
      >
        <SettingsItem
          icon={<BellOff />}
          title="Muted Accounts"
          description="View and manage muted users."
          href="/main/muted/"
        />

        <SettingsItem
          icon={<UserX />}
          title="Blocked Users"
          description="View and manage blocked users."
          href="/main/blocked/"
        />
      </SettingsSection>
    </div>
  
    {/* Security */}

        <div className="mt-8">
          <SettingsSection
            title="Security"
            description="Protect your account."
          >
            <SettingsItem
              icon={<Lock />}
              title="Password"
              description="Change your password."
              href="/main/settings/password"
            />
          </SettingsSection>
        </div>

    {/* Data & Permissions */}

    <div className="mt-8">
      <SettingsSection
        title="Legal & Data"
        description="Manage your account information and policies."
      >
        <SettingsItem
          icon={<Shield />}
          title="Privacy Policy"
          description="Learn how Tribe handles your data."
          href="/main/privacy-policy/"
        />

        <SettingsItem
          icon={<FileText />}
          title="Terms & Conditions"
          description="Read Tribe's terms of service."
          href="/main/terms/"
        />

        {/*
        <SettingsItem
          icon={<UserX />}
          title="Deactivate Account"
          description="Temporarily disable your account."
          href="/main/deactivate/"
        />
        */}
      </SettingsSection>
    </div>
  </div>
</div>

);
}