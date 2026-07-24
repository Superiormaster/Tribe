'use client';

import { useState, useContext, useEffect, useRef, useMemo } from 'react';
import { useNavigation } from "@/utils/useNavigation"
import { apiRequest } from '@/utils/api';
import { createPortal } from "react-dom";
import { useChatSocket } from '@/lib/useChatSocket';
import { Pin } from 'lucide-react';
import { connectUser, removeConnection } from '@/lib/api';
import { resetDatabase } from "@/lib/db";
import { UserContext } from "@/components/UserContext";
import { formatChatTime } from '@/utils/inbox/formatChatTime';
import { getPreviewData, getOfflinePreview } from '@/utils/inbox/preview';
import { openChat } from '@/lib/inbox/openChat';
import { markSeen } from '@/lib/inbox/markSeen';
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
import { getLocalChatIds } from "@/utils/inbox/localChats";
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
  
  useEffect(() => {
    if (
      !currentUser?.id ||
      !privateLoaded ||
      !communityLoaded
    ) {
      return;
    }
  
    fetchPrivateRecent(1);
    fetchCommunityRecent(1);
  }, [
    currentUser?.id,
    privateLoaded,
    communityLoaded,
  ]);

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
  } = useCommunityRecentChats();
  
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
  
      // 2. mark as seen immediately
      await markSeen(chat.chat_id);
  
      // 3. update UI instantly (no waiting reload)
      setPrivateRecentChats(prev =>
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
  
  const handleOpenChat = async (userId: number) => {
    try {
      const res = await openChat(userId);
  
      push(`/main/messages/chat/${res.chat_id}`);
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
  
  const communityPress = useLongPressSelection<CommunityChat>({
    onLongPress: chat => {
      toggleSelectChat(chat.chat_id);
    },
  
    onClick: chat => {
      if (selectedChat.size > 0) {
        toggleSelectChat(chat.chat_id);
      } else {
        handleOpenCommunity(chat.community_id);
      }
    },
  });
  
  const {
    onDelivered,
    onSeen,
  } = useInboxSocketEvents({
    userId: currentUser.id,
    setRecentChats: setPrivateRecentChats,
  });
  
  const socketRef = useChatSocket(
    null,
    currentUser,
    {
      onDelivered,
      onSeen,
    }
  );
  
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
  
  const handleOpenCommunity = (communityId:number)=>{
    push(`/main/community/${communityId}/chat`)
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
  
  const selectedItems = [
    ...privateRecentChats,
    ...communityRecentChats,
  ].filter(chat => selectedChat.has(chat.chat_id));
  
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
            privateSelected,
            setPrivatePinnedCount,
            setPrivateRecentChats
        );
    }

    if (communitySelected.length) {
        await pinCommunityChats(
            communitySelected.map(c => c.chat_id),
            communitySelected,
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
  
  const isInboxEmpty =
    !privateRecentChats.length &&
    !localChats.length &&
    !communityRecentChats.length &&
    !localCommunityChats.length;
  
  const inboxLoading =
    !privateLoaded ||
    !communityLoaded ||
    loadingPrivateRecent ||
    loadingCommunityRecent;
  
  if (inboxLoading) {
    return <MessagesSkeleton />;
  }
  
  return (
    <div className="flex flex-col h-full my-20 p-4">

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
            onOpenCommunity={handleOpenCommunity}
          />,
          document.body
        )}

      {/* HEADER */}
      <h2 className="text-xl text-gray-700 dark:text-white font-bold mb-4">Messages</h2>

      {isInboxEmpty ? (
        <EmptyInbox
          openConnectionsPanel={openDiscoverPanel}
        />
      ) : (
        <>
          {localChats.map(chatId => (
            <LocalInboxItem
              key={chatId}
              chatId={chatId}
              draft={drafts[chatId]}
              pending={pendingMap[chatId]}
              chatMeta={chatMeta[chatId]}
              selected={selectedChat.has(chatId)}
              bind={localPress.bind(chatId)}
              currentUserId={currentUser.id}
            />
          ))}
          
          {privateRecentChats.map(chat => (
            <RecentInboxItem
              key={chat.chat_id}
              chat={chat}
              draft={drafts[chat.chat_id]}
              pending={pendingMap[chat.chat_id]}
              selected={selectedChat.has(chat.chat_id)}
              bind={recentPress.bind(chat)}
              currentUserId={currentUser.id}
            />
          ))}
          
          {localCommunityChats.map(chatId => (
            <LocalCommunityItem
              key={chatId}
              chatId={chatId}
              draft={communityDrafts[chatId]}
              pending={communityPendingMap[chatId]}
              chatMeta={communityChatMeta[chatId]}
              selected={selectedChat.has(chatId)}
              bind={localPress.bind(chatId)}
              currentUserId={currentUser.id}
            />
          ))}
          
          {communityRecentChats.map(chat => (
            <CommunityInboxItem
              key={chat.chat_id}
              chat={chat}
              draft={communityDrafts[chat.chat_id]}
              pending={communityPendingMap[chat.chat_id]}
              chatMeta={communityChatMeta[chat.chat_id]}
              selected={selectedChat.has(chat.chat_id)}
              bind={communityPress.bind(chat)}
              currentUserId={currentUser.id}
            />
          ))}
        </>
      )}

      <button
        onClick={openDiscoverPanel}
        className="fixed bottom-28 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg text-2xl"
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
    </div>
  );
}