'use client';

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useNavigation } from "@/utils/useNavigation";
import { apiRequest } from "@/utils/api";

import {
  ArrowLeft,
  Pencil,
  Trash2,
  Plus,
  Users,
  Video,
} from "lucide-react";

interface Community {
  id: number;
  name: string;
  members: number;
}

interface Tribe {
  id: number;
  name: string;
  description: string;
  allow_reels: boolean;
  created_at: string;
  communities: Community[];
}

export default function TribeDetailPage() {

  const { push } = useNavigation();
  const params = useParams();

  const tribeId = Number(params.id);

  const [tribe, setTribe] =
    useState<Tribe | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [editing, setEditing] =
    useState(false);

  const [name, setName] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [allowReels, setAllowReels] =
    useState(false);

  const fetchTribe = useCallback(async () => {

    try {

      setLoading(true);

      const res = await apiRequest(
        `api/admin/tribes/${tribeId}/`
      );

      setTribe(res);

      setName(res.name);
      setDescription(res.description);
      setAllowReels(res.allow_reels);

    } catch (err) {

      console.error(err);

    } finally {

      setLoading(false);

    }

  }, [tribeId]);

  useEffect(() => {

    if (!Number.isNaN(tribeId)) {
      fetchTribe();
    }

  }, [fetchTribe, tribeId]);

  async function saveTribe() {

    try {

      setSaving(true);

      await apiRequest(
        `api/admin/tribes/${tribeId}/update/`,
        {
          method: "PATCH",
          data: {
            name,
            description,
            allow_reels: allowReels,
          },
        }
      );

      setEditing(false);

      fetchTribe();

    } catch (err) {

      console.error(err);

    } finally {

      setSaving(false);

    }

  }

  async function deleteTribe() {

    const ok = window.confirm(
      "Delete this tribe?"
    );

    if (!ok) return;

    try {

      await apiRequest(
        `api/admin/tribes/${tribeId}/delete/`,
        {
          method: "DELETE",
        }
      );

      push("/admin/tribes");

    } catch (err) {

      console.error(err);

    }

  }

  if (loading) {

    return (
      <div className="py-12 text-center">
        Loading...
      </div>
    );

  }

  if (!tribe) {

    return (
      <div className="py-12 text-center">
        Tribe not found.
      </div>
    );

  }

  return (

    <div className="mx-auto max-w-5xl space-y-6 text-gray-700 dark:text-gray-200">

      <button
        onClick={() =>
          push("/admin/tribes")
        }
        className="flex items-center gap-2 text-sm"
      >
        <ArrowLeft size={18}/>
        Back
      </button>

      <div className="rounded-xl border bg-white dark:bg-zinc-800 p-6">

        {!editing ? (

          <>
            <div className="flex items-center justify-between">

              <div>

                <h1 className="text-3xl font-bold">
                  {tribe.name}
                </h1>

                <p className="mt-2 text-gray-500">
                  {tribe.description}
                </p>

              </div>

              <div className="flex gap-2">

                <button
                  onClick={() =>
                    setEditing(true)
                  }
                  className="rounded-lg border px-4 py-2"
                >
                  <Pencil size={18}/>
                </button>

                <button
                  onClick={deleteTribe}
                  className="rounded-lg border border-red-300 px-4 py-2 text-red-600"
                >
                  <Trash2 size={18}/>
                </button>

              </div>

            </div>

            <div className="mt-6 flex gap-8">

              <div className="flex items-center gap-2">
                <Users size={18}/>
                {tribe.communities.length} Communities
              </div>

              <div className="flex items-center gap-2">
                <Video size={18}/>
                {tribe.allow_reels ? "Reels Enabled" : "Reels Disabled"}
              </div>

            </div>

          </>

        ) : (

          <div className="space-y-4">

            <input
              value={name}
              onChange={(e)=>
                setName(e.target.value)
              }
              className="w-full rounded-lg border p-3"
            />

            <textarea
              rows={6}
              value={description}
              onChange={(e)=>
                setDescription(e.target.value)
              }
              className="w-full rounded-lg border p-3"
            />

            <label className="flex items-center gap-3">

              <input
                type="checkbox"
                checked={allowReels}
                onChange={(e)=>
                  setAllowReels(
                    e.target.checked
                  )
                }
              />

              Allow reels

            </label>

            <div className="flex gap-3">

              <button
                disabled={saving}
                onClick={saveTribe}
                className="rounded-lg bg-black px-6 py-2 text-white"
              >
                {saving ? "Saving..." : "Save"}
              </button>

              <button
                onClick={() =>
                  setEditing(false)
                }
                className="rounded-lg border px-6 py-2"
              >
                Cancel
              </button>

            </div>

          </div>

        )}

      </div>
  
      <div className="rounded-xl border bg-white dark:bg-zinc-800 p-6">

        <div className="mb-6 flex items-center justify-between">

          <div>

            <h2 className="text-xl font-semibold">
              Communities
            </h2>

            <p className="text-sm text-gray-500">
              Manage communities belonging to this tribe.
            </p>

          </div>

          <button
            onClick={() =>
              push(
                `/admin/communities/create?tribe=${tribe.id}`
              )
            }
            className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-white"
          >
            <Plus size={18} />
            Create Community
          </button>

        </div>

        {tribe.communities.length === 0 ? (

          <div className="rounded-lg border border-dashed py-12 text-center">

            <h3 className="text-lg font-semibold">
              No communities yet
            </h3>

            <p className="mt-2 text-sm text-gray-500">
              Create the first community for this tribe.
            </p>

          </div>

        ) : (

          <div className="overflow-hidden rounded-xl border">

            <table className="min-w-full">

              <thead className="border-b bg-gray-50 dark:bg-zinc-900">

                <tr>

                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Community
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Members
                  </th>

                </tr>

              </thead>

              <tbody>

                {tribe.communities.map((community) => (

                  <tr
                    key={community.id}
                    onClick={() =>
                      push(
                        `/admin/communities/${community.id}`
                      )
                    }
                    className="cursor-pointer border-b transition hover:bg-gray-50 dark:hover:bg-zinc-700"
                  >

                    <td className="px-6 py-4">

                      <div className="font-medium">
                        {community.name}
                      </div>

                    </td>

                    <td className="px-6 py-4">

                      <div className="flex items-center gap-2">

                        <Users size={16} />

                        {community.members}

                      </div>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </div>

    </div>

  );

}