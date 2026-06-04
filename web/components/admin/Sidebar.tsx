'use client';

import Link from 'next/link';

export default function Sidebar() {
  return (
    <div className="w-64 bg-black text-white p-4 space-y-4">
      <h1 className="text-xl font-bold">Tribe Admin</h1>

      <nav className="flex flex-col gap-3">
        <Link href="/admin">Dashboard</Link>
        <Link href="/admin/users">Users</Link>
        <Link href="/admin/reports">Reports</Link>
        <Link href="/admin/tribes">Tribes</Link>
        <Link href="/admin/feedback">Feedback</Link>
        <Link href="/admin/settings">Settings</Link>
      </nav>
    </div>
  );
}