'use client';

import { useState, useEffect } from 'react';
import { useNavigation } from "@/utils/useNavigation"
import AppLink from '@/components/AppLink';
import { apiRequest } from '@/utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import { connectUser, removeConnection } from '@/lib/api';
import { useContext } from "react";
import { UserContext } from "@/components/UserContext";

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
  last_sender_id?: number;
  last_message_type?: "text" | "image" | "video" | "audio" | "sticker" | "file";
};

export default function MessagesClient() {
  const [recentChats, setRecentChats] = useState<Chat[]>([]);
  const [connectedUsers, setConnectedUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showConnections, setShowConnections] = useState(false);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const { user } = useContext(UserContext)!;

  const { push, replace } = useNavigation();

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
  
  const openChatFromRecent = async (chat: any) => {
    try {
      // 1. open chat first
      push(`/main/messages/chat/${chat.chat_id}`);
  
      // 2. mark as seen immediately
      await apiRequest("api/chats/mark-seen/", {
        method: "POST",
        data: { chatId: chat.chat_id },
      });
  
      // 3. update UI instantly (no waiting reload)
      setRecentChats(prev =>
        prev.map(c =>
          c.chat_id === chat.chat_id
            ? { ...c, unseen: 0 }
            : c
        )
      );
  
    } catch (err) {
      console.error(err);
    }
  };

  const openChat = async (userId: number) => {
    try {
      const res = await apiRequest("api/chats/get-or-create/", {
        method: "POST",
        data: { user_id: userId },
      });
  
      push(
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
  
  const getPreviewText = (chat: Chat) => {
    const isMine = chat.last_sender_id === user?.id;
  
    const prefix = isMine ? "You: " : `${chat.username}: `;
  
    // MEDIA TYPE DETECTION (backend should send this)
    if ((chat as any).last_media_type === "image") {
      return prefix + "📸 Photo";
    }
  
    if ((chat as any).last_media_type === "video") {
      return prefix + "🎥 Video";
    }
  
    if ((chat as any).last_media_type === "audio") {
      return prefix + "🎤 Voice message";
    }
  
    if ((chat as any).last_media_type === "file") {
      return prefix + "📎 Attachment";
    }

    if ((chat as any).last_message_type === "sticker") {
      return prefix + "😀 Sticker";
    }
  
    return prefix + (chat.text || "");
  };

  return (
    <div className="flex flex-col mt-5 h-full p-4">

      {/* HEADER */}
      <h2 className="text-xl text-gray-700 dark:text-white font-bold mb-4">Messages</h2>

      {/* RECENT CHATS (MAIN INBOX) */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {recentChats.map(chat => {

          return (
            <div
              key={chat.id}
              onClick={() => openChatFromRecent(chat)}
              className="flex items-start gap-3 p-3 gap-3 p-3 overflow-hidden rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
            >

              {/* Avatar */}
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
            
              {/* Content */}
              <div className="flex-1 min-w-0 flex flex-col justify-between">
              
                {/* TOP ROW: username + time */}
                <div className="flex items-center justify-between gap-2">
                  <p className="text-gray-700 dark:text-white font-semibold truncate">
                    {chat.username}
                  </p>
              
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {formatChatTime(chat.created_at)}
                  </span>
                </div>
              
                {/* BOTTOM ROW: preview + unseen */}
                <div className="flex items-center justify-between gap-2 mt-1">
              
                  {/* Preview / Draft */}
                  {drafts[chat.chat_id] ? (
                    <p className="text-sm text-gray-500 truncate">
                      <span className="text-yellow-500 mr-1">Draft:</span>
                      {drafts[chat.chat_id]}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500 truncate">
                      {getPreviewText(chat)}
                    </p>
                  )}
              
                  {/* Unseen badge */}
                  {chat.unseen > 0 && (
                    <span className="text-xs bg-red-500 text-white px-2 rounded-full shrink-0">
                      {chat.unseen}
                    </span>
                  )}
                </div>
              
              </div>
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
              <AppLink
                href={'/main/discover'}
                prefetch={false}
                className="mt-4 w-full py-2 bg-indigo-600 text-white rounded-lg"
              >
                Find More People
              </AppLink>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function formatChatTime(dateString?: string) {
  if (!dateString) return "";

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";

  const now = new Date();

  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 1) {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (diffDays === 1) return "Yesterday";

  return date.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}