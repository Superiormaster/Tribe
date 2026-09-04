'use client';

import { useState, useCallback, useContext, useEffect, useRef, useMemo } from 'react';
import { useNavigation } from "@/utils/useNavigation"
import { apiRequest } from '@/utils/api';
import { getDisplayData } from "@/utils/inbox/display";
import { createPortal } from "react-dom";
import { useIsInstalled } from "@/hooks/useIsInstalled";
import { useChatSocket } from '@/lib/useChatSocket';
import { Pin } from 'lucide-react';
import { connectUser, removeConnection } from '@/lib/api';
import { resetDatabase } from "@/lib/db";
import { UserContext } from "@/components/UserContext";
import { formatChatTime } from '@/utils/inbox/formatChatTime';
import { getPreviewData, getOfflinePreview } from '@/utils/inbox/preview';
import { openChat, openCommunityChat } from '@/lib/inbox/openChat';
import { markSeen } from '@/lib/inbox/markSeen';
import {
  markCommunitySeen,
} from "@/lib/communityInbox/markSeenCommunities";
import { pinChats } from '@/lib/inbox/pinChats';
import { pinCommunityChats } from '@/lib/communityInbox/pinCommunities';
import { archiveChats } from "@/lib/inbox/archiveChats";
import { deleteInboxChats } from '@/lib/inbox/delete';
import { deleteCommunityInboxChats } from '@/lib/communityInbox/deleteCommunities';
import { archiveCommunityChats } from '@/lib/communityInbox/archiveCommunities';
import MessagesSkeleton from '@/components/chat/MessagesSkeleton';
import InboxChatBubble from "@/components/inbox/InboxChatBubble";
import LocalInboxItem from "@/components/inbox/LocalInboxItem";
import RecentInboxItem from "@/components/inbox/RecentInboxItem";
import LocalCommunityItem from "@/components/inbox/LocalCommunityItem";
import CommunityInboxItem from "@/components/inbox/CommunityInboxItem";
import { getLocalChatIds, type InboxItem } from "@/utils/inbox/localChats";
import { useLongPressSelection } from "@/hooks/inbox/useLongPressSelection";
import { useConnectedUsers, type ConnectedUser } from "@/hooks/inbox/useConnectedUsers";
import { useRecentChats, type Chat } from "@/hooks/inbox/useRecentChats";
import { usePendingMessages } from "@/hooks/inbox/usePendingMessages";
import { useInboxSocketEvents } from "@/hooks/inbox/useInboxSocketEvents";
import { useCommunityRecentChats, type CommunityChat } from "@/hooks/communityInbox/useRecentCommunities";
import { useJoinedCommunities } from "@/hooks/communityInbox/useJoinedCommunities";
import { useCommunityPendingMessages } from "@/hooks/communityInbox/useCommunityPendingMessages";
import EmptyInbox from '@/components/inbox/EmptyInbox';
import ConnectionsPanel from '@/components/inbox/ConnectionsPanel';
import InboxDeleteModal from '@/components/inbox/InboxDeleteModal';
import InboxSelectionBar from '@/components/inbox/InboxSelectionBar';
import { useChatSelection } from '@/utils/inbox/useChatSelection';

export default function MessagesClient() {
  const { user: currentUser } = useContext(UserContext)!;
  const { push, replace } = useNavigation();
  const installed = useIsInstalled();
  const [
    showChatDeleteModal,
    setShowChatDeleteModal,
  ] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ConnectedUser | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    joinedCommunities,
    showJoinedCommunities,
    communityPage,
    setCommunityPage,
    hasMoreCommunities,
    setHasMoreCommunities,
    loadingCommunities,
    communitiesRef,
    setJoinedCommunities,
    setShowJoinedCommunities,
    fetchJoinedCommunities,
    handleCommunitiesScroll,
    openJoinedCommunities,
    closeJoinedCommunities,
  } = useJoinedCommunities();
  
  const {
    connectedUsers,
    showConnections,
    connectedPage,
    setConnectedPage,
    hasMoreConnections,
    setHasMoreConnections,
    loadingConnections,
    connectionsRef,
    setConnectedUsers,
    setShowConnections,
    fetchConnectedUsers,
    handleConnectionsScroll,
    openConnectionsPanel,
    closeConnectionsPanel,
  } = useConnectedUsers();

  const {
    drafts,
    pendingMap,
    chatMeta,
    loaded: privateLoaded,
    setDrafts,
    setPendingMap,
  } = usePendingMessages(currentUser?.id);
  
  const {
    drafts: communityDrafts,
    pendingMap: communityPendingMap,
    chatMeta: communityChatMeta,
    loaded: communityLoaded,
    setDrafts: setCommunityDrafts,
    setPendingMap: setCommunityPendingMap,
    setChatMeta,
    reloadPendingData: loadCommunityPendingData,
  } = useCommunityPendingMessages(currentUser?.id);

  const {
    recentChats: privateRecentChats,
    setRecentChats: setPrivateRecentChats,
    fetchRecent: fetchPrivateRecent,
    loadingRecent: loadingPrivateRecent,
    recentLoaded: privateRecentLoaded,
    nextPage: privateNextPage,
    pinnedCount: privatePinnedCount,
    setPinnedCount: setPrivatePinnedCount,
    backendChatIds: privateBackendChatIds,
    initialFetchDone: privateInitialFetchDone,
  } = useRecentChats({
    pendingMap,
  });
  
  const {
    recentChats: communityRecentChats,
    setRecentChats: setCommunityRecentChats,
    fetchRecent: fetchCommunityRecent,
    loadingRecent: loadingCommunityRecent,
    recentLoaded: communityRecentLoaded,
    nextPage: communityNextPage,
    pinnedCount: communityPinnedCount,
    setPinnedCount: setCommunityPinnedCount,
    backendChatIds: communityBackendChatIds,
    initialFetchDone:communityInitialFetchDone,
  } = useCommunityRecentChats();
  
  useEffect(() => {
    if (
      !currentUser?.id ||
      !privateLoaded ||
      !communityLoaded
    ) return;
  
    if (!privateInitialFetchDone) {
      fetchPrivateRecent(1);
    }
  
    if (!communityInitialFetchDone) {
      fetchCommunityRecent(1);
    }
  }, [
    currentUser?.id,
    privateLoaded,
    communityLoaded,
    privateInitialFetchDone,
    communityInitialFetchDone,
  ]);
  
  const handlePrivateInboxMessage = useCallback(
    (message: any) => {
      if (message.inbox_type !== "private") {
        return;
      }
  
      const chatId = Number(
        message.chat ?? message.chat_id
      );
  
      if (!chatId) {
        return;
      }
  
      setPrivateRecentChats(prev => {
        const existing = prev.find(
          chat => Number(chat.chat_id) === chatId
        );
  
        if (!existing) {
          return prev;
        }
  
        return prev.map(chat => {
          if (Number(chat.chat_id) !== chatId) {
            return chat;
          }
  
          return {
            ...chat,
            text: message.text ?? chat.text,
            encrypted_text:
              message.encrypted_text ??
              chat.encrypted_text,
            created_at:
              message.created_at ??
              chat.created_at,
            last_sender_id:
              Number(message.sender) ||
              chat.last_sender_id,
            last_media_type:
              message.media_type ??
              chat.last_media_type,
            status: "sent",
          };
        });
      });
    },
    [setPrivateRecentChats]
  );
  
  const handleCommunityInboxMessage = useCallback(
    (message: any) => {
      if (message.inbox_type !== "community") {
        return;
      }
  
      const communityId = Number(
        message.community_id ??
        message.communityId
      );
  
      if (!communityId) {
        return;
      }
  
      setCommunityRecentChats(prev => {
        const existing = prev.find(
          chat =>
            Number(chat.community_id) === communityId
        );
  
        if (!existing) {
          return prev;
        }
  
        return prev.map(chat => {
          if (
            Number(chat.community_id) !==
            communityId
          ) {
            return chat;
          }
  
          return {
            ...chat,
            text:
              message.text ??
              chat.text,
            created_at:
              message.created_at ??
              chat.created_at,
            last_sender_id:
              Number(message.sender) ||
              chat.last_sender_id,
            media_type:
              message.media_type ??
              chat.media_type,
          };
        });
      });
    },
    [setCommunityRecentChats]
  );
  
  const openDiscoverPanel = async () => {
    setConnectedUsers([]);
    setConnectedPage(1);
    setHasMoreConnections(true);
  
    setJoinedCommunities([]);
    setCommunityPage(1);
    setHasMoreCommunities(true);
  
    await Promise.all([
      fetchConnectedUsers(1),
      fetchJoinedCommunities(1),
    ]);
  
    setShowConnections(true);
  };
  
  const openChatFromRecent = async (chat: any) => {
    try {
      // 1. open chat first
      push(`/main/messages/chat/${chat.chat_id}`);
  
      await markSeen(chat.chat_id);
  
      setPrivateRecentChats(prev =>
        prev.map(c =>
          c.chat_id === chat.chat_id
            ? { ...c, unseen: 0 }
            : c
        )
      );
  
      window.dispatchEvent(
        new Event("chat-unread-update")
      );
  
    } catch (err) {
      console.error(err);
    }
  };
  
  const handleOpenChat = async (userId: number) => {
    try {
      const res = await openChat(userId);
  
      push(`/main/messages/chat/${res.chat.id}`);
    } catch (err) {
      console.error("Failed to open chat", err);
    }
  };
  
  const localPress = useLongPressSelection<number>({
    onLongPress: chatId => {
      toggleSelectChat(chatId);
    },
  
    onClick: chatId => {
      if (selectedChat.size > 0) {
        toggleSelectChat(chatId);
      } else {
        push(`/main/messages/chat/${chatId}`);
      }
    },
  });
  
  const recentPress = useLongPressSelection<Chat>({
    onLongPress: chat => {
      toggleSelectChat(chat.chat_id);
    },
  
    onClick: chat => {
      if (selectedChat.size > 0) {
        toggleSelectChat(chat.chat_id);
      } else {
        openChatFromRecent(chat);
      }
    },
  });
  
  const localCommunityPress = useLongPressSelection<number>({
    onLongPress: communityId => {
      toggleSelectChat(communityId);
    },
  
    onClick: communityId => {
      if (selectedChat.size > 0) {
        toggleSelectChat(communityId);
      } else {
        OpenCommunity(communityId);
      }
    },
  });

  const communityPress =
  useLongPressSelection<CommunityChat>({
    onLongPress: chat => {
      toggleSelectChat(
        chat.community_id
      );
    },

    onClick: chat => {
      if (selectedChat.size > 0) {
        toggleSelectChat(
          chat.community_id
        );
      } else {
        handleOpenCommunity(
          chat.community_id
        );
      }
    },
  });
  
  useInboxSocketEvents({
    userId: currentUser.id,
    setRecentChats: setPrivateRecentChats,
    setCommunityChats: setCommunityRecentChats,
  });
  
  useEffect(() => {
    const onScroll = () => {
      if (
        window.innerHeight + window.scrollY >=
        document.body.offsetHeight - 200 &&
        privateNextPage &&
        !loadingPrivateRecent
      ) {
        fetchPrivateRecent(privateNextPage);
      }
  
      if (
        window.innerHeight + window.scrollY >=
        document.body.offsetHeight - 200 &&
        communityNextPage &&
        !loadingCommunityRecent
      ) {
        fetchCommunityRecent(communityNextPage);
      }
    };
  
    window.addEventListener("scroll", onScroll);
  
    return () =>
      window.removeEventListener("scroll", onScroll);
  }, [
    privateNextPage,
    communityNextPage,
    loadingPrivateRecent,
    loadingCommunityRecent,
  ]);
  
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
  
  const handleOpenCommunity = async (
    communityId: number
  ) => {
    try {
      await openCommunityChat(
        communityId
      );
  
      await markCommunitySeen(
        communityId
      );
  
      push(
        `/main/community/${communityId}/chat`
      );
  
      window.dispatchEvent(
        new Event("chat-unread-update")
      );
  
    } catch (err) {
      console.error(
        "Failed to open chat",
        err
      );
    }
  };
  
  const OpenCommunity = async (
    communityId: number
  ) => {
    try {
      await openCommunityChat(
        communityId
      );
  
      push(
        `/main/community/${communityId}/chat`
      );
  
      window.dispatchEvent(
        new Event("chat-unread-update")
      );
  
    } catch (err) {
      console.error(
        "Failed to open chat",
        err
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
  
  const selectedPrivateItems =
    privateRecentChats.filter(chat =>
      selectedChat.has(chat.chat_id)
    );
  
  const selectedCommunityItems =
    communityRecentChats.filter(chat =>
      selectedChat.has(chat.community_id)
    );
  
  const selectedItems = [
    ...selectedPrivateItems,
    ...selectedCommunityItems,
  ];
  
  const localChats = useMemo(
    () =>
      getLocalChatIds(
        drafts,
        pendingMap,
        privateBackendChatIds,
        privateRecentLoaded
      ),
    [
      drafts,
      pendingMap,
      privateBackendChatIds,
      privateRecentLoaded,
    ]
  );
  
  const localCommunityChats = useMemo(
    () =>
      getLocalChatIds(
        communityDrafts,
        communityPendingMap,
        communityBackendChatIds,
        communityRecentLoaded
      ),
    [
      communityDrafts,
      communityPendingMap,
      communityBackendChatIds,
      communityRecentLoaded,
    ]
  );
  
  const privateSelected = selectedItems.filter(
    c => c.chat_type === "private"
  );
  
  const communitySelected = selectedItems.filter(
    c => c.chat_type === "community"
  );
  
  const privateUnpinned = privateSelected.filter(
    c => !c.pinned
  ).length;
  
  const communityUnpinned = communitySelected.filter(
    c => !c.pinned
  ).length;
  
  const privateAllPinned =
    privateSelected.length > 0 &&
    privateSelected.every(c => c.pinned);
  
  const communityAllPinned =
    communitySelected.length > 0 &&
    communitySelected.every(c => c.pinned);
  
  const allPinned =
    selectedItems.length > 0 &&
    selectedItems.every(c => c.pinned);
  
  const canPinSelection =
    (
      privateSelected.length === 0 ||
      privatePinnedCount + privateUnpinned <= 3
    ) &&
    (
      communitySelected.length === 0 ||
      communityPinnedCount + communityUnpinned <= 2
    );

  const handlePinChat = async () => {
    if (privateSelected.length) {
        await pinChats(
            privateSelected.map(c => c.chat_id),
            setPrivatePinnedCount,
            setPrivateRecentChats
        );
    }

    if (communitySelected.length) {
        await pinCommunityChats(
            communitySelected.map(c => c.chat_id),
            setCommunityPinnedCount,
            setCommunityRecentChats
        );
    }

    clearChatSelection();
  };
  
  const handleArchiveChat = async () => {
    try {
      if (privateSelected.length) {
        await archiveChats(
          privateSelected.map(c => c.chat_id)
        );
      }
  
      if (communitySelected.length) {
        await archiveCommunityChats(
          communitySelected.map(c => c.chat_id)
        );
      }
  
      clearChatSelection();
  
      fetchPrivateRecent(1);
      fetchCommunityRecent(1);
  
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSelectedChats = async () => {
    try {
      if (privateSelected.length) {
        await deleteInboxChats(
          privateSelected.map(c => c.chat_id),
          currentUser.id
        );
  
        setPrivateRecentChats(prev =>
          prev.filter(
            c => !privateSelected.some(
              p => p.chat_id === c.chat_id
            )
          )
        );
      }
  
      if (communitySelected.length) {
        await deleteCommunityInboxChats(
          communitySelected.map(c => c.chat_id),
          currentUser.id
        );
  
        setCommunityRecentChats(prev =>
          prev.filter(
            c => !communitySelected.some(
              p => p.chat_id === c.chat_id
            )
          )
        );
      }
  
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
  
  const mergedCommunityItems = useMemo(() => {
    const items = new Map<
      string,
      {
        type: "community";
        chat: any;
        localCommunityId?: number;
      }
    >();
  
    for (const communityId of localCommunityChats) {
      const pending = communityPendingMap[communityId];
      const draft = communityDrafts[communityId];
      const meta = communityChatMeta[communityId];
  
      items.set(`community-${communityId}`, {
        type: "community",
  
        chat: {
          chat_id: pending?.chatId ?? 0,
  
          community_id: communityId,
  
          chat_type: "community",
  
          community_name:
            meta?.communityName ||
            "Unknown Community",
  
          cover_image_url:
            meta?.cover_image_url ||
            null,
  
          unseen: 0,
          pinned: false,
  
          created_at:
            pending?.created_at ||
            draft?.updated_at,
        },
  
        localCommunityId: communityId,
      });
    }
  
    for (const chat of communityRecentChats) {
      const communityId = chat.community_id;
  
      if (!communityId) {
        console.warn(
          "Community chat missing community_id:",
          chat
        );
        continue;
      }
  
      items.set(`community-${communityId}`, {
        type: "community",
  
        chat: {
          ...chat,
          chat_type: "community",
          community_id: communityId,
        },
  
        localCommunityId: communityId,
      });
    }
  
    return Array.from(items.values());
  }, [
    localCommunityChats,
    communityPendingMap,
    communityDrafts,
    communityChatMeta,
    communityRecentChats,
  ]);
  
  const inboxItems = useMemo(() => {
    const privateItems = [
      ...localChats.map(chatId => ({
        type: "local-private" as const,
        chatId,
        time: getDisplayData(
          undefined,
          drafts[chatId],
          pendingMap[chatId]
        ).displayTime,
      })),
  
      ...privateRecentChats.map(chat => ({
        type: "private" as const,
        chat,
        time: getDisplayData(
          chat,
          drafts[chat.chat_id],
          pendingMap[chat.chat_id]
        ).displayTime,
      })),
    ];
  
    const communityItems =
      mergedCommunityItems.map(item => {
        const communityId =
          item.localCommunityId ??
          item.chat.community_id;
  
        return {
          type: "community" as const,
          chat: item.chat,
          communityId,
  
          time: getDisplayData(
            item.chat,
            communityDrafts[communityId],
            communityPendingMap[communityId]
          ).displayTime,
        };
      });
  
    return [
      ...privateItems,
      ...communityItems,
    ].sort((a, b) => {
      const aChat =
        "chat" in a ? a.chat : undefined;

      const bChat =
        "chat" in b ? b.chat : undefined;

      const aPinned =
        !!aChat?.pinned;

      const bPinned =
        !!bChat?.pinned;

      // Pinned chats always come first
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      // Both pinned → newest pin first
      if (aPinned && bPinned) {
        const aPinnedAt = new Date(
          aChat?.pinned_at ?? 0
        ).getTime();

        const bPinnedAt = new Date(
          bChat?.pinned_at ?? 0
        ).getTime();

        return bPinnedAt - aPinnedAt;
      }

      // Otherwise newest message/draft first
      return (
        new Date(b.time ?? 0).getTime() -
        new Date(a.time ?? 0).getTime()
      );
    });
  }, [
    localChats,
    drafts,
    pendingMap,
    privateRecentChats,
    mergedCommunityItems,
    communityDrafts,
    communityPendingMap,
  ]);
  
  const dbReady =
    privateLoaded &&
    communityLoaded;
  
  const firstLoadFinished =
    privateInitialFetchDone &&
    communityInitialFetchDone;
  
  const hasLocalContent =
    localChats.length > 0 ||
    localCommunityChats.length > 0;
  
  const hasRemoteContent =
    privateRecentChats.length > 0 ||
    communityRecentChats.length > 0;
  
  const hasChats =
    hasLocalContent || hasRemoteContent;
  
  const showSkeleton =
    dbReady &&
    !firstLoadFinished &&
    !hasLocalContent;
  
  const showEmpty =
    dbReady &&
    firstLoadFinished &&
    !hasChats;

  if (!privateLoaded || !communityLoaded) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600" />
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full my-14 p-4">

      <InboxDeleteModal
        open={showChatDeleteModal}
        count={selectedChat.size}
        onClose={() =>
          setShowChatDeleteModal(false)
        }
        onDeleteChat={handleDeleteSelectedChats}
      />
  
      <InboxSelectionBar
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
  
      {mounted &&
        createPortal(
          <ConnectionsPanel
            open={showConnections}
            users={connectedUsers}
            communities={joinedCommunities}
            loadingUsers={loadingConnections}
            loadingCommunities={loadingCommunities}
            connectionsRef={connectionsRef}
            communitiesRef={communitiesRef}
            onConnectionsScroll={handleConnectionsScroll}
            onCommunitiesScroll={handleCommunitiesScroll}
            onClose={closeConnectionsPanel}
            onOpenChat={handleOpenChat}
            onOpenCommunity={OpenCommunity}
          />,
          document.body
        )}

      {/* HEADER */}
      {hasChats && (
        <h2 className="text-xl text-gray-700 dark:text-white font-bold mb-4">
          Messages
        </h2>
      )}

      {showSkeleton && (
        <MessagesSkeleton />
      )}

      {!showSkeleton && hasChats && (
        <>
          {inboxItems.map(item => {
            switch (item.type) {
          
              case "local-private":
                return (
                  <LocalInboxItem
                    key={`lp-${item.chatId}`}
                    chatId={item.chatId}
                    draft={drafts[item.chatId]}
                    pending={pendingMap[item.chatId]}
                    chatMeta={chatMeta[item.chatId]}
                    selected={selectedChat.has(item.chatId)}
                    bind={localPress.bind(item.chatId)}
                    currentUserId={currentUser.id}
                  />
                );
          
              case "private":
                return (
                  <RecentInboxItem
                    key={item.chat.chat_id}
                    chat={item.chat}
                    draft={drafts[item.chat.chat_id]}
                    pending={pendingMap[item.chat.chat_id]}
                    selected={selectedChat.has(item.chat.chat_id)}
                    bind={recentPress.bind(item.chat)}
                    currentUserId={currentUser.id}
                  />
                );
          
              case "community": {
                const communityId =
                  item.chat.community_id;
          
                return (
                  <CommunityInboxItem
                    key={`community-${communityId}`}
                    chat={item.chat}
                    draft={
                      communityDrafts[communityId]
                    }
                    pending={
                      communityPendingMap[communityId]
                    }
                    chatMeta={
                      communityChatMeta[communityId]
                    }
                    selected={
                      selectedChat.has(communityId)
                    }
                    bind={
                      communityPress.bind(item.chat)
                    }
                    currentUserId={
                      currentUser.id
                    }
                  />
                );
              }
          
              default:
                return null;
            }
          })}
        </>
      )}

      {showEmpty && (
        <EmptyInbox
          openConnectionsPanel={openDiscoverPanel}
        />
      )}

      <button
        onClick={openDiscoverPanel}
        className={`fixed right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg text-2xl ${
        installed
          ? "bottom-[calc(env(safe-area-inset-bottom)+7rem)]"
          : "bottom-32"
        }`}
      >
        💬
      </button>

      {/*<button
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
      </button>*/}
    </div>
  );
}