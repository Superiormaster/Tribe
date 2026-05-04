'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import { connectUser, removeConnection } from '@/lib/api';

type User = {
  id: number;
  username: string;
  avatar?: string;
  bio?: string;
  connected?: boolean;
};

type Chat = {
  id: number;
  username: string;
  avatar?: string;
  text: string;
  created_at: string;
  fromUserId: number;
  toUserId: number;
};

export default function MessagesClient() {
  const [recentChats, setRecentChats] = useState<Chat[]>([]);
  const [connectedUsers, setConnectedUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showConnections, setShowConnections] = useState(false);

  const router = useRouter();

  useEffect(() => {
    fetchRecent();
  }, []);

  const fetchRecent = async () => {
    try {
      const chats = await apiRequest("api/chats/recent/");
      setRecentChats(chats);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchConnectedUsers = async () => {
    try {
      const res = await apiRequest("api/users/connected/");
      setConnectedUsers(res);
    } catch (err) {
      console.error(err);
    }
  };
  
  const openChatFromRecent = async (chat: Chat) => {
    const otherUserId =
      chat.fromUserId === currentUser.id
        ? chat.toUserId
        : chat.fromUserId;
  
    const res = await apiRequest(`api/chats/${chat.id}/`);
  
    setChatUser(res.other_user);
  
    openChat(otherUserId);
  };

  const openChat = async (userId: number) => {
    try {
      const res = await apiRequest("api/chats/get-or-create/", {
        method: "POST",
        data: { user_id: userId },
      });
  
      router.replace(
        `/main/messages/chat/${res.chat_id}`
      );
    } catch (err) {
      console.error("Failed to open chat", err);
    }
  };

  const openConnectionsPanel = async () => {
    await fetchConnectedUsers();
    setShowConnections(true);
  };

  const closeConnectionsPanel = () => {
    setShowConnections(false);
  };

  const handleOpenProfile = (user: User) => {
    setSelectedUser(user);
  };

  const handleConnect = async () => {
    if (!selectedUser) return;

    try {
      await connectUser(selectedUser.id);

      setConnectedUsers(prev =>
        prev.map(u =>
          u.id === selectedUser.id ? { ...u, connected: true } : u
        )
      );

      setSelectedUser(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemove = async () => {
    if (!selectedUser) return;

    try {
      await removeConnection(selectedUser.id);

      setConnectedUsers(prev =>
        prev.filter(u => u.id !== selectedUser.id)
      );

      setSelectedUser(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col mt-5 h-full p-4">

      {/* HEADER */}
      <h2 className="text-xl font-bold mb-4">Messages</h2>

      {/* RECENT CHATS (MAIN INBOX) */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {recentChats.map(chat => {

          return (
            <div
              key={chat.id}
              onClick={() => openChatFromRecent(chat)}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
            >
              {chat.avatar ? (
                <img
                  src={chat.avatar}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-400 flex items-center justify-center text-white font-bold">
                  {chat.username.slice(0, 2).toUpperCase()}
                </div>
              )}

              <div className="flex-1">
                <p className="font-semibold">{chat.username}</p>
                <p className="text-sm text-gray-500 truncate">
                  {chat.text}
                </p>
              </div>

              <span className="text-xs text-gray-400">
                {new Date(chat.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          );
        })}
      </div>

      {/* FLOATING BUTTON (CONNECTED USERS) */}
      <button
        onClick={openConnectionsPanel}
        className="fixed bottom-20 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg text-2xl"
      >
        💬
      </button>

      {/* CONNECTIONS PANEL */}
      <AnimatePresence>
        {showConnections && (
          <motion.div
            className="fixed inset-0 bg-black/40 mt-20 h-screen flex justify-end z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-80 h-full bg-white dark:bg-gray-900 p-4"
              initial={{ x: 300 }}
              animate={{ x: 0 }}
              exit={{ x: 300 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Connected Users</h3>
                <button onClick={closeConnectionsPanel}>✕</button>
              </div>

              <div className="space-y-2">
                {connectedUsers.map(user => (
                  <div
                    key={user.id}
                    onClick={() => openChat(user.id)}
                    className="flex items-center gap-3 p-2 rounded-lg cursor-pointer"
                  >
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center text-white font-bold">
                        {user.username.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span>{user.username}</span>
                  </div>
                ))}
              </div>

              {/* Add more connections button */}
              <button
                onClick={() => router.push('/main/discover')}
                className="mt-4 w-full py-2 bg-indigo-600 text-white rounded-lg"
              >
                Find More People
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}