'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '@/utils/api';

type User = {
  id: number;
  email: string;
  creator_type?: string;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await apiRequest('api/admin/users/');
      setUsers(data);
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

  const filtered = users.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Users</h1>

      <input
        className="border p-2 mb-4 w-full"
        placeholder="Search users..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="space-y-2">
        {filtered.map((user) => (
          <div
            key={user.id}
            className="bg-white p-3 flex justify-between"
          >
            <div>
              <p>{user.email}</p>
              <small>{user.creator_type}</small>
            </div>

            <button
              onClick={() => banUser(user.id)}
              className="bg-red-500 text-white px-3 py-1"
            >
              Ban
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}