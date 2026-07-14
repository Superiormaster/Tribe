'use client';

import { useState, useEffect, useRef } from 'react';
import { useNavigation } from "@/utils/useNavigation"
import AppLink from '@/components/AppLink';
import { apiRequest } from '@/utils/api';
import { useChatSocket } from '@/lib/useChatSocket';
import { motion, AnimatePresence } from 'framer-motion';
import { connectUser, removeConnection } from '@/lib/api';
import { useContext } from "react";
import { UserContext } from "@/components/UserContext";
import { getAllDrafts, getPendingMessages, getAllChatMeta, deleteChatData, resetDatabase } from "@/lib/messageDB";
import { useChatSelection } from '@/hooks/useChatSelection';
import MessagesSkeleton
from '@/components/chat/MessagesSkeleton';
import { pinChat, archiveChat, deleteChat, deleteChats } from '@/utils/chat/MessageClientApi';
import { Pin } from 'lucide-react';
import ChatDeleteModal from '@/components/chat/ChatDeleteModal';
import MessageSelection from '@/components/chat/MessageSelection';

type User = {
  id: number;
  username: string;
  avatar?: string;
  bio?: string;
  connected?: boolean;
};

type MessageStatus =
  | "sending"
  | "pending"
  | "sent"
  | "delivered"
  | "seen";
  
type ChatStatus =
  | "sending"
  | "pending"
  | "sent"
  | "delivered"
  | "seen";

type Chat = {
  id: number;
  username: string;
  avatar?: string;
  text: string;
  encrypted_text: string;
  created_at: string;
  fromUserId: number;
  toUserId: number;
  last_sender_id?: number;
  last_message_type?: "text" | "image" | "video" | "audio" | "sticker" | "gif";
  chat_id: number;
  unseen?: number;
  last_media_type?: string;
  pinned?: boolean;
  pinned_at?: string | null;
  status?: ChatStatus;
};

export default function MessagesClient() {
  const [recentChats, setRecentChats] = useState<Chat[]>([]);
  const [connectedUsers, setConnectedUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showConnections, setShowConnections] = useState(false);
  const [connectedPage, setConnectedPage] =
    useState(1);
  const [nextPage, setNextPage] =
    useState<number | null>(1);
  const [hasMoreConnections, setHasMoreConnections] =
    useState(true);
  const [loadingConnections, setLoadingConnections] =
    useState(false);
  const loadedRef = useRef(false);
  const [pinnedCount, setPinnedCount] =
    useState(0);
  const [pendingMap, setPendingMap] =
    useState<Record<number, any>>({});
  const [drafts, setDrafts] =
    useState<Record<number, any>>({});
  const [chatMeta, setChatMeta] =
    useState<Record<number, any>>({});
  const { user } = useContext(UserContext)!;
  const connectionsRef =
    useRef<HTMLDivElement>(null);
  const [loadingRecent, setLoadingRecent] =
    useState(false);
  const [showChatDeleteModal, setShowChatDeleteModal] =
    useState(false);
  const timer = useRef<NodeJS.Timeout | null>(
    null
  );
  const [recentLoaded, setRecentLoaded] =
    useState(false);
  const [initialLoading, setInitialLoading] =
    useState(true);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const movedDuringTouch = useRef(false);
  const didLongPress = useRef(false);

  const { push, replace } = useNavigation();
  
  const STATUS_PRIORITY: Record<MessageStatus, number> = {
    sending: 0,
    pending: 0,
    sent: 1,
    delivered: 2,
    seen: 3,
  };
  
  const updateStatus = (
    oldStatus: MessageStatus,
    newStatus: MessageStatus
  ): MessageStatus => {
    return STATUS_PRIORITY[newStatus] >
      STATUS_PRIORITY[oldStatus]
      ? newStatus
      : oldStatus;
  };
  
  const handleDelivered = ({
    chatId,
    messageIds,
  }: {
    chatId: number;
    messageIds: number[];
  }) => {
    setRecentChats(prev =>
      prev.map(chat => {
        if (chat.chat_id !== chatId)
          return chat;
  
        return {
          ...chat,
          status: updateStatus(
            chat.status ?? "sending",
            "delivered"
          ),
        };
      })
    );
  };
  
  const handleSeen = ({
    chatId,
    messageIds,
    userId,
  }: {
    chatId: number;
    messageIds: number[];
    userId: number;
  }) => {
    if (userId === user.id)
      return;
  
    setRecentChats(prev =>
      prev.map(chat => {
        if (chat.chat_id !== chatId)
          return chat;
  
        return {
          ...chat,
          status: updateStatus(
            chat.status ?? "sending",
            "seen"
          ),
        };
      })
    );
  };

  const currentUser = user;
  const socketRef = useChatSocket(
    null,
    currentUser,
    {
      onSeen: handleSeen,
      onDelivered: handleDelivered,
    }
  );
  
  useEffect(() => {
    const handler = () => {
      fetchRecent(1);
    };
  
    window.addEventListener("message-synced", handler);
    window.addEventListener("message-delivered", handler);
    window.addEventListener("message-seen", handler);
  
    return () => {
      window.removeEventListener("message-synced", handler);
      window.removeEventListener("message-delivered", handler);
      window.removeEventListener("message-seen", handler);
    };
  }, []);
  
  useEffect(() => {
    if (!user?.id) return;
  
    if (loadedRef.current) return;
  
    loadedRef.current = true;
  
    const loadEverything = async () => {
      try {
        const [
          draftsData,
          pendingData,
          metaData,
        ] = await Promise.all([
          getAllDrafts(),
          getPendingMessages(user.id),
          getAllChatMeta(),
        ]);
        console.log("Pending data", pendingData);
  
        const draftMap: Record<number, any> = {};
        const pendingMap: Record<number, any> = {};
        const metaMap: Record<number, any> = {};
  
        draftsData.forEach((d: any) => {
          draftMap[d.chatId] = d;
        });
  
        pendingData.forEach((m: any) => {
            const chatId = m.chat ?? m.chatId;
            const existing = pendingMap[chatId];
        
            if (
                !existing ||
                new Date(m.created_at).getTime() >
                    new Date(existing.created_at).getTime()
            ) {
                pendingMap[chatId] = m;
            }
        });
  
        metaData.forEach((m: any) => {
          metaMap[m.chatId] = m;
        });
  
        setDrafts(draftMap);
        setPendingMap(pendingMap);
        setChatMeta(metaMap);
  
        await fetchRecent(1);
      } finally {
        setInitialLoading(false);
      }
    };
  
    loadEverything();
  }, [user?.id]);
  
  useEffect(() => {
    const handler = (e: any) => {
      const { chatId, text, updated_at } = e.detail;
    
      setDrafts(prev => {
        const next = { ...prev };
    
        if (!text?.trim()) {
          delete next[chatId];
        } else {
          next[chatId] = {
            text,
            updated_at,
          };
        }
    
        return next;
      });
    };
  
    window.addEventListener(
      "draft-updated",
      handler
    );
  
    return () =>
      window.removeEventListener(
        "draft-updated",
        handler
      );
  }, []);
  
  useEffect(() => {
    const handler = (e: any) => {
      const { chatId } = e.detail;
  
      setRecentChats(prev =>
        prev.filter(
          c => c.chat_id !== chatId
        )
      );
  
      setDrafts(prev => {
        const next = { ...prev };
        delete next[chatId];
        return next;
      });
  
      setPendingMap(prev => {
        const next = { ...prev };
        delete next[chatId];
        return next;
      });
    };
  
    window.addEventListener(
      "chat-deleted",
      handler
    );
  
    return () =>
      window.removeEventListener(
        "chat-deleted",
        handler
      );
  }, []);
  
  useEffect(() => {
    const handler = () => {
      fetchRecent();
    };
  
    window.addEventListener(
      "chat-updated",
      handler
    );
  
    window.addEventListener(
      "chat-deleted",
      handler
    );
  
    return () => {
      window.removeEventListener(
        "chat-updated",
        handler
      );
  
      window.removeEventListener(
        "chat-deleted",
        handler
      );
    };
  }, []);
  
  useEffect(() => {
    const delivered = (e: any) => {
      const {
        chatId,
        messageIds,
      } = e.detail;
  
      setPendingMap(prev => {
        const next = { ...prev };
  
        if (
          next[chatId] &&
          messageIds.includes(next[chatId].id)
        ) {
          next[chatId] = {
            ...next[chatId],
            status: "delivered",
          };
        }
  
        return next;
      });
    };
  
    window.addEventListener(
      "message-delivered",
      delivered
    );
  
    return () =>
      window.removeEventListener(
        "message-delivered",
        delivered
      );
  }, []);

  useEffect(() => {
    const handler = (e: any) => {
      const { chatId } = e.detail;
  
      setPendingMap(prev => {
        const next = { ...prev };
        delete next[chatId];
        return next;
      });
  
      setDrafts(prev => {
        const next = { ...prev };
        delete next[chatId];
        return next;
      });
    };
  
    window.addEventListener(
      "message-synced",
      handler
    );
  
    return () =>
      window.removeEventListener(
        "message-synced",
        handler
      );
  }, []);

  const fetchRecent = async (
    page = 1
  ) => {
    if (loadingRecent) return;
  
    setLoadingRecent(true);
  
    try {
      const res = await apiRequest(
        `api/chats/recent/?page=${page}`
      );
      console.log("Recent chat", res);
      const serverChats: Chat[] = res.results;

      {/*setRecentChats(prev =>
        prev.map(chat =>
          chat.chat_id === message.chat
            ? {
                ...chat,
                text: message.encrypted_text,
                created_at: message.created_at,
                last_sender_id: message.sender,
                last_media_type: message.media_type,
              }
            : chat
        )
      );*/}

      setRecentChats(prev => {
        const updated = serverChats.map(chat => {
          const pending = pendingMap[chat.chat_id];
      
          if (pending) {
            return {
              ...chat,
              text: pending.encrypted_text ?? pending.text,
              created_at: pending.created_at,
              last_sender_id: pending.sender,
              last_media_type: pending.media_type,
              status: pending.status,
            };
          }
      
          return chat;
        });
      
        return updated.sort((a, b) => {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
      
          if (a.pinned && b.pinned) {
            return (
              new Date(b.pinned_at || 0).getTime() -
              new Date(a.pinned_at || 0).getTime()
            );
          }
      
          return (
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
          );
        });
      });
  
      setNextPage(res.next_page);
    } finally {
      setRecentLoaded(true);
      setLoadingRecent(false);
    }
  };
  
  const fetchConnectedUsers = async (
    page = 1
  ) => {
    if (loadingConnections) return;
  
    try {
      setLoadingConnections(true);
  
      const res = await apiRequest(
        `api/users/connected/?page=${page}`
      );
  
      if (page === 1) {
        setConnectedUsers(res.results);
      } else {
        setConnectedUsers(prev => [
          ...prev,
          ...res.results,
        ]);
      }
  
      setHasMoreConnections(
        !!res.next
      );
  
      setConnectedPage(page);
  
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingConnections(false);
    }
  };
  
  const handleConnectionsScroll = () => {
    const el = connectionsRef.current;
  
    if (!el) return;
  
    const nearBottom =
      el.scrollTop + el.clientHeight >=
      el.scrollHeight - 200;
  
    if (
      nearBottom &&
      hasMoreConnections &&
      !loadingConnections
    ) {
      fetchConnectedUsers(
        connectedPage + 1
      );
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
    setConnectedUsers([]);
    setConnectedPage(1);
    setHasMoreConnections(true);
  
    await fetchConnectedUsers(1);
  
    setShowConnections(true);
  };

  const closeConnectionsPanel = () => {
    setShowConnections(false);
  };

  const handleOpenProfile = (user: User) => {
    setSelectedUser(user);
  };
  
  useEffect(() => {
    const onScroll = () => {
      if (
        window.innerHeight + window.scrollY >=
        document.body.offsetHeight - 200
      ) {
        if (nextPage) {
          fetchRecent(nextPage);
        }
      }
    };
  
    window.addEventListener("scroll", onScroll);
    return () =>
      window.removeEventListener("scroll", onScroll);
  }, [nextPage]);

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
  
  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "uploading":
      case "sending":
      case "pending":
        return "⏳";
  
      case "sent":
        return "✓";
  
      case "delivered":
        return "✓✓";
  
      case "seen":
        return "✓✓";
  
      case "failed":
        return "⚠️";
  
      default:
        return "";
    }
  };
  
  const getPreviewText = (chat: Chat) => {
    console.log("PREVIEW CHAT", chat);
    const isMine =
      chat.last_sender_id === user?.id;
  
    const type =
      (chat as any).media_type;
  
    const isSeen = chat.status === "seen";
  
    const icon =
      getStatusIcon(chat.status);
  
    let text = chat.text || chat.encrypted_text || "";
  
    switch (type) {
      case "image":
          text = "📸 Photo";
          break;
      
      case "video":
          text = "🎥 Video";
          break;
  
      case "gallery":
        text = "📁 Media";
        break;
  
      case "audio":
        text = "🎤 Voice message";
        break;
  
      case "gif":
        text = "📎 GIF";
        break;
  
      case "sticker":
        text = "😀 Sticker";
        break;
    }
  
    return (
      <>
        {isMine && icon && (
          <span
            className={
              isSeen
                ? "text-indigo-600 mr-1"
                : "mr-1"
            }
          >
            {icon}
          </span>
        )}
    
        <span className="mr-1">
          {isMine ? "You:" : `${chat.username}:`}
        </span>
    
        {text}
      </>
    );
  };
  
  const getOfflinePreview = (
    msg?: any,
  ) => {
    if (!msg) return "";
  
    const prefix = "You: "
  
    const statusIcon =
      getStatusIcon(msg.status);
  
    switch (msg.media_type) {
      case "image":
        return `${statusIcon} ${prefix}📸 Photo`;
  
      case "video":
        return `${statusIcon} ${prefix}🎥 Video`;
  
      case "gallery":
        return `${statusIcon} ${prefix}📁 Media`;
  
      case "audio":
        return `${statusIcon} ${prefix}🎤 Voice message`;
  
      case "gif":
        return `${statusIcon} ${prefix}📎 GIF`;
  
      case "sticker":
        return `${statusIcon} ${prefix}😀 Sticker`;
  
      default:
        return (
          `${statusIcon} ${prefix}` +
          (
            msg.text ||
            msg.encrypted_text ||
            msg.caption
          )
        );
    }
  };
  
  const {
    selectedChat,
    toggleSelectChat,
    clearChatSelection,
  } = useChatSelection()
  const selectionMode =
    selectedChat.size > 0;
  const hasSelection =
    selectedChat.size > 0;
  
  const selectedItems = recentChats.filter(
    chat =>
      selectedChat.has(chat.chat_id)
  );
  
  const backendChatIds = new Set(
    recentChats.map(c => c.chat_id)
  );

  const localChats: number[] =
  !recentLoaded
    ? []
    : Object.keys({
        ...drafts,
        ...pendingMap,
      })
        .map(Number)
        .filter(chatId => {
          if (backendChatIds.has(chatId)) {
            return false;
          }

          return drafts[chatId] || pendingMap[chatId];
        });
  
  const unpinnedSelected =
    selectedItems.filter(
      c => !c.pinned
    ).length;
  
  const canPinSelection =
    pinnedCount + unpinnedSelected <= 5;
  
  const allPinned =
    selectedItems.length > 0 &&
    selectedItems.every(c => c.pinned);

  const handlePinChat = async () => {
    try {
      const ids = [...selectedChat];
  
      await Promise.all(
        ids.map(id => pinChat(id))
      );
  
      const pinning =
        selectedItems.filter(
          c => !c.pinned
        ).length;
  
      const unpinning =
        selectedItems.filter(
          c => c.pinned
        ).length;
  
      setPinnedCount(prev =>
        prev + pinning - unpinning
      );
  
      setRecentChats(prev => {
        const updated = prev.map(chat => {
          if (ids.includes(chat.chat_id)) {
            const nextPinned =
              !chat.pinned;
  
            return {
              ...chat,
              pinned: nextPinned,
              pinned_at: nextPinned
                ? new Date().toISOString()
                : null,
            };
          }
  
          return chat;
        });
  
        return updated.sort((a, b) => {
          if (a.pinned && !b.pinned)
            return -1;
  
          if (!a.pinned && b.pinned)
            return 1;
  
          if (a.pinned && b.pinned) {
            return (
              new Date(
                b.pinned_at || 0
              ).getTime() -
              new Date(
                a.pinned_at || 0
              ).getTime()
            );
          }
  
          return (
            new Date(
              b.created_at
            ).getTime() -
            new Date(
              a.created_at
            ).getTime()
          );
        });
      });
  
      clearChatSelection();
    } catch (err) {
      console.error(err);
    }
  };
  
  const handleArchiveChat = async () => {
    try {
      await Promise.all(
        [...selectedChat].map(id =>
          archiveChat(id)
        )
      );
  
      clearChatSelection();
      fetchRecent(1);

    } catch (err) {
      console.error(err);
    }
  };
  
  const handleDeleteSelectedChats = async () => {
    try {
      const chatIds = Array.from(selectedChat);
  
      //
      // Hide messages + clean IndexedDB
      //
      await Promise.all(
        chatIds.map(async (id) => {
          await apiRequest(
            `api/chats/${id}/hide-all/`,
            {
              method: "POST",
            }
          );
      
          await deleteChatData(
            id,
            user.id
          );
        })
      );
      
      if (chatIds.length === 1) {
        await deleteChat(chatIds[0]);
      } else {
        await deleteChats(chatIds);
      }
  
      // Dispatch events
      chatIds.forEach((id) => {
        window.dispatchEvent(
          new CustomEvent(
            "chat-deleted",
            {
              detail: {
                chatId: id,
              },
            }
          )
        );
      });
  
      //
      // Update UI
      //
      setRecentChats((prev) =>
        prev.filter(
          (c) =>
            !chatIds.includes(
              c.chat_id
            )
        )
      );
  
      clearChatSelection();
      setShowChatDeleteModal(false);
    } catch (err) {
      console.error(err);
    }
  };
  
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('chat-selection-change', {
        detail: {
          active: selectedChat.size > 0,
        },
      })
    );
  }, [selectedChat.size]);
  
  if (initialLoading) {
    return <MessagesSkeleton />;
  }
  
  return (
    <div className="flex flex-col my-20 h-full p-4">
  
      <ChatDeleteModal
        open={showChatDeleteModal}
        count={selectedChat.size}
        onClose={() =>
          setShowChatDeleteModal(false)
        }
        onDeleteChat={handleDeleteSelectedChats}
      />
  
      <MessageSelection
        selectedCount={selectedChat.size}
        hasMultiple={selectedChat.size > 1}
        onClose={clearChatSelection}
        canPinMore={canPinSelection}
        onPin={handlePinChat}
        allPinned={allPinned}
        onUnpin={handlePinChat}
        onArchive={handleArchiveChat}
        onDeleteChat={() => setShowChatDeleteModal(true)}
      />

      {/* HEADER */}
      <h2 className="text-xl text-gray-700 dark:text-white font-bold mb-4">Messages</h2>

      {/* RECENT CHATS (MAIN INBOX) */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {localChats.map(chatId => {
          const draft = drafts[chatId];
          const pending = pendingMap[chatId];
        
          const localChat = {
            id: chatId,
            chat_id: chatId,
            username:
              pending?.username ||
              draft?.username ||
              chatMeta[chatId]?.username ||
              "Unknown",
            
            avatar:
              pending?.avatar ||
              draft?.avatar ||
              chatMeta[chatId]?.avatar,
            pinned: false,
            pinned_at: null,
            unseen: 0,
            created_at:
              pending?.created_at ||
              draft?.updated_at,
          };
        
          const displayTime =
            pending?.created_at ||
            draft?.updated_at;
        
          return (
            <div
              key={`local-${chatId}`}
              
              onPointerDown={(e) => {
                didLongPress.current = false;
                movedDuringTouch.current = false;
              
                touchStartX.current = e.clientX;
                touchStartY.current = e.clientY;
              
                longPressTimer.current = setTimeout(() => {
                  if (!movedDuringTouch.current) {
                    didLongPress.current = true;
                    toggleSelectChat(chatId);
                  }
                }, 500);
              }}
              
              onPointerMove={(e) => {
                const dx = Math.abs(
                  e.clientX - touchStartX.current
                );
              
                const dy = Math.abs(
                  e.clientY - touchStartY.current
                );
              
                if (dx > 5 || dy > 5) {
                  movedDuringTouch.current = true;
              
                  if (longPressTimer.current) {
                    clearTimeout(longPressTimer.current);
                    longPressTimer.current = null;
                  }
                }
              }}
              
              onPointerUp={() => {
                if (longPressTimer.current) {
                  clearTimeout(longPressTimer.current);
                  longPressTimer.current = null;
                }
              
                if (didLongPress.current) {
                  setTimeout(() => {
                    didLongPress.current = false;
                  }, 100);
              
                  return;
                }
              
                if (selectedChat.size > 0) {
                  toggleSelectChat(chatId);
                } else {
                  push(
                    `/main/messages/chat/${chatId}`
                  );
                }
              }}
              
              onPointerCancel={() => {
                if (longPressTimer.current) {
                  clearTimeout(longPressTimer.current);
                  longPressTimer.current = null;
                }
              }}
              className={`
                flex items-start gap-3 p-3 rounded-lg
                cursor-pointer
                ${
                  selectedChat.has(chatId)
                    ? "bg-blue-100 dark:bg-blue-900"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800"
                }
              `}
            >
              {localChat.avatar ? (
                <img
                  src={localChat.avatar}
                  className="
                    w-12 h-12 rounded-full
                    object-cover
                  "
                />
              ) : (
                <div
                  className="
                    w-12 h-12 rounded-full
                    bg-gray-400
                    flex items-center
                    justify-center
                    text-white font-bold
                  "
                >
                  {localChat.username
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
              )}
          
              <div className="flex-1 min-w-0">
                <div
                  className="
                    flex items-center
                    justify-between
                  "
                >
                  <p
                    className="
                      text-gray-700
                      dark:text-white
                      font-semibold
                      truncate
                    "
                  >
                    {localChat.username}
                  </p>
          
                  <span
                    className="
                      text-xs text-gray-400
                    "
                  >
                    {formatChatTime(
                      displayTime
                    )}
                  </span>
                </div>
          
                <div
                  className="
                    flex items-center
                    justify-between
                    mt-1
                  "
                >
                  {draft?.text ? (
                    <p
                      className="
                        text-sm
                        text-gray-500
                        truncate
                      "
                    >
                      <span
                        className="
                          text-yellow-500
                          mr-1
                        "
                      >
                        Draft:
                      </span>
                      {draft.text}
                    </p>
                  ) : (
                    <p
                      className="
                        text-sm
                        text-yellow-500
                        truncate
                      "
                    >
                      {getOfflinePreview(
                        pending
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {recentChats.map(chat => {
          console.log("RECENT CHAT:", {
            id: chat.id,
            text: chat.text,
            last_message_type: (chat as any).last_message_type,
            last_media_type: (chat as any).last_media_type,
            full: chat,
          });
        
          const draft = drafts[chat.chat_id];
          const pending = pendingMap[chat.chat_id];
          
          const draftTime = draft?.updated_at
            ? new Date(draft.updated_at).getTime()
            : 0;
          
          const pendingTime = pending?.created_at
            ? new Date(pending.created_at).getTime()
            : 0;
          
          const backendTime = chat.created_at
            ? new Date(chat.created_at).getTime()
            : 0;
          
          const newest = Math.max(
            draftTime,
            pendingTime,
            backendTime
          );
          
          const showingDraft =
            draft?.text?.trim() &&
            newest === draftTime;
          
          const showingPending =
            pending &&
            newest === pendingTime;
          
          const showingBackend =
            newest === backendTime;
          
          const displayTime =
            showingDraft
              ? draft.updated_at
              : showingPending
              ? pending.created_at
              : chat.created_at;

          return (
            <div
              key={chat.id}
              onPointerDown={(e) => {
                didLongPress.current = false;
                movedDuringTouch.current = false;
              
                touchStartX.current = e.clientX;
                touchStartY.current = e.clientY;
              
                longPressTimer.current = setTimeout(() => {
                  if (!movedDuringTouch.current) {
                    didLongPress.current = true;
                    toggleSelectChat(chat.chat_id);
                  }
                }, 500);
              }}
              
              onPointerMove={(e) => {
                const dx = Math.abs(
                  e.clientX - touchStartX.current
                );
              
                const dy = Math.abs(
                  e.clientY - touchStartY.current
                );
              
                if (dx > 5 || dy > 5) {
                  movedDuringTouch.current = true;
              
                  if (longPressTimer.current) {
                    clearTimeout(longPressTimer.current);
                    longPressTimer.current = null;
                  }
                }
              }}
              
              onPointerUp={() => {
                if (longPressTimer.current) {
                  clearTimeout(longPressTimer.current);
                  longPressTimer.current = null;
                }
              
                if (didLongPress.current) {
                  setTimeout(() => {
                    didLongPress.current = false;
                  }, 100);
              
                  return;
                }
              
                if (selectedChat.size > 0) {
                  toggleSelectChat(chat.chat_id);
                } else {
                  openChatFromRecent(chat);
                }
              }}
              
              onPointerCancel={() => {
                if (longPressTimer.current) {
                  clearTimeout(longPressTimer.current);
                  longPressTimer.current = null;
                }
              }}
              className={`
                flex items-start gap-3 p-3 rounded-lg
                cursor-pointer
                ${
                  selectedChat.has(chat.chat_id)
                    ? "bg-blue-100 dark:bg-blue-900"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800"
                }
              `}
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
            
                  <div className="relative">
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {formatChatTime(displayTime)}
                    </span>
                  
                    {chat.pinned && (
                      <Pin
                        size={12}
                        className="
                          absolute
                          -top-3
                          right-0
                          text-blue-500
                          fill-current
                        "
                      />
                    )}
                  </div>
                </div>
              
                {/* BOTTOM ROW: preview + unseen */}
                <div className="flex items-center justify-between gap-2 mt-1">

                  {showingDraft ? (
                    <p className="text-sm text-gray-500 truncate">
                      <span className="text-yellow-500 mr-1">
                        Draft:
                      </span>
                      {draft.text}
                    </p>
                  ) : showingPending ? (
                    <p className="text-sm text-yellow-500 truncate">
                      {getOfflinePreview(pending)}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500 truncate">
                      {getPreviewText(chat)}
                    </p>
                  )}
                
                  {(chat.unseen ?? 0) > 0 && (
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

      <button
        onClick={async () => {
          try {
            await resetDatabase();
            window.location.reload();
          } catch (err) {
            console.error("Failed to reset database:", err);
          }
        }}
        className="fixed bottom-20 left-1 w-14 h-14 bg-red-600 text-white rounded-full shadow-lg text-sm"
      >
        Reset DB
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
              className="
                w-80
                h-full
                bg-white
                dark:bg-gray-900
                p-4
                flex
                flex-col
              "
              initial={{ x: 300 }}
              animate={{ x: 0 }}
              exit={{ x: 300 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
              }}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Connected Users</h3>
                <button onClick={closeConnectionsPanel}>✕</button>
              </div>

              <div
                ref={connectionsRef}
                onScroll={handleConnectionsScroll}
                className="flex-1 overflow-y-auto space-y-2"
              >
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
                className="mt-4 w-full py-2 px-3 bg-indigo-600 text-white rounded-lg"
              >
                Find More People
              </AppLink>
              <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                <AppLink
                  href="/main/discover"
                  prefetch={false}
                  className="
                    block
                    w-full
                    text-center
                    py-3
                    px-3
                    bg-indigo-600
                    text-white
                    rounded-lg
                  "
                >
                  Find More People
                </AppLink>
              </div>
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