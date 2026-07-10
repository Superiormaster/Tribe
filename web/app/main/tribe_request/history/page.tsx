'use client';

import { useEffect, useState } from 'react';
import { Search, MoreVertical, Trash2 } from 'lucide-react';
import { apiRequest } from '@/utils/api';
import AppLink from '@/components/AppLink';

type TribeRequest = {
  id: number;
  name: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

export default function TribeRequestHistoryPage() {
  const [requests, setRequests] = useState<TribeRequest[]>([]);
  const [next, setNext] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');

  const [status, setStatus] = useState('all');

  const [menu, setMenu] = useState<number | null>(null);

  useEffect(() => {
    loadRequests();
  }, [search, status]);

  const loadRequests = async (url?: string) => {
    try {
      const endpoint =
        url ??
        `api/tribe-requests/?search=${search}&status=${status}`;

      const data = await apiRequest(endpoint);

      if (url) {
        setRequests((prev) => [...prev, ...data.results]);
      } else {
        setRequests(data.results);
      }

      setNext(data.next);
    } finally {
      setLoading(false);
    }
  };

  const deleteRequest = async (id: number) => {
    if (!confirm('Delete this request?')) return;

    try {
      await apiRequest(
        `api/tribe-requests/${id}/delete/`,
        {
          method: 'DELETE',
        }
      );

      setRequests((prev) =>
        prev.filter((r) => r.id !== id)
      );
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-3xl my-16 mx-auto py-8 px-4 text-gray-700 dark:text-gray-200">

      <h1 className="text-3xl font-bold">
        My Tribe Requests
      </h1>

      <p className="text-gray-500 mt-2">
        Track all tribe requests you've submitted.
      </p>

      <div className="flex gap-3 mt-6">

        <div className="relative flex-1">

          <Search
            size={18}
            className="absolute left-3 top-3"
          />

          <input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search tribe..."
            className="w-full rounded-xl border pl-10 pr-4 py-3 bg-transparent"
          />

        </div>

        <select
          value={status}
          onChange={(e) =>
            setStatus(e.target.value)
          }
          className="rounded-xl border px-4 bg-transparent"
        >
          <option value="all">All</option>
          <option value="pending">
            Pending
          </option>
          <option value="approved">
            Approved
          </option>
          <option value="rejected">
            Rejected
          </option>
        </select>

      </div>

      <div className="mt-8 space-y-3">

        {!loading &&
          requests.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No tribe requests found.
            </div>
          )}

        {requests.map((request) => (
          <div
            key={request.id}
            className="bg-white dark:bg-gray-800 rounded-2xl border p-4 flex items-center justify-between"
          >

            <AppLink
              href={`/main/tribe_request/${request.id}`}
              prefetch={false}
              className="flex-1"
            >
              <h3 className="font-semibold">
                {request.name}
              </h3>

              <p
                className={`mt-2 text-sm font-medium ${
                  request.status ===
                  'approved'
                    ? 'text-green-600'
                    : request.status ===
                      'rejected'
                    ? 'text-red-600'
                    : 'text-yellow-600'
                }`}
              >
                {request.status.toUpperCase()}
              </p>
            </AppLink>

            <div className="relative">

              <button
                onClick={() =>
                  setMenu(
                    menu === request.id
                      ? null
                      : request.id
                  )
                }
              >
                <MoreVertical size={20} />
              </button>

              {menu === request.id && (
                <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-zinc-900 border rounded-xl shadow-lg z-10">

                  <button
                    onClick={() =>
                      deleteRequest(request.id)
                    }
                    className="flex items-center gap-2 w-full px-4 py-3 hover:bg-red-50 dark:hover:bg-red-950 text-red-600"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>

                </div>
              )}

            </div>

          </div>
        ))}

      </div>

      {next && (
        <button
          onClick={() => loadRequests(next)}
          className="w-full mt-6 rounded-xl bg-indigo-600 text-white py-3"
        >
          Load More
        </button>
      )}

    </div>
  );
}