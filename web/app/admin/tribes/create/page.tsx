'use client';

import { useState } from 'react';
import { useNavigation } from '@/utils/useNavigation';
import { apiRequest } from '@/utils/api';

export default function CreateTribePage() {
  const { push, back } = useNavigation();

  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [allowReels, setAllowReels] = useState(false);

  async function createTribe() {
    try {
      setSaving(true);

      const tribe = await apiRequest(
        'api/admin/tribes/create/',
        {
          method: 'POST',
          data: {
            name,
            description,
            allow_reels: allowReels,
          },
        }
      );

      push(`/admin/tribes/${tribe.id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 text-gray-700 dark:text-gray-200">

      <div>
        <h1 className="text-3xl font-bold">
          Create Tribe
        </h1>

        <p className="text-gray-500">
          Create a new tribe manually.
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">
          Tribe Name
        </label>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter tribe name"
          className="w-full rounded-lg border p-3"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">
          Description
        </label>

        <textarea
          rows={8}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe this tribe..."
          className="w-full rounded-lg border p-3"
        />
      </div>

      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={allowReels}
          onChange={(e) => setAllowReels(e.target.checked)}
        />

        Allow Reels
      </label>

      <div className="flex gap-4">
        <button
          onClick={back}
          className="rounded-lg border px-6 py-3"
        >
          Cancel
        </button>

        <button
          disabled={saving}
          onClick={createTribe}
          className="rounded-lg bg-black px-6 py-3 text-white"
        >
          {saving ? 'Creating...' : 'Create Tribe'}
        </button>
      </div>

    </div>
  );
}