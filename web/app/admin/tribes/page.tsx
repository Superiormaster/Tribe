'use client';

import { useCallback, useEffect, useState } from 'react';
import { useNavigation } from "@/utils/useNavigation";
import { apiRequest } from '@/utils/api';

import {
  Search,
  Plus,
  Users,
  ChevronDown,
} from 'lucide-react';

interface Tribe {
  id: number;
  name: string;
  description: string;
  allow_reels: boolean;
  community_count: number;
  created_at: string;
}

export default function TribesPage() {
  const { push } = useNavigation();

  const [tribes, setTribes] = useState<Tribe[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [search, setSearch] = useState("");

  const [count, setCount] = useState(0);
  const [next, setNext] = useState<string | null>(null);

  const fetchTribes = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);

        const params = new URLSearchParams({
          page: String(page),
          search,
        });

        const res = await apiRequest(
          `api/admin/tribes/?${params.toString()}`
        );

        setTribes(res.results ?? []);
        setCount(res.count ?? 0);
        setNext(res.next ?? null);

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [search]
  );

  const loadMore = useCallback(async () => {

    if (!next || loadingMore) return;

    try {

      setLoadingMore(true);

      const url = new URL(next);

      const page =
        url.searchParams.get("page") ?? "1";

      const params = new URLSearchParams({
        page,
        search,
      });

      const res = await apiRequest(
        `api/admin/tribes/?${params.toString()}`
      );

      setTribes((prev) => [
        ...prev,
        ...(res.results ?? []),
      ]);

      setNext(res.next ?? null);

    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }

  }, [next, loadingMore, search]);

  useEffect(() => {
    fetchTribes();
  }, [fetchTribes]);

  return (
    <div className="space-y-6 text-gray-700 dark:text-gray-200">

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

        <div>
          <h1 className="text-2xl font-bold">
            TRIBES
          </h1>

          <p className="text-sm text-gray-500">
            {count} tribe{count === 1 ? "" : "s"}
          </p>
        </div>

        <button
          onClick={() =>
            push("/admin/tribes/create")
          }
          className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-white"
        >
          <Plus size={18} />
          Create Tribe
        </button>

      </div>

      <div className="flex flex-col gap-3 sm:flex-row">

        <div className="relative">

          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

          <input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search tribe..."
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 outline-none focus:border-blue-500 sm:w-80"
          />

        </div>

      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 dark:bg-zinc-700 bg-white">

        <div className="overflow-x-auto">

          <table className="min-w-full">

            <thead className="border-b bg-gray-50 dark:bg-zinc-800">

              <tr>

                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Tribe
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Communities
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Reels
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Created
                </th>

              </tr>

            </thead>

            <tbody>

              {tribes.map((tribe) => (

                <tr
                  key={tribe.id}
                  onClick={() =>
                    push(`/admin/tribes/${tribe.id}`)
                  }
                  className="cursor-pointer border-b transition hover:bg-gray-50 dark:hover:bg-zinc-800"
                >

                  <td className="px-6 py-4">

                    <p className="font-semibold">
                      {tribe.name}
                    </p>

                    <p className="text-sm text-gray-500 line-clamp-2">
                      {tribe.description}
                    </p>

                  </td>

                  <td className="px-6 py-4">

                    <div className="flex items-center gap-2">

                      <Users size={16} />

                      {tribe.community_count}

                    </div>

                  </td>

                  <td className="px-6 py-4">

                    {tribe.allow_reels ? (
                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                        Enabled
                      </span>
                    ) : (
                      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                        Disabled
                      </span>
                    )}

                  </td>

                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(
                      tribe.created_at
                    ).toLocaleDateString()}
                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      </div>

      {loading && (
        <div className="py-8 text-center text-gray-500">
          Loading tribes...
        </div>
      )}

      {!loading && tribes.length === 0 && (
        <div className="rounded-xl border border-dashed py-12 text-center">

          <h2 className="text-lg font-semibold">
            No tribes found
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Create your first tribe.
          </p>

        </div>
      )}

      {!loading && next && (
        <div className="flex justify-center">

          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="rounded-lg bg-black px-6 py-2 text-white"
          >
            {loadingMore
              ? "Loading..."
              : "Load More"}
          </button>

        </div>
      )}

    </div>
  );
}