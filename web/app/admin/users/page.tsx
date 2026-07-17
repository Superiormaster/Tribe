'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '@/utils/api';
import { useNavigation } from "@/utils/useNavigation";
import { ChevronRight } from "lucide-react";

type User = {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const { push } = useNavigation();
  const [count, setCount] = useState(0);
  const [next, setNext] = useState<string | null>(null);
  const [previous, setPrevious] = useState<string | null>(null);
  
  useEffect(() => {
    fetchUsers();
  }, [search]);
  
  const fetchUsers = async () => {
    try {
      const data = await apiRequest(
        `api/admin/users/?search=${encodeURIComponent(search)}`
      );
  
      setUsers(data.results);
      setCount(data.count);
      setNext(data.next);
      setPrevious(data.previous);
    } catch (err) {
      console.error(err);
    }
  };

  const banUser = async (id: number | string) => {
    try {
      await apiRequest('api/admin/users/ban/', {
        method: 'POST',
        data: { user_id: id },
      });

      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };
  
  const unbanUser = async (id: number) => {
    await apiRequest("api/admin/users/unban/", {
        method: "POST",
        data: {
            user_id: id,
        },
    });

    fetchUsers();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Users</h1>

      <input
        className="border rounded-xl p-2 mb-4 w-full"
        placeholder="Search users..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="space-y-2">
        {users.map((user) => (
          <div
            key={user.id}
            onClick={() => push(`/admin/users/${user.id}`)}
            className="cursor-pointer dark:bg-zinc-800 bg-white p-3 rounded-xl flex justify-between items-center hover:bg-zinc-100 dark:hover:bg-zinc-700"
          >
            <div className="flex-1 min-w-0">
              <p
                className="font-semibold truncate"
                title={user.username}
              >
                {user.username}
              </p>
            
              <p
                className="text-sm text-gray-500 truncate"
                title={user.email}
              >
                {user.email}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {user.is_active ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    banUser(user.id);
                  }}
                  className="bg-red-500 text-white px-3 py-1 rounded"
                >
                  Ban
                </button>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    unbanUser(user.id);
                  }}
                  className="bg-green-600 text-white px-3 py-1 rounded"
                >
                  Unban
                </button>
              )}
            
              <ChevronRight size={18} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}