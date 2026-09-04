'use client';

import { useEffect, useContext, useMemo, useState, useCallback, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import ForwardDrawer from '@/components/chat/ForwardDrawer';
import ChatHeader from '@/components/chat/ChatHeader';
import {
  useGlobalSocketContext,
} from "@/components/GlobalSocketProvider";
import ReportMessage from '@/components/Com-Pri-Chat/ReportMessage';
import MuteModal from '@/components/chat/MuteModal';
import ChatOptionsModal from '@/components/chat/ChatOptionsModal';
import ChatBody from '@/components/chat/ChatBody';
import PreviewViewer from '@/components/chat/ChatPreview';
import ChatSelectionBar from '@/components/chat/ChatSelectionBar';
import DeleteModal from '@/components/chat/DeleteModal';
import { UserContext } from '@/components/UserContext'
import { apiRequest } from '@/utils/api';
import { formatLastSeen } from '@/utils/chat/formatLastSeen';
import { formatMutedUntil } from '@/utils/chat/formatMutedUntil';
import { useSendMessage } from "@/utils/chatPage/useSendMessage";
import { useChatActions } from "@/utils/chatPage/useChatActions";
import { usePreview } from "@/utils/chatPage/usePreview";
import { useDelivered } from "@/utils/chatPage/useDelivered";
import { useDeleteMessages } from "@/utils/chatPage/useDeleteMessages";
import { useChatStatus } from "@/utils/chatPage/useChatStatus";
import { useVoiceGestures } from "@/utils/chatPage/useVoiceGestures";
import { useChatDrafts } from '@/hooks/useChatDrafts';
import { useMessageSelection } from '@/hooks/useMessageSelection';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useForwardMessages } from '@/hooks/useForwardMessages';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { getMessageKey } from '@/utils/chat/messageMerger';
import type { MessageStatus } from "@/utils/chat/messageContract";
import {
  saveMessage, getMessagesByChat, saveMessages, saveChatMeta, updateMessage, deleteChatData
} from "@/lib/messageDB";
import type { ChatUser } from "@/components/chat/chat";
import { useChatSocket } from '@/lib/useChatSocket';
import { useVoiceRecorder } from '@/lib/useVoiceRecorder';
import type {
  MessageBubblesHandle
} from '@/components/MessageBubbles';
import VoiceRecorderUI from '@/components/VoiceRecorder';
import { useNetwork } from '@/components/networkConnection/NetworkContext';
import { useCallManager } from '@/lib/useCallManager';
import { getLivekitToken, startCall } from "@/lib/calls";
import CallUI from '@/components/CallUI';
import ChatInput from '@/components/ChatInput';
import { useNavigation } from "@/utils/useNavigation";
import { Message, ReplyMessage } from "@/utils/chat/messageContract";

type voiceState =
  | "idle"
  | "recording"
  | "locked"
  | "cancelling"
  | "preview";

export default function ChatPage() {
  const { user } = useContext(UserContext)!;
  const { canCommunicate } = useNetwork();
  const { replace, push } = useNavigation();
  const [activeReaction, setActiveReaction] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    console.log("Chat page mounted");
  
    return () => {
      console.log("Chat page unmounted");
    };
  }, []);

  const currentUser = useMemo(() => ({
    id: user?.id ?? null,
    username: user?.username ?? "",
    privateKey: user?.private_key ?? null,
    avatar: user?.avatar ?? null,
  }), [user]);
  
  const searchParams = useSearchParams();
  const { chatId } = useParams<{ chatId: string }>();
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const chatIdNum = chatId ? Number(chatId) : null;
  const [chatUser, setChatUser] = useState<ChatUser | null>(null);

  const [showDrawer, setShowDrawer] = useState(false);
  const [drawerMode, setDrawerMode] = useState<
    "plus" | "emoji" | "gif" | "stickers" | null
  >(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const {
    socketRef,
  } = useGlobalSocketContext();
  const messageBodyRef = useRef<MessageBubblesHandle | null>(null);
  
  const [showChatOptions, setShowChatOptions] = useState(false);
  const [showMuteModal, setShowMuteModal] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [mutedUntil, setMutedUntil] =
    useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [replyingTo, setReplyingTo] = useState<ReplyMessage | null>(null);
  if (chatIdNum === null) {
    return null; 
  }
  
  const {
    previewIndex,
    setPreviewIndex,
    previewState,
    setPreviewState,
    isPreviewOpen,
  } = usePreview();
  
  useEffect(() => {
    if (!chatIdNum) return;
  
    const loadChat = async () => {
      try {
        const chatRes = await apiRequest(
          `api/chats/${chatIdNum}/detail/`
        );
  
        const other = chatRes.other_user;
  
        if (!other) {
          replace("/main/messages");
          return;
        }
  
        const presence = await apiRequest(
          `api/users/presence/${other.id}/`
        );
  
        setChatUser({
          ...other,
          status: presence.status,
          last_seen: presence.last_seen,
          is_message_blocked: chatRes.is_message_blocked,
          blocked_me: chatRes.blocked_me,
        });
  
        await saveChatMeta(
          chatIdNum,
          other.id,
          other.username,
          other.avatar
        );
  
        setIsMuted(chatRes.is_muted);
        setMutedUntil(chatRes.muted_until);
        setLastMessageStatus(chatRes.last_message?.status);
      } catch (err) {
        console.error(err);
        replace("/main/messages");
      }
    };
  
    loadChat();
  }, [chatIdNum, currentUser.id]);
  
  const messagingBlocked =
    chatUser?.is_message_blocked ||
    chatUser?.blocked_me;
  
  const getSenderId = (m: any) => m.sender;
  
  const isBackendMessage = (message: any) => {
    if (!message) return false;
  
    // Explicit local/pending states
    if (
      message.pending === true ||
      message.is_pending === true ||
      message.local === true ||
      message.is_local === true
    ) {
      return false;
    }
  
    if (
      message.status === "pending" ||
      message.status === "sending" ||
      message.status === "failed" ||
      message.status === "queued"
    ) {
      return false;
    }
  
    return (
      typeof message.id === "number" &&
      message.id > 0
    );
  };
  
  const handleReportChat = async (
    reason: string,
    details: string
  ) => {
    if (!chatIdNum) return;
  
    try {
      const response = await apiRequest(
        `api/chats/${chatIdNum}/report/`,
        {
          method: "POST",
          data: {
            reason,
            details,
          },
        }
      );
  
      console.log(
        "[Report] Chat reported successfully:",
        response
      );
  
      setShowReportModal(false);
  
      alert("Reported successfully");
    } catch (error: any) {
      console.error(
        "[Report] Failed to report chat:",
        error
      );
  
      alert(
        error?.message ||
        "Failed to report chat"
      );
    }
  };
  
  const {
    callState,
    connectRoom,
    disconnect,
    setCallState,
  } = useCallManager();
  
  const {
    input,
    setInput,
    drafts,
    clearDraft,
    saveDraftLocal,
  } = useChatDrafts(chatIdNum);
  
  const {
      lastMessageStatus,
      updateConversationStatus,
      setLastMessageStatus,
  } = useChatStatus({
      chatId: chatIdNum,
      currentUser: currentUser.id,
  });
  
  const {
    socketReady,
  } = useChatSocket({
    chatId: chatIdNum,
    currentUser,
    socketRef,
    setIsTyping,
    setChatUser,
  });

  const {
    messages,
    setMessages,
    sendMessage,
    resendPendingMessage,
    retryFailedMessage,
    reactToMessage,
    loadMore,
    loadNewer,
    hasMore,
    hasNewer,
    initializing,
    loadMessageWindow,
  } = useChatMessages({
    chatId: chatIdNum,
    currentUser,
    chatUser,
    input,
    setInput,
    socketRef,
    socketReady,
    replyingTo,
    setReplyingTo,
    clearDraft,
    updateConversationStatus,
  });
  
  const {
    handleSeen,
    handleDelivered,
  } = useDelivered({
    chatId: chatIdNum,
    currentUser: currentUser.id,
    setMessages,
  });
  
  useEffect(() => {
    if (!socketReady || !socketRef.current) {
      return;
    }
  
    const socket = socketRef.current;
  
    socket.on("seen", handleSeen);
    socket.on("delivered", handleDelivered);
  
    return () => {
      socket.off("seen", handleSeen);
      socket.off("delivered", handleDelivered);
    };
  }, [
    socketReady,
    handleSeen,
    handleDelivered,
  ]);
  
  const {
    handleTyping,
    stopTyping,
  } = useTypingIndicator({
    chatId: chatIdNum,
    socketRef,
    setInput,
    saveDraft: saveDraftLocal,
  });
  
  useEffect(() => {
    if (!socketRef.current) return;
  
    socketRef.current.setHandlers?.({
      setMessages,
      setIsTyping,
    });
  }, [socketRef, setMessages]);
  
  const jumpToMessage = async (messageId: number) => {
    await messageBodyRef.current?.jumpToMessage(
      messageId
    );
  };
  
  const {
    isRecording,
    duration,
    startRecording,
    stopRecording,
    resendMessage: resendVoiceMessage,
    cancelRecording,
    waveform,
    previewBlob,
    sendRecording,
    isPaused,
    togglePause,
  } = useVoiceRecorder(
    socketRef,
    chatIdNum,
    currentUser,
    setMessages,
    replyingTo,
    setReplyingTo,
    "private"
  );
  
  const handleViewProfile = () => {
    if (!chatUser?.username) return;
  
    setShowChatOptions(false);
  
    push(
      `/main/profile/${encodeURIComponent(chatUser.username)}`
    );
  };
  
  const {
    selectedMessages,
    toggleSelectMessage,
    clearSelection,
  } = useMessageSelection();
  const selectionMode = selectedMessages.size > 1;
  const hasSelection = selectedMessages.size > 1;
  
  const {
  forwardMode,
  forwardMessages,
  forwardCaption,
  setForwardCaption,
  handleScroll,

  destinations,
  selectedDestinations,
  setSelectedDestinations,

  openForward,
  closeForward,
  sendForward,
  } = useForwardMessages({
    socketRef,
    chatUser,
    currentUser,
    setMessages,
    clearSelection,
  });
  
  const closeReactionPicker = () => {
    setActiveReaction(null);
    clearSelection();
  };
  
  const closeReactionPickerOnly = () => {
    setActiveReaction(null);
  };

  const {
    files,
    caption,
    setCaption,
    resendMedia,
    handleFileSelect,
    handleSendMedia,
    handleSendExternalMedia,
  } = useMediaUpload({
    chatId: chatIdNum,
    currentUser,
    socketRef,
    setMessages,
    replyingTo,
    setReplyingTo,
    chatType: "private",
  });
  
  const {
    handleSendMessage,
  } = useSendMessage({
    chatIdNum,
    input,
    files,
    caption,
    replyingTo,
  
    sendMessage,
    handleSendMedia,
    handleSendExternalMedia,
  
    setSelectedFiles,
    setReplyingTo,
  });

  const handleStartCall = async () => {
    const roomId = String(chatIdNum);

    const call = await startCall(roomId, "audio");
    const { token, url } = await getLivekitToken(roomId);
  
    await connectRoom(url, token);
  };
  
  const {
    getSelectedMessages,
    canDeleteForEveryone,
    handleDeleteForMe,
    handleDeleteForEveryone,
  } = useDeleteMessages({
    chatId: chatIdNum,
    chatType: "private",
    socketRef,
    messages,
    setMessages,
    selectedMessages,
    currentUser,
    clearSelection,
    closeDeleteModal: () =>
      setShowDeleteModal(false),
    replace,
  });
  
  const {
    handleBlock,
    handleMute,
    handleUnmute,
  } = useChatActions({
    chatIdNum,
    chatUser,
    setChatUser,
    setIsMuted,
    setMutedUntil,
    setShowMuteModal,
    setShowChatOptions,
  });
  
  useEffect(() => {
    if (!socketRef.current) return;
  
    socketRef.current.onUserStatus = ({
      userId,
      status,
      last_seen,
    }: {
      userId: number;
      status: string;
      last_seen: string | null;
    }) => {
      if (userId !== chatUser?.id) return;
    
      setChatUser(prev =>
        prev
          ? {
              ...prev,
              status,
              last_seen: last_seen ?? undefined,
            }
          : prev
      );
    };
  
    return () => {
      if (socketRef.current) {
        socketRef.current.onUserStatus = null;
      }
    };
  }, [chatUser?.id]);
  
  const selectedCommunityMessages =
    getSelectedMessages();
  
  const selectedMessage =
    selectedCommunityMessages.length === 1
      ? selectedCommunityMessages[0]
      : null;
  
  const selectedAreBackendMessages =
    selectedCommunityMessages.length > 0 &&
    selectedCommunityMessages.every(
      isBackendMessage
    );
  
  const canReplyToSelection =
    selectedCommunityMessages.length === 1 &&
    isBackendMessage(selectedMessage);
  
  const canForwardSelection =
    selectedCommunityMessages.length > 0 &&
    selectedAreBackendMessages;
  
  const selectedMessageIsPinned =
    selectedCommunityMessages.length === 1 &&
    Boolean(selectedMessage?.is_pinned);
  
  const voice = useVoiceGestures({
    startRecording,
    stopRecording,
    cancelRecording,
    sendRecording,
    isRecording,
  });

  // =========================
  // UI
  // =========================
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-300 dark:bg-[#0b141a]">
      {voice.voiceState === "locked" && (
        <VoiceRecorderUI
          voiceState={voice.voiceState}
          waveform={waveform}
          duration={duration}
          drag={voice.drag}
          isLocked={voice.isLocked}
          previewBlob={previewBlob}
          onCancel={voice.handleCancelVoice}
          onSend={voice.handleSend}
          isPaused={isPaused}
          onPauseToggle={togglePause}
        />
      )}

      <CallUI
        callState={callState}
        onAccept={() => {}}
        onReject={disconnect}
      />

      <ChatHeader
        chatUser={chatUser}
        isTyping={isTyping}
        formatLastSeen={formatLastSeen}
        onAudioCall={async () => {
          const { token, url } =
            await getLivekitToken(String(chatIdNum));
          await connectRoom(url, token);
        }}
        onVideoCall={async () => {
          const { token, url } =
            await getLivekitToken(String(chatIdNum));
          await connectRoom(url, token);
        }}
        isMuted={isMuted}
        mutedUntil={mutedUntil}
        formatMutedUntil={
          formatMutedUntil
        }
        onMore={() =>
          setShowChatOptions(true)
        }
      />

      <ChatBody
        chatId={chatIdNum}
        messages={messages}
        closeReactionPicker={closeReactionPicker}
        currentUser={currentUser}
      
        showDrawer={showDrawer}
        setShowDrawer={setShowDrawer}
        setDrawerMode={setDrawerMode}
      
        page={page}
        hasMore={hasMore}
        hasNewer={hasNewer}
        loadMore={() => {
          if (!hasMore) return;
        
          setPage((p) => p + 1);
          loadMore();
        }}
        loadNewer={() => {
          if (!hasNewer) return;
        
          setPage((p) => p + 1);
          loadNewer();
        }}
      
        selectedMessages={selectedMessages}
      
        previewState={previewState}
        setPreviewState={setPreviewState}
        loadMessageWindow={loadMessageWindow}
        initializing={initializing}
      
        resendPendingMessage={resendPendingMessage}
        retryFailedMessage={retryFailedMessage}
        resendMedia={resendMedia}
        onForward={openForward}
      
        toggleSelectMessage={toggleSelectMessage}
        clearSelection={clearSelection}
      
        replyingTo={replyingTo}
        setReplyingTo={setReplyingTo}
  
        onReaction={reactToMessage}
      />

      {messagingBlocked ? (
        <div className="
          p-4
          text-center
          text-sm
          text-gray-500
          bg-gray-200
          dark:bg-[#111b21]
        ">
          Messaging is unavailable.
        </div>
      ) : (
          <ChatInput
            value={input}
            onChange={handleTyping}
            chatId={chatIdNum}
            saveDraftLocal={saveDraftLocal}
            onSend={handleSendMessage}
            onFileSelect={(file) => {
              setSelectedFiles(prev => [...prev, file]);
              handleFileSelect(file);
            }}
            files={files}
            selectedFiles={selectedFiles}
            setSelectedFiles={setSelectedFiles}
            previewIndex={previewIndex}
            setPreviewIndex={setPreviewIndex}
            showDrawer={showDrawer}
            setShowDrawer={setShowDrawer}
            drawerMode={drawerMode}
            setDrawerMode={setDrawerMode}
            disabled={false}
            replyingTo={replyingTo}
            onCancelReply={() =>
              setReplyingTo(null)
            }
  
            isRecording={isRecording}
            micPressed={voice.micPressed}
            duration={duration}
            isLocked={voice.isLocked}
            voiceState={voice.voiceState}
            onMicStart={voice.handleStart}
            onMicMove={voice.handleMove}
            onMicEnd={voice.handleEnd}
            drag={voice.drag}
          />
      )}
    
      <ChatOptionsModal
        open={showChatOptions}
        onClose={() =>
          setShowChatOptions(false)
        }
        blocked={
          !!chatUser?.is_message_blocked
        }
        onProfile={handleViewProfile}
        muted={isMuted}
        onBlock={handleBlock}
        onReport={() => {
          setShowChatOptions(false);
          setShowReportModal(true);
        }}
        onMute={() => {
          if (isMuted) {
            handleUnmute();
          } else {
            setShowMuteModal(true);
          }
        }}
      />
    
      <MuteModal
        open={showMuteModal}
        onClose={() =>
          setShowMuteModal(false)
        }
        onSelect={handleMute}
      />
    
      <ChatSelectionBar
        selectedCount={selectedMessages.size}
        hasMultiple={selectedMessages.size > 1}
        onClose={() => {
          closeReactionPicker();
          clearSelection();
        }}
        canReply={canReplyToSelection}
        canForward={canForwardSelection}
        onReply={() => {
          closeReactionPicker();
          setReplyingTo(getSelectedMessages()[0]);
        }}
        onForward={() => {
          closeReactionPicker();
          openForward(getSelectedMessages());
        }}
        onDelete={() => {
          messageBodyRef.current?.closeReactionPicker();
          setShowDeleteModal(true);
        }}
      />
  
      <ForwardDrawer
        open={forwardMode}
        destinations={destinations}
        selectedDestinations={selectedDestinations}
        setSelectedDestinations={setSelectedDestinations}
    
        selectedMessages={forwardMessages}
    
        forwardCaption={forwardCaption}
        setForwardCaption={setForwardCaption}
        currentDestination={
          chatUser
              ? {
                    id: chatUser.id,
                    name: chatUser.username,
                    avatar: chatUser.avatar,
                    type: "private",
                    chatId: chatIdNum,
                }
              : undefined
        }
        handleScroll={handleScroll}
    
        getMessageKey={(msg) =>
          getMessageKey(msg) ??
          `message-${msg?.id ?? msg?.client_id ?? "unknown"}`
        }
    
        onClose={closeForward}
        onSend={sendForward}
      />

      <DeleteModal
        open={showDeleteModal}
        canDeleteForEveryone={
          canDeleteForEveryone
        }
        onClose={() =>
          setShowDeleteModal(false)
        }
        onDeleteForMe={handleDeleteForMe}
        onDeleteForEveryone={
          handleDeleteForEveryone
        }
      />

      <ReportMessage
        open={showReportModal}
        username={chatUser?.username}
        onClose={() => {
          setShowReportModal(false);
        }}
        onSubmit={handleReportChat}
      />

      {previewState && (
        <PreviewViewer
          files={previewState.files}
          index={previewState.index}
          setIndex={(value) => {
            setPreviewState(prev => {
              if (!prev) return null;
          
              const nextIndex =
                typeof value === "function"
                  ? value(prev.index)
                  : value;
          
              return {
                ...prev,
                index: nextIndex,
              };
            });
          }}
          msg={previewState.msg}
          isMine={previewState.isMine}
          onClose={() => setPreviewState(null)}
          onReply={previewState.onReply}
        />
      )}
    </div>
  );
}