'use client';

import {
  Users,
  Flag,
  MessageSquare,
  UsersRound,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiRequest } from '@/utils/api';
import { formatCount } from '@/utils/formatCount';

interface Stats {
  users: number;
  reports: number;
  feedback: number;
  tribes: number;
  banned_users: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    users: 0,
    reports: 0,
    feedback: 0,
    tribes: 0,
    banned_users: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const res = await apiRequest(
          'api/admin/dashboard-stats/'
        );

        setStats(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  const cards = [
    {
      title: 'Users',
      value: stats.users,
      icon: Users,
    },
    {
      title: 'Reports',
      value: stats.reports,
      icon: Flag,
    },
    {
      title: 'Feedback',
      value: stats.feedback,
      icon: MessageSquare,
    },
    {
      title: 'Tribes',
      value: stats.tribes,
      icon: UsersRound,
    },
  ];

  return (
    <div className="space-y-8 text-gray-700 dark:text-gray-200">
      <h1 className="text-3xl font-bold">
        Admin Dashboard
      </h1>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.title}
              className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow"
            >
              <div className="flex items-center gap-3">
                <Icon size={24} />

                <div>
                  <p className="text-sm opacity-70">
                    {card.title}
                  </p>

                  <p className="text-2xl font-bold">
                    {loading
                      ? '--'
                      : formatCount(card.value)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow">
        <h2 className="text-xl font-semibold mb-4">
          Welcome
        </h2>

        <p className="text-gray-600 dark:text-gray-400">
          Welcome to the Tribe Admin Panel.
          You can manage users, reports,
          tribes, feedback, and settings
          from the sidebar.
        </p>
      </div>
    </div>
  );
}