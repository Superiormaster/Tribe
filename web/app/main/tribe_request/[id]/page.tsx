'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiRequest } from '@/utils/api';
import Skeleton from '@/components/Skeleton';

type TribeRequest = {
  id: number;
  name: string;
  description: string;
  request_reason: string;

  status: 'pending' | 'approved' | 'rejected';

  rejection_reason: string;

  reviewed_at: string | null;

  reviewed_by: {
    id: number;
    username: string;
  } | null;

  created_at: string;
};

export default function TribeRequestDetailsPage() {
  const params = useParams();

  const [request, setRequest] =
    useState<TribeRequest | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  useEffect(() => {
    fetchRequest();
  }, []);

  const fetchRequest = async () => {
    try {
      setLoading(true);

      const data = await apiRequest(
        `api/tribe-requests/${params.id}/`
      );

      setRequest(data);
    } catch (err) {
      console.error(err);
      setError(
        'Unable to load this tribe request.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4">
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="max-w-3xl mx-auto py-10 px-4 text-center text-red-500">
        {error || 'Request not found.'}
      </div>
    );
  }

  return (
    <div className="max-w-3xl text-gray-700 dark:text-gray-200 my-16 mx-auto py-8 px-4">

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow p-6">

        <h1 className="text-3xl font-bold">
          Tribe Request
        </h1>

        <p className="text-gray-500 mt-2">
          Review of your tribe request.
        </p>

        <div className="mt-8 space-y-6">

          <div>
            <p className="font-semibold mb-2">
              Tribe Name
            </p>

            <div className="rounded-xl border p-4">
              {request.name}
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">
              Description
            </p>

            <div className="rounded-xl border p-4 whitespace-pre-wrap">
              {request.description}
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">
              Why you requested this tribe
            </p>

            <div className="rounded-xl border p-4 whitespace-pre-wrap">
              {request.request_reason}
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">
              Status
            </p>

            <span
              className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${
                request.status === 'approved'
                  ? 'bg-green-100 text-green-700'
                  : request.status === 'rejected'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {request.status.toUpperCase()}
            </span>
          </div>

          {request.reviewed_by && (
            <div>
              <p className="font-semibold mb-2">
                Reviewed By
              </p>

              <div className="rounded-xl border p-4">
                @{request.reviewed_by.username}
              </div>
            </div>
          )}

          {request.reviewed_at && (
            <div>
              <p className="font-semibold mb-2">
                Reviewed On
              </p>

              <div className="rounded-xl border p-4">
                {new Date(
                  request.reviewed_at
                ).toLocaleString()}
              </div>
            </div>
          )}

          {request.status === 'approved' && (
            <div className="rounded-2xl bg-green-100 dark:bg-green-950 border border-green-300 dark:border-green-700 p-5">

              <h2 className="font-bold text-green-700 dark:text-green-300">
                🎉 Congratulations!
              </h2>

              <p className="mt-2 text-green-700 dark:text-green-300">
                Your tribe request has been approved by the
                Tribe administration team.
              </p>

            </div>
          )}

          {request.status === 'rejected' && (
            <div className="rounded-2xl bg-red-100 dark:bg-red-950 border border-red-300 dark:border-red-700 p-5">

              <h2 className="font-bold text-red-700 dark:text-red-300">
                Request Rejected
              </h2>

              <p className="mt-3 text-sm font-semibold text-red-700 dark:text-red-300">
                Reason for rejection
              </p>

              <p className="mt-2 whitespace-pre-wrap text-red-700 dark:text-red-300">
                {request.rejection_reason}
              </p>

            </div>
          )}

          {request.status === 'pending' && (
            <div className="rounded-2xl bg-yellow-100 dark:bg-yellow-950 border border-yellow-300 dark:border-yellow-700 p-5">

              <h2 className="font-bold text-yellow-700 dark:text-yellow-300">
                Awaiting Review
              </h2>

              <p className="mt-2 text-yellow-700 dark:text-yellow-300">
                Your request is currently being reviewed by the
                Tribe administration team.
              </p>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}