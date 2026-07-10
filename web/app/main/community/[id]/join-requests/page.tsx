'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AppLink from '@/components/AppLink';

import { apiRequest } from '@/utils/api';
import Skeleton from '@/components/Skeleton';

export default function JoinRequestsPage() {
  const { id } = useParams();

  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [nextUrl, setNextUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async (
    url?: string
  ) => {
    try {

      const data = await apiRequest(
        url ||
        `api/communities/${id}/join_requests/`
      );

      if (url) {
        setRequests(prev => [
          ...prev,
          ...(data.results || [])
        ]);
      } else {
        setRequests(data.results || []);
      }

      setNextUrl(data.next);

    } catch (err) {

      console.error(err);

    } finally {

      setLoading(false);
    }
  };

  const handleApprove = async (
    requestId: number
  ) => {
    try {

      await apiRequest(
        `api/communities/${id}/approve_request/`,
        {
          method: 'POST',
          data: {
            request_id: requestId,
          },
        }
      );

      setRequests(prev =>
        prev.filter(
          r => r.id !== requestId
        )
      );

    } catch (err) {

      console.error(err);
    }
  };

  const handleReject = async (
    requestId: number
  ) => {
    try {

      await apiRequest(
        `api/communities/${id}/reject_request/`,
        {
          method: 'POST',
          data: {
            request_id: requestId,
          },
        }
      );

      setRequests(prev =>
        prev.filter(
          r => r.id !== requestId
        )
      );

    } catch (err) {

      console.error(err);
    }
  };

  if (loading) return <Skeleton />;

  return (
    <div className="max-w-2xl my-20 mx-auto p-3 space-y-4">

      <h1 className="text-2xl font-bold text-gray-700 dark:text-white">
        Join Requests
      </h1>

      {requests.map((request) => (
        <div
          key={request.id}
          className="p-4 border rounded-2xl flex items-center justify-between"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">

            <AppLink
              href={`/main/profile/${request.user.username}`}
              prefetch={false}
            >
              {request.user.avatar ? (
                <img
                  src={request.user.avatar}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-400" />
              )}
            </AppLink>
          
            <div className="min-w-0">
              <p className="font-semibold truncate text-gray-700 dark:text-white max-w-[180px]">
                {request.user.username}
              </p>
          
              <p className="text-sm text-gray-500">
                Requested to join
              </p>
            </div>
          
          </div>

          <div className="flex flex-col gap-2">

            <button
              onClick={() =>
                handleApprove(request.id)
              }
              className="px-2 py-1 rounded-full bg-green-600 text-white"
            >
              Approve
            </button>

            <button
              onClick={() =>
                handleReject(request.id)
              }
              className="px-2 py-1 rounded-full bg-red-600 text-white"
            >
              Reject
            </button>

          </div>

        </div>
      ))}

      {nextUrl && (
        <button
          onClick={() =>
            fetchRequests(nextUrl)
          }
          className="w-full p-3 rounded-xl bg-indigo-600 text-white"
        >
          Load More
        </button>
      )}

      {!requests.length && (
        <div className="text-center text-gray-500 py-10">
          No join requests
        </div>
      )}

    </div>
  );
}