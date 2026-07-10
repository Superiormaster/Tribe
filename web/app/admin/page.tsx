'use client';

import {
  Users,
  Flag,
  MessageSquare,
} from 'lucide-react';

export default function AdminDashboard() {
  return (
    <div className="space-y-8 text-gray-700 dark:text-gray-200">
      <h1 className="text-3xl font-bold">
        Admin Dashboard
      </h1>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow">
          <div className="flex items-center gap-3">
            <Users size={24} />
            <div>
              <p className="text-sm opacity-70">
                Users
              </p>
              <p className="text-2xl font-bold">
                --
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow">
          <div className="flex items-center gap-3">
            <Flag size={24} />
            <div>
              <p className="text-sm opacity-70">
                Reports
              </p>
              <p className="text-2xl font-bold">
                --
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow">
          <div className="flex items-center gap-3">
            <MessageSquare size={24} />
            <div>
              <p className="text-sm opacity-70">
                Feedback
              </p>
              <p className="text-2xl font-bold">
                --
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow">
        <h2 className="text-xl font-semibold mb-4">
          Welcome
        </h2>

        <p className="text-gray-600 dark:text-gray-400">
          Welcome to the Tribe Admin Panel.
          You can manage users, reports,
          tribes, feedback, and settings from
          the sidebar.
        </p>
      </div>
    </div>
  );
}