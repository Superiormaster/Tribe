'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '@/utils/api';

type Stats = {
  users: number;
  tribes: number;
  reports: number;
  tribe_requests: number;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await apiRequest('admin/stats/', {
          method: 'GET',
        });

        setStats(data);
      } catch (err) {
        console.error('Failed to load stats:', err);
      }
    };

    fetchStats();
  }, []);

  if (!stats) return <p>Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-4 gap-4">
        <Card title="Total Users" value={stats.users} />
        <Card title="Active Tribes" value={stats.tribes} />
        <Card title="Pending Reports" value={stats.reports} />
        <Card title="Tribe Requests" value={stats.tribe_requests} />
      </div>
    </div>
  );
}

function Card({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="bg-white p-4 shadow rounded">
      <p className="text-gray-500">{title}</p>
      <h2 className="text-xl font-bold">{value}</h2>
    </div>
  );
}