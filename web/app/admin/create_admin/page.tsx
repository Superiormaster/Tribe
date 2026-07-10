'use client';

import { useState } from 'react';
import { apiRequest } from '@/utils/api';

export default function CreateAdminPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [creatorType, setCreatorType] = useState('journalist');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (loading) return;

    setLoading(true);
    setSuccess('');
    setError('');

    try {
      await apiRequest(
        'api/admin/admins/create/',
        {
          method: 'POST',
          data: {
            username,
            email,
            password,
            creator_type: creatorType,
          },
        }
      );

      setSuccess(
        'Admin created successfully.'
      );

      setUsername('');
      setEmail('');
      setPassword('');
      setCreatorType('journalist');
    } catch (err: any) {
      setError(
        err?.detail ||
          err?.message ||
          'Failed to create admin.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">

      <h1 className="text-3xl font-bold mb-6">
        Create Admin
      </h1>

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-zinc-900 rounded-xl shadow p-6 space-y-5"
      >

        {success && (
          <div className="bg-green-100 text-green-700 px-4 py-2 rounded">
            {success}
          </div>
        )}

        {error && (
          <div className="bg-red-100 text-red-700 px-4 py-2 rounded">
            {error}
          </div>
        )}

        <div>
          <label className="block mb-1">
            Username
          </label>

          <input
            value={username}
            onChange={(e) =>
              setUsername(e.target.value)
            }
            className="w-full border rounded-lg p-2 dark:bg-zinc-800"
            required
          />
        </div>

        <div>
          <label className="block mb-1">
            Email
          </label>

          <input
            type="email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            className="w-full border rounded-lg p-2 dark:bg-zinc-800"
            required
          />
        </div>

        <div>
          <label className="block mb-1">
            Creator Type
          </label>

          <select
            value={creatorType}
            onChange={(e) =>
              setCreatorType(e.target.value)
            }
            className="w-full border rounded-lg p-2 dark:bg-zinc-800"
          >
            <option value="journalist">
              Journalist
            </option>

            <option value="analyst">
              Analyst
            </option>

            <option value="blogger">
              Blogger
            </option>

            <option value="news_org">
              News Organization
            </option>

            <option value="reporter">
              Community Reporter
            </option>
          </select>
        </div>

        <div>
          <label className="block mb-1">
            Password
          </label>

          <input
            type="password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            className="w-full border rounded-lg p-2 dark:bg-zinc-800"
            required
          />
        </div>

        <button
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700"
        >
          {loading
            ? 'Creating...'
            : 'Create Admin'}
        </button>

      </form>

    </div>
  );
}