'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '@/utils/api';
import { useNavigation } from "@/utils/useNavigation"
import { Search } from 'lucide-react';

type User = {
  id: number;
  username: string;
  full_name: string;
  avatar?: string;
};

export default function MutedPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [next, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { push, replace } = useNavigation();

  const fetchMuted = async (reset = false, query = search, pageNum = 1) => {
    try {
      setLoading(true);

      const data = await apiRequest(
        `api/users/mutes/?search=${query}&page=${pageNum}`
      );

      const newUsers = data.results;

      setUsers(prev =>
        reset ? newUsers : [...prev, ...newUsers]
      );

      setNext(data.next);
      setPage(pageNum);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 🔍 debounce search
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchMuted(true, search, 1);
    }, 400);

    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    fetchMuted(true, '', 1);
  }, []);

  // 🔇 UNMUTE ACTION
  const handleUnmute = async (userId: number) => {
    try {
      await apiRequest(`api/users/unmute/${userId}/`, {
        method: 'POST',
      });

      // remove from UI instantly
      setUsers(prev => prev.filter(u => u.id !== userId));

    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-2xl my-20 mx-auto p-4">

      {/* HEADER */}
      <h1 className="text-2xl text-gray-700 dark:text-gray-300 font-bold mb-4">Muted Users</h1>

      {/* SEARCH */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search muted users..."
          className="w-full pl-10 pr-3 py-2 border rounded-lg dark:bg-gray-900"
        />
      </div>

      {/* LIST */}
      <div className="space-y-3">

        {users.length === 0 && !loading && (
          <p className="text-gray-500 text-center mt-10">
            No muted users found.
          </p>
        )}

        {users.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg"
          >
            {/* LEFT SIDE */}
            <div className="flex items-center gap-3">
              <img
                src={user.avatar || '/avatar.png'}
                className="w-10 h-10 rounded-full object-cover"
              />

              <div className="text-gray-600 dark:text-gray-500" onClick={() => push(`/main/profile/${user.username}`)}>
                <p className="font-semibold truncate">{user.full_name}</p>
                <p className="text-sm text-gray-500">
                  @{user.username}
                </p>
              </div>
            </div>

            {/* RIGHT SIDE - UNMUTE BUTTON */}
            <button
              onClick={() => handleUnmute(user.id)}
              className="px-3 py-1 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              Unmute
            </button>
          </div>
        ))}
      </div>

      {/* LOAD MORE */}
      {next && (
        <button
          onClick={() => fetchMuted(false, search, page + 1)}
          disabled={loading}
          className="mt-4 w-full py-2 bg-indigo-600 text-white rounded-lg"
        >
          {loading ? 'Loading...' : 'Load more'}
        </button>
      )}
    </div>
  );
}