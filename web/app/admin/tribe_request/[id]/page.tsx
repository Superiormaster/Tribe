'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useNavigation } from "@/utils/useNavigation";

import { apiRequest } from '@/utils/api';

import {
  ArrowLeft,
  Check,
  X,
  Trash2,
  User,
  Users,
  Calendar,
  Shield,
  FileText,
  SquareArrowOutUpRight,
} from 'lucide-react';

type TribeRequestStatus = 'pending' | 'approved' | 'rejected';

interface TribeRequestDetail {
  id: number;
  tribe_name: string;
  description: string;
  tribe: {
    id: number;
    name: string;
  } | null;
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

export default function TribeRequestDetailPage() {
  const { push } = useNavigation();
  const params = useParams();

  const requestId = Number(params.id);

  const [request, setRequest] = useState<TribeRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const fetchRequest = useCallback(async () => {
    try {
      setLoading(true);

      const response = await apiRequest(
        `api/admin/tribe-requests/${requestId}/`
      );

      setRequest(response);
    } catch (error) {
      console.error('Failed to fetch tribe request:', error);
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  const approveRequest = () => {
    push(`/admin/tribe_request/${requestId}/create`);
  }

  const rejectRequest = async () => {
    const reason = window.prompt('Enter rejection reason');

    if (!reason?.trim()) return;

    try {
      setSubmitting(true);

      await apiRequest('api/admin/tribe-requests/reject/', {
        method: 'POST',
        data: {
          request_id: requestId,
          reason: reason.trim(),
        },
      });

      await fetchRequest();
    } catch (error) {
      console.error('Failed to reject tribe request:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteRequest = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this request?'
    );

    if (!confirmed) return;

    try {
      setSubmitting(true);

      await apiRequest(
        `api/admin/tribe-requests/${requestId}/delete/`,
        {
          method: 'DELETE',
        }
      );

      push('/admin/tribe_request');
    } catch (error) {
      console.error('Failed to delete tribe request:', error);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!Number.isNaN(requestId)) {
      fetchRequest();
    }
  }, [fetchRequest, requestId]);
  
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-sm text-gray-500">
          Loading tribe request...
        </p>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-sm text-red-500">
          Tribe request not found.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto text-gray-700 dark:text-gray-200 max-w-5xl space-y-6">
      <button
        type="button"
        onClick={() => push('/admin/tribe_request')}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-black"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Tribe Requests
      </button>

      <div className="rounded-xl border border-gray-200 bg-white dark:bg-zinc-800 p-6">
        <h1 className="text-2xl font-bold">
          {request.tribe_name}
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Review and manage this tribe creation request.
        </p>
      </div>
  
      <div className="grid gap-6">
        <div className="rounded-xl border border-gray-200 bg-white dark:bg-zinc-800 p-6">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold">Creator</h2>
          </div>

          <div className="mt-4 space-y-1">
            <p className="font-medium">{request.creator.username}</p>
            <p className="text-sm text-gray-500">
              {request.creator.email}
            </p>
          </div>
        </div>

        <div className="rounded-xl border dark:bg-zinc-800 border-gray-200 bg-white p-6">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold">Tribe Name</h2>
          </div>

          <p className="mt-4">{request.tribe_name}</p>
        </div>

        <div className="rounded-xl border dark:bg-zinc-800 border-gray-200 bg-white p-6">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold">Description</h2>
          </div>

          <p className="mt-4 whitespace-pre-wrap text-gray-700">
            {request.description}
          </p>
        </div>

        <div className="rounded-xl border dark:bg-zinc-800 border-gray-200 bg-white p-6">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold">Reason</h2>
          </div>

          <p className="mt-4 whitespace-pre-wrap text-gray-700">
            {request.reason}
          </p>
        </div>

        <div className="rounded-xl border dark:bg-zinc-800 border-gray-200 bg-white p-6">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold">Requested</h2>
          </div>

          <p className="mt-4">
            {new Date(request.created_at).toLocaleString()}
          </p>
        </div>

        <div className="rounded-xl border dark:bg-zinc-800 border-gray-200 bg-white p-6">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold">Reviewed By</h2>
          </div>

          <p className="mt-4">
            {request.reviewed_by?.username ?? '—'}
          </p>
        </div>

        <div className="rounded-xl border dark:bg-zinc-800 border-gray-200 bg-white p-6">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold">Reviewed At</h2>
          </div>

          <p className="mt-4">
            {request.reviewed_at
              ? new Date(request.reviewed_at).toLocaleString()
              : '—'}
          </p>
        </div>

        <div className="rounded-xl border dark:bg-zinc-800 border-gray-200 bg-white p-6">
          <div className="flex items-center gap-2">
            <X className="h-5 w-5 text-red-500" />
            <h2 className="text-lg font-semibold">
              Rejection Reason
            </h2>
          </div>

          <p className="mt-4 whitespace-pre-wrap text-gray-700">
            {request.rejection_reason || '—'}
          </p>
        </div>
      </div>
  
      <div className="rounded-xl border border-gray-200 dark:bg-zinc-800 bg-white p-6">
        <h2 className="text-lg font-semibold">Actions</h2>
        <p className="mt-1 text-sm text-gray-500">
          Manage this tribe request
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          {request.status === 'pending' && (
            <>
              <button
                type="button"
                onClick={approveRequest}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white transition hover:bg-green-700 disabled:opacity-60"
              >
                <Check className="h-4 w-4" />
                Approve
              </button>

              <button
                type="button"
                onClick={rejectRequest}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                <X className="h-4 w-4" />
                Reject
              </button>

              <button
                type="button"
                onClick={deleteRequest}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-red-600 transition hover:bg-red-50 disabled:opacity-60"
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
                disabled={!request.tribe}
                onClick={() => {
                  if (request.tribe) {
                    push(`/main/tribe_request/${request.tribe.id}`);
                  }
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-white transition hover:bg-gray-800"
              >
                <SquareArrowOutUpRight className="h-4 w-4" />
                Open Tribe
              </button>

              <button
                type="button"
                onClick={deleteRequest}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-red-600 transition hover:bg-red-50 disabled:opacity-60"
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
                  push('/admin/tribe_request')
                }
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 transition hover:bg-gray-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to List
              </button>

              <button
                type="button"
                onClick={deleteRequest}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-red-600 transition hover:bg-red-50 disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                Delete Request
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}