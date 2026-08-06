'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '@/utils/api';
import { connectUser, removeConnection, cancelConnection } from '@/lib/api';
import { motion } from 'framer-motion';
import { useInviteSheet } from "@/components/invite/InviteContext";

type User = {
  id: number;
  username: string;
  avatar?: string;
  bio?: string;
  connected?: boolean;
  requestPending?: boolean;
};

export default function DiscoverPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const { showInvite } = useInviteSheet();

  useEffect(() => {
    fetchUsers();
  }, []);
  
  const fetchUsers = async () => {
    try {
      setLoading(true);
  
      const data = await apiRequest("api/users/discover-connect/");

      setUsers(data.results ?? data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleConnect = async (id: number) => {
    try {
      await connectUser(id);

      setUsers(prev =>
        prev.map(u =>
          u.id === id ? { ...u, requestPending: true } : u
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemove = async (id: number) => {
    try {
      await removeConnection(id);

      setUsers(prev =>
        prev.map(u =>
          u.id === id
            ? { ...u, connected: false, requestPending: false }
            : u
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancel = async (id: number) => {
    try {
      await cancelConnection(id);

      setUsers(prev =>
        prev.map(u =>
          u.id === id ? { ...u, requestPending: false } : u
        )
      );
    } catch (err) {
      console.error(err);
    }
  };
  
  if (!loading && users.length === 0) {
    return (
      <div className="my-20 flex flex-col items-center justify-center px-6 text-center">
  
        <div className="w-24 h-24 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-5xl">
          🚀
        </div>
  
        <h2 className="mt-6 text-2xl font-bold text-gray-900 dark:text-white">
          Help Grow Your Tribe
        </h2>
  
        <p className="mt-3 max-w-md text-gray-500 dark:text-gray-400">
          We couldn't find anyone to connect with right now.
          Invite your friends to join Tribe and be among the first to build an amazing community together.
        </p>
  
        <button
          onClick={showInvite}
          className="mt-8 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700 transition"
        >
          Invite Friends
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 my-20 max-w-2xl mx-auto">

      {/* HEADER */}
      <h1 className="text-xl font-bold mb-4">Discover People</h1>

      {/* LIST */}
      <div className="space-y-3">

        {users.map(user => (
          <motion.div
            key={user.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between p-3 rounded-xl border dark:border-gray-800 bg-white dark:bg-gray-900"
          >

            {/* LEFT */}
            <div className="flex items-center gap-3 flex-1 min-w-0">

              {user.avatar ? (
                <img
                  src={user.avatar}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-400 flex items-center justify-center text-white font-bold">
                  {user.username.slice(0, 2).toUpperCase()}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">
                  {user.username}
                </p>
              
                <p className="text-xs text-gray-500 ">
                  {user.bio || "No bio available"}
                </p>
              </div>
            </div>

            {/* RIGHT ACTIONS */}
            <div className="flex flex-col items-end gap-2 flex-shrink-0">

              {/* CONNECT */}
              {!user.connected && !user.requestPending && (
                <button
                  onClick={() => handleConnect(user.id)}
                  className="px-3 py-1 text-sm bg-indigo-600 text-white rounded-lg"
                >
                  Connect
                </button>
              )}

              {/* PENDING */}
              {user.requestPending && (
                <span className="text-xs text-yellow-500 font-medium">
                  Request Sent
                </span>
              )}

              {user.requestPending && (
                <button
                  onClick={() => handleCancel(user.id)}
                  className="px-3 py-1 text-sm bg-yellow-500 text-white rounded-lg"
                >
                  Cancel
                </button>
              )}

              {/* CONNECTED */}
              {user.connected && (
                <button
                  onClick={() => handleRemove(user.id)}
                  className="px-3 py-1 text-sm bg-red-500 text-white rounded-lg"
                >
                  Remove
                </button>
              )}

            </div>
          </motion.div>
        ))}

      </div>
    </div>
  );
}