'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigation } from "@/utils/useNavigation";
import { Plus } from 'lucide-react'

import AppLink from '@/components/AppLink';
import { apiRequest } from '@/utils/api';

import {
  Search,
  MoreVertical,
  Check,
  X,
  Trash2,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';

type TribeRequestStatus = 'pending' | 'approved' | 'rejected';

interface TribeRequest {
  id: number;
  tribe_name: string;
  description: string;
  reason: string;
  status: TribeRequestStatus;
  created_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  creator: {
    id: number;
    username: string;
    email: string;
    avatar: string | null;
  };
  reviewed_by: {
    id: number;
    username: string;
  } | null;
}

export default function TribeRequestsPage() {
  const { push } = useNavigation();

  const [requests, setRequests] = useState<TribeRequest[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | TribeRequestStatus>('all');

  const [next, setNext] = useState<string | null>(null);
  const [count, setCount] = useState(0);

  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  const hasRequests = useMemo(
    () => requests.length > 0,
    [requests]
  );
  
  const fetchRequests = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);

        const params = new URLSearchParams({
          page: String(page),
          status,
          search,
        });

        const response = await apiRequest(
          `api/admin/tribe-requests/?${params.toString()}`
        );

        setRequests(response.results ?? []);
        setCount(response.count ?? 0);
        setNext(response.next ?? null);
      } catch (error) {
        console.error('Failed to fetch tribe requests:', error);
      } finally {
        setLoading(false);
      }
    },
    [search, status]
  );

  const loadMore = useCallback(async () => {
    if (!next || loadingMore) return;

    try {
      setLoadingMore(true);

      const url = new URL(next);
      const page = url.searchParams.get('page') ?? '1';

      const params = new URLSearchParams({
        page,
        status,
        search,
      });

      const response = await apiRequest(
        `api/admin/tribe-requests/?${params.toString()}`
      );

      setRequests((prev) => [...prev, ...(response.results ?? [])]);
      setNext(response.next ?? null);
      setCount(response.count ?? 0);
    } catch (error) {
      console.error('Failed to load more tribe requests:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [next, loadingMore, search, status]);

  const deleteRequest = async (requestId: number) => {
    try {
      await apiRequest(
        `api/admin/tribe-requests/${requestId}/delete/`,
        {
          method: 'DELETE',
        }
      );

      setOpenMenuId(null);
      fetchRequests();
    } catch (error) {
      console.error('Failed to delete request:', error);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);
  
  return (
    <div className="space-y-6 text-gray-700 dark:text-gray-200">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">TRIBE REQUESTS</h1>
            <button
              disabled={!selectedRequestId}
              onClick={() =>
                push(`/admin/tribes/${selectedRequestId}/create`)
              }
            >
              <Plus size={18} />
            </button>
          </div>
          <p className="text-sm text-gray-500">
            {count} request{count === 1 ? '' : 's'}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search creator, email or tribe..."
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 outline-none focus:border-blue-500 sm:w-80"
            />
          </div>

          <div className="relative">
            <select
              value={status}
              onChange={(e) =>
                setStatus(
                  e.target.value as 'all' | TribeRequestStatus
                )
              }
              className="appearance-none rounded-lg border border-gray-300 dark:bg-zinc-800 bg-white py-2 pl-4 pr-10 outline-none focus:border-blue-500"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            <ChevronDown className="pointer-events-none absolute left-24 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          </div>
        </div>
      </div>
  
      <div className="overflow-hidden rounded-xl border border-gray-200 dark:bg-zinc-700 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="border-b dark:bg-zinc-800 bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Creator
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Tribe
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Status
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Date
                </th>

                <th className="w-16 px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {requests.map((request) => (
                <tr
                  key={request.id}
                  onClick={() => setSelectedRequestId(request.id)}
                  className={`cursor-pointer border-b transition ${
                    selectedRequestId === request.id
                      ? "bg-blue-50 dark:bg-zinc-700"
                      : ""
                  }`}
                >
                  <td className="px-6 py-4">
                    <div>
                      <p onClick={() => {
                      setSelectedRequestId(request.id);
                      push(`/admin/tribes/${request.id}`);
                    }}
                      className="font-medium text-gray-900">
                        {request.creator.username}
                      </p>

                      <p className="text-sm text-gray-500">
                        {request.creator.email}
                      </p>
                    </div>
                  </td>

                  <td className="px-6 py-4 font-medium">
                    {request.tribe_name}
                  </td>

                  <td className="px-6 py-4">
                    {request.status === 'pending' && (
                      <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700">
                        Pending
                      </span>
                    )}

                    {request.status === 'approved' && (
                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                        Approved
                      </span>
                    )}

                    {request.status === 'rejected' && (
                      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                        Rejected
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(request.created_at).toLocaleDateString()}
                  </td>

                  <td
                    className="relative px-6 py-4 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMenuId(
                          openMenuId === request.id ? null : request.id
                        )
                      }
                      className="rounded-md p-2 transition hover:bg-gray-100"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </button>

                    {openMenuId === request.id && (
                      <div className="absolute right-4 top-12 z-20 w-52 rounded-lg border border-gray-200 dark:bg-zinc-800 bg-white shadow-lg">

                        {request.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              onClick={() => deleteRequest(request.id)}
                              className="flex w-full items-center gap-2 px-4 py-3 text-left text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete Request
                            </button>
                          </>
                        )}

                        {request.status === 'approved' && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                              push(`/main/tribe/${request.tribe.id}`)
                              }
                              className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-gray-50"
                            >
                              <ExternalLink className="h-4 w-4" />
                              Open Tribe
                            </button>

                            <button
                              type="button"
                              onClick={() => deleteRequest(request.id)}
                              className="flex w-full items-center gap-2 px-4 py-3 text-left text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete Tribe
                            </button>
                          </>
                        )}

                        {request.status === 'rejected' && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                push(`/admin/tribe-requests/${request.id}`)
                              }
                              className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-gray-50"
                            >
                              <ExternalLink className="h-4 w-4" />
                              View Reason
                            </button>

                            <button
                              type="button"
                              onClick={() => deleteRequest(request.id)}
                              className="flex w-full items-center gap-2 px-4 py-3 text-left text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete Request
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <p className="text-sm text-gray-500">
            Loading tribe requests...
          </p>
        </div>
      )}

      {!loading && requests.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white py-12 text-center">
          <h3 className="text-lg font-semibold text-gray-900">
            No tribe requests found
          </h3>

          <p className="mt-2 text-sm text-gray-500">
            Try changing the search term or status filter.
          </p>
        </div>
      )}

      {!loading && next && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="rounded-lg bg-black px-6 py-2 text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingMore ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}