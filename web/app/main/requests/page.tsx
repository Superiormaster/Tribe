'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/utils/api';
import { removeConnection } from '@/lib/api';

type User = {
  id: number;
  username: string;
  avatar?: string;
  bio?: string;
};

type Tab = "connections" | "requests" | "sent";

export default function ConnectionsPage() {
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("connections");

  const [connectedUsers, setConnectedUsers] = useState<User[]>([]);
  const [requests, setRequests] = useState<User[]>([]);
  const [sentRequests, setSentRequests] = useState<User[]>([]);

  // =========================
  // FETCH DATA
  // =========================
  const fetchConnectedUsers = async () => {
    try {
      const res = await apiRequest("api/users/connected/");
      setConnectedUsers(res);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await apiRequest("api/users/pending-requests/");
      setRequests(res);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSentRequests = async () => {
    try {
      const res = await apiRequest("api/users/sent-requests/");
      setSentRequests(res);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchConnectedUsers();
    fetchRequests();
    fetchSentRequests();
  }, []);

  // =========================
  // ACTIONS
  // =========================
  const handleAccept = async (id: number) => {
    await apiRequest(`api/users/accept/${id}/`, { method: "POST" });

    setRequests(prev => prev.filter(u => u.id !== id));
    fetchConnectedUsers();
  };

  const handleDecline = async (id: number) => {
    await apiRequest(`api/users/decline/${id}/`, { method: "POST" });

    setRequests(prev => prev.filter(u => u.id !== id));
  };

  const handleCancel = async (id: number) => {
    await apiRequest(`api/users/cancel/${id}/`, { method: "POST" });

    setSentRequests(prev => prev.filter(u => u.id !== id));
  };

  const handleRemove = async (id: number) => {
    await removeConnection(id);

    setConnectedUsers(prev => prev.filter(u => u.id !== id));
  };

  const openChat = async (user: any) => {
    try {
      const res = await apiRequest("/api/chats/get-or-create/", {
        method: "POST",
        data: { user_id: user.id },
      });
  
      router.push(
        `/main/messages/chat/${res.chat_id}?username=${encodeURIComponent(res.username)}&avatar=${encodeURIComponent(res.avatar || '')}`
      );
    } catch (err) {
      console.error("Failed to open chat", err);
    }
  };

  // =========================
  // UI HELPERS
  // =========================
  const UserCard = ({
    user,
    actions,
  }: {
    user: User;
    actions: React.ReactNode;
  }) => (
    <div className="flex items-center justify-between p-3 border rounded-xl">

      {/* LEFT */}
      <div className="flex items-center gap-3">

        {user.avatar ? (
          <img
            src={user.avatar}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 bg-gray-400 rounded-full flex items-center justify-center text-white font-bold">
            {user.username.slice(0, 2).toUpperCase()}
          </div>
        )}

        <div>
          <p className="text-gray-700 dark:text-white font-semibold">{user.username}</p>
          <p className="text-xs text-gray-500">
            {user.bio || "No bio"}
          </p>
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex gap-2">{actions}</div>

    </div>
  );

  return (
    <div className="p-4 max-w-2xl mx-auto">

      <h1 className="text-xl text-gray-700 dark:text-white font-bold mb-4">Connections</h1>

      {/* TABS */}
      <div className="flex text-gray-700 gap-3 mb-4">

        <button
          onClick={() => setTab("connections")}
          className={`px-3 py-1 rounded-lg ${
            tab === "connections"
              ? "bg-indigo-600 text-white"
              : "bg-gray-200"
          }`}
        >
          Connections
        </button>

        <button
          onClick={() => setTab("requests")}
          className={`px-3 py-1 rounded-lg ${
            tab === "requests"
              ? "bg-indigo-600 text-white"
              : "bg-gray-200"
          }`}
        >
          Requests
        </button>

        <button
          onClick={() => setTab("sent")}
          className={`px-3 py-1 rounded-lg ${
            tab === "sent"
              ? "bg-indigo-600 text-white"
              : "bg-gray-200"
          }`}
        >
          Sent
        </button>

      </div>

      {/* =========================
          CONNECTIONS
      ========================= */}
      {tab === "connections" && (
        <div className="space-y-3">
          {connectedUsers.map(user => (
            <UserCard
              key={user.id}
              user={user}
              actions={
                <button
                  onClick={() => openChat(user)}
                  className="px-3 py-1 text-sm bg-indigo-600 text-white rounded-lg"
                >
                  Chat
                </button>
              }
            />
          ))}
        </div>
      )}

      {/* =========================
          REQUESTS (RECEIVED)
      ========================= */}
      {tab === "requests" && (
        <div className="space-y-3">
          {requests.map(user => (
            <UserCard
              key={user.id}
              user={user}
              actions={
                <>
                  <button
                    onClick={() => handleAccept(user.id)}
                    className="px-3 py-1 text-sm bg-green-500 text-white rounded-lg"
                  >
                    Accept
                  </button>

                  <button
                    onClick={() => handleDecline(user.id)}
                    className="px-3 py-1 text-sm bg-red-500 text-white rounded-lg"
                  >
                    Decline
                  </button>
                </>
              }
            />
          ))}
        </div>
      )}

      {/* =========================
          SENT REQUESTS
      ========================= */}
      {tab === "sent" && (
        <div className="space-y-3">
          {sentRequests.map(user => (
            <UserCard
              key={user.id}
              user={user}
              actions={
                <button
                  onClick={() => handleCancel(user.id)}
                  className="px-3 py-1 text-sm bg-red-500 text-white rounded-lg"
                >
                  Cancel
                </button>
              }
            />
          ))}
        </div>
      )}

    </div>
  );
}