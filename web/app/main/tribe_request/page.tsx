'use client';

import { useState } from 'react';
import { apiRequest } from '@/utils/api';
import { useNavigation } from '@/utils/useNavigation';
import AppLink from '@/components/AppLink';

export default function RequestTribePage() {
  const { push } = useNavigation();

  const [name, setName] = useState('');
  const [description, setDescription] =
    useState('');
  const [reason, setReason] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState('');

  const [error, setError] =
    useState('');
  
  const [tribeRequest, setTribeRequest] = useState<any>(null);

  const submit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setError('');
    setMessage('');

    if (!name.trim()) {
      setError('Tribe name is required.');
      return;
    }

    if (!description.trim()) {
      setError(
        'Please describe the tribe.'
      );
      return;
    }

    if (!reason.trim()) {
      setError(
        'Please tell us why this tribe should exist.'
      );
      return;
    }

    try {
      setLoading(true);

      const response = await apiRequest(
        'api/tribe-requests/',
        {
          method: 'POST',
          data: {
            name,
            description,
            request_reason: reason,
          },
        }
      );
      
      setTribeRequest(response);

      setMessage(
        'Your tribe request has been submitted successfully.'
      );

      setName('');
      setDescription('');
      setReason('');

      setTimeout(() => {
        push(`/main/tribe_request/${tribeRequest.id}`);
      }, 1500);
    } catch (err: any) {
      console.error(err);

      if (err?.response?.data) {
        const data =
          err.response.data;

        const firstError =
          Object.values(data)[0];

        if (
          Array.isArray(firstError)
        ) {
          setError(firstError[0]);
        } else {
          setError(
            'Unable to submit request.'
          );
        }
      } else {
        setError(
          'Something went wrong.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl text-gray-700 dark:text-gray-200 my-16 mx-auto py-10 px-4">

      <div className="bg-white dark:bg-gray-900 border border-indigo-600 dark:border-gray-300 rounded-3xl shadow py-4 px-6">

        <h1 className="text-3xl mb-8 font-bold">
          Request a Tribe
        </h1>

        <AppLink
          href={`/main/tribe_request/history`}
          prefetch={false}
          className="absolute top-40 right-10 px-3 py-1 bg-green-500 text-white rounded-full text-sm"
        >
          Tribe Request
        </AppLink>

        <p className="text-gray-500 mt-2">
          Can't find the tribe you're
          looking for? Send a request to
          our admins.
        </p>

        {message && (
          <div className="mt-5 rounded-xl bg-green-100 text-green-700 p-3">
            {message}
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-xl bg-red-100 text-red-700 p-3">
            {error}
          </div>
        )}

        <form
          onSubmit={submit}
          className="space-y-5 mt-8"
        >
          <div>
            <label className="font-medium">
              Tribe Name
            </label>

            <input
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              maxLength={100}
              placeholder="e.g Football"
              className="w-full mt-2 rounded-xl border p-3 bg-transparent"
            />

            <div className="text-right text-xs text-gray-500 mt-1">
              {name.length}/100
            </div>
          </div>

          <div>
            <label className="font-medium">
              Tribe Description
            </label>

            <textarea
              rows={5}
              value={description}
              onChange={(e) =>
                setDescription(
                  e.target.value
                )
              }
              placeholder="Describe what this tribe is about..."
              className="w-full mt-2 rounded-xl border p-3 bg-transparent resize-none"
            />

            <div className="text-right text-xs text-gray-500 mt-1">
              {description.length}
            </div>
          </div>

          <div>
            <label className="font-medium">
              Why should this tribe
              exist?
            </label>

            <textarea
              rows={6}
              value={reason}
              onChange={(e) =>
                setReason(
                  e.target.value
                )
              }
              placeholder="Explain why this tribe would benefit the app..."
              className="w-full mt-2 rounded-xl border p-3 bg-transparent resize-none"
            />

            <div className="text-right text-xs text-gray-500 mt-1">
              {reason.length}
            </div>
          </div>

          <button
            disabled={loading}
            className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white py-3 font-semibold disabled:opacity-50"
          >
            {loading
              ? 'Submitting...'
              : 'Submit Tribe Request'}
          </button>
        </form>
      </div>
    </div>
  );
}