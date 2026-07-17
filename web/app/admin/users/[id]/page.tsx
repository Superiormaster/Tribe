'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '@/utils/api';
import { useParams } from 'next/navigation';
import { formatCount } from '@/utils/formatCount';
import Skeleton from '@/components/Skeleton';

type User = {
  id: number;
  username: string;
  full_name: string;
  email: string;
  avatar: string | null;
  cover_photo: string | null;
  bio: string;
  gender: string;
  country: string;
  city: string;
  website: string;
  role: string;
  verified: boolean;
  is_active: boolean;
  is_creator: boolean;
  what_do_you_do: string;
  stars_count: number;
  starred_count: number;
  credibility_score: number;
  created_at: string;
  last_seen: string | null;
  email_verified: boolean;
  onboarding_step: number;
};

export default function UserDetailsPage() {
  const params = useParams();
  const id = params.id;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser();
  }, []);

  async function fetchUser() {
    try {
      const res = await apiRequest(
        `api/admin/users/${id}/`
      );

      setUser(res);
    } finally {
      setLoading(false);
    }
  }

  async function banUser() {
    await apiRequest(
      "api/admin/users/ban/",
      {
        method: "POST",
        data: {
          user_id: user?.id,
        },
      }
    );

    fetchUser();
  }

  async function unbanUser() {
    await apiRequest(
      "api/admin/users/unban/",
      {
        method: "POST",
        data: {
          user_id: user?.id,
        },
      }
    );

    fetchUser();
  }

  if (loading) {
    return <Skeleton />;
  }

  if (!user) {
    return <div>User not found.</div>;
  }

  return (
    <div className="space-y-8">

      <div className="rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 shadow">

        <div className="relative h-48 bg-gray-200">

          {user.cover_photo ? (
            <img
              src={user.cover_photo}
              alt="Cover"
              className="w-full h-full object-cover"
            />
          ) : null}

        </div>

        <div className="px-6 pb-6">

          <div className="-mt-14">

            {user.avatar ? (
              <img
                src={user.avatar}
                alt=""
                className="rounded-full border-4 border-white dark:border-zinc-900"
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-gray-300 border-4 border-white dark:border-zinc-900" />
            )}

          </div>

          <h1 className="text-3xl font-bold mt-4">
            {user.full_name}
          </h1>

          <p className="text-gray-500">
            @{user.username}
          </p>

          <p className="mt-3">
            {user.bio || "No bio"}
          </p>

        </div>

      </div>

      <div className="grid lg:grid-cols-2 gap-6">

        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow">

          <h2 className="font-bold text-xl mb-5">
            User Information
          </h2>

          <div className="space-y-3">

            <Info title="Email" value={user.email} />

            <Info title="Full Name" value={user.full_name || "-"} />

            <Info title="Gender" value={user.gender || "-"} />

            <Info title="Country" value={user.country || "-"} />

            <Info title="City" value={user.city || "-"} />

            <Info title="Website" value={user.website || "-"} />

            <Info
              title="Occupation"
              value={user.what_do_you_do || "-"}
            />

            <Info
              title="Role"
              value={user.role}
            />

            <Info
              title="Creator"
              value={user.is_creator ? "Yes" : "No"}
            />

            <Info
              title="Verified"
              value={user.verified ? "Yes" : "No"}
            />

            <Info
              title="Email Verified"
              value={user.email_verified ? "Yes" : "No"}
            />

            <Info
              title="Status"
              value={user.is_active ? "Active" : "Banned"}
            />

            <Info
              title="Joined"
              value={new Date(user.created_at).toLocaleString()}
            />

            <Info
              title="Last Seen"
              value={
                user.last_seen
                  ? new Date(user.last_seen).toLocaleString()
                  : "-"
              }
            />

          </div>

        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow">

          <h2 className="font-bold text-xl mb-5">
            Statistics
          </h2>

          <div className="grid grid-cols-2 gap-4">

            <Stat
              title="Stars"
              value={formatCount(user.stars_count)}
            />

            <Stat
              title="Starred"
              value={formatCount(user.starred_count)}
            />

            <Stat
              title="Credibility"
              value={formatCount(user.credibility_score)}
            />

            <Stat
              title="Posts"
              value="—"
            />

            <Stat
              title="Comments"
              value="—"
            />

            <Stat
              title="Reports"
              value="—"
            />

            <Stat
              title="Tribes Joined"
              value="—"
            />

            <Stat
              title="Views"
              value="—"
            />

          </div>

        </div>

      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow">

        <h2 className="font-bold text-xl mb-5">
          Admin Actions
        </h2>

        <div className="flex flex-wrap gap-3">

          {user.is_active ? (
            <button
              onClick={banUser}
              className="bg-red-600 text-white px-5 py-2 rounded-xl"
            >
              Ban User
            </button>
          ) : (
            <button
              onClick={unbanUser}
              className="bg-green-600 text-white px-5 py-2 rounded-xl"
            >
              Unban User
            </button>
          )}

          <button className="bg-blue-600 text-white px-5 py-2 rounded-xl">
            View Posts
          </button>

          <button className="bg-blue-600 text-white px-5 py-2 rounded-xl">
            View Comments
          </button>

          <button className="bg-orange-600 text-white px-5 py-2 rounded-xl">
            View Reports
          </button>

          <button className="bg-gray-700 text-white px-5 py-2 rounded-xl">
            Login Sessions
          </button>

          <button className="bg-purple-700 text-white px-5 py-2 rounded-xl">
            Reset Password
          </button>

          <button className="bg-indigo-700 text-white px-5 py-2 rounded-xl">
            Promote/Demote Admin
          </button>

        </div>

      </div>

    </div>
  );
}

function Info({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="flex justify-between border-b pb-2">
      <span className="font-medium">{title}</span>
      <span>{value}</span>
    </div>
  );
}

function Stat({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border p-4">
      <p className="text-gray-500 text-sm">
        {title}
      </p>

      <p className="text-2xl font-bold mt-1">
        {value}
      </p>
    </div>
  );
}