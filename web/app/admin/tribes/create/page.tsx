'use client';

import { useEffect, useState } from 'react';
import { useParams} from 'next/navigation';
import { useNavigation } from "@/utils/useNavigation";
import { apiRequest } from '@/utils/api';

export default function CreateTribePage() {

    const { push, back } = useNavigation();
    const params = useParams();

    const requestId = Number(params.id);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [allowReels, setAllowReels] = useState(false);

    useEffect(() => {

        async function load() {

            try {

                const data = await apiRequest(
                    `api/admin/tribe-requests/${requestId}/`
                );

                setName(data.name);
                setDescription(data.description);

            } finally {

                setLoading(false);

            }

        }

        load();

    }, [requestId]);

    async function createTribe() {

        try {

            setSaving(true);

            const res = await apiRequest(
                "api/admin/tribe-requests/create-tribe/",
                {
                    method: "POST",
                    data: {
                        request_id: requestId,
                        name,
                        description,
                        allow_reels: allowReels,
                    },
                }
            );

            push(`/tribes/${res.tribe.id}`);

        } catch (err) {

            console.error(err);

        } finally {

            setSaving(false);

        }

    }

    if (loading) {

        return (
            <div className="p-10">
                Loading...
            </div>
        );

    }

    return (

        <div className="mx-auto text-gray-700 dark:text-gray-200 max-w-3xl space-y-6">

            <div>

                <h1 className="text-3xl font-bold">
                    Create Tribe
                </h1>

                <p className="text-gray-500">
                    Review and edit before creating the tribe.
                </p>

            </div>

            <div>

                <label className="block text-sm font-medium mb-2">
                    Tribe Name
                </label>

                <input
                    value={name}
                    onChange={(e)=>setName(e.target.value)}
                    className="w-full rounded-lg border p-3"
                />

            </div>

            <div>

                <label className="block text-sm font-medium mb-2">
                    Description
                </label>

                <textarea
                    rows={8}
                    value={description}
                    onChange={(e)=>setDescription(e.target.value)}
                    className="w-full rounded-lg border p-3"
                />

            </div>

            <label className="flex items-center gap-3">

                <input
                    type="checkbox"
                    checked={allowReels}
                    onChange={(e)=>setAllowReels(e.target.checked)}
                />

                Allow reels

            </label>

            <div className="flex gap-4">

                <button
                    onClick={()=>back()}
                    className="rounded-lg border px-6 py-3"
                >
                    Cancel
                </button>

                <button
                    disabled={saving}
                    onClick={createTribe}
                    className="rounded-lg bg-black px-6 py-3 text-white"
                >
                    {saving ? "Creating..." : "Create Tribe"}
                </button>

            </div>

        </div>

    );

}