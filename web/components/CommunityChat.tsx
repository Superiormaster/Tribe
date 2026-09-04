'use client';
import { useState, useEffect, useContext, useRef } from 'react';
import { UserContext } from './UserContext';
import { apiRequest } from '@/utils/api';
import { useChatStatus } from "@/utils/chatPage/useChatStatus";
import { useMessageSelection } from '@/hooks/useMessageSelection';
import ForwardDrawer from '@/components/chat/ForwardDrawer';
import { useDelivered } from "@/utils/chatPage/useDelivered";
import {
  useGlobalSocketContext,
} from "@/components/GlobalSocketProvider";
import toast from 'react-hot-toast';
import { useCommunitySocket } from '@/lib/useCommunitySocket';
import CommunityChatBody from '@/components/communityChat/CommunityChatBody';
import CommunityOptionsModal from '@/components/communityChat/CommunityOptionsModal';
import ReportCommunity from '@/components/communityChat/ReportCommunity';
import type {
  CommunityMessageBubblesHandle
} from '@/components/communityChat/CommunityMessageBubble';
import CommunityPinnedBar from '@/components/communityChat/CommunityPinnedBar';
import { usePreview } from "@/utils/chatPage/usePreview";
import CommunityChatInput from '@/components/communityChat/CommunityChatInput';
import CommunityChatHeader from '@/components/communityChat/CommunityChatHeader';
import { useCommunityDrafts } from '@/hooks/communityChat/useCommunityDrafts';
import { useCommunityMessages } from '@/hooks/communityChat/useCommunityMessages';
import DeleteModal from '@/components/chat/DeleteModal';
import { useVoiceRecorder } from '@/lib/useVoiceRecorder';
import VoiceRecorderUI from '@/components/VoiceRecorder';
import PreviewViewer from '@/components/chat/ChatPreview';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useForwardMessages } from '@/hooks/useForwardMessages';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { useDeleteMessages } from '@/utils/chatPage/useDeleteMessages';
import { useSendCommunityMessage } from '@/utils/communityChatPage/useSendCommunityMessage';
import { useVoiceGestures } from '@/utils/chatPage/useVoiceGestures';
import { getMessageKey } from '@/utils/chat/messageMerger';
import ChatSelectionBar from '@/components/chat/ChatSelectionBar';
import type { MessageStatus, UserSummary } from "@/utils/chat/messageContract";
import { useNetwork } from '@/components/networkConnection/NetworkContext';
import { useCallManager } from '@/lib/useCallManager';
import { getLivekitToken, startCall } from "@/lib/calls";
import CallUI from '@/components/CallUI';
import { saveCommunityMeta } from "@/lib/communityMessageDB";
import { useNavigation } from "@/utils/useNavigation";
import { Message, ReplyMessage } from "@/utils/chat/messageContract";

type voiceState =
  | "idle"
  | "recording"
  | "locked"
  | "cancelling"
  | "preview";

type Props = {
  communityId: number;
};

export default function CommunityChat({ communityId }: Props) {
  const { user: currentUser } = useContext(UserContext)!;
  const currentUserId = Number(currentUser?.id);
  const { canCommunicate } = useNetwork();
  const { replace, push } = useNavigation();
  const [showReportModal, setShowReportModal] = useState(false);
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [activeReaction, setActiveReaction] = useState<string | null>(null);
  const {
    socketRef,
  } = useGlobalSocketContext();
  const messageBodyRef = useRef<CommunityMessageBubblesHandle | null>(null);
  
  const [showDrawer, setShowDrawer] = useState(false);
  const [drawerMode, setDrawerMode] = useState<
    "plus" | "emoji" | "gif" | "stickers" | null
  >(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  const [showChatOptions, setShowChatOptions] = useState(false);
  const [showMuteModal, setShowMuteModal] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [mutedUntil, setMutedUntil] =
    useState<string | null>(null);
  
  const [page, setPage] = useState(1);
  const [replyingTo, setReplyingTo] = useState<ReplyMessage | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [jumpLoading, setJumpLoading] = useState(false);
  const jumpingToMessageRef = useRef(false);
  const [communityData, setCommunityData] = useState<any>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [chatLocked, setChatLocked] = useState(false);
  const [typingUsers, setTypingUsers] = useState<any[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const isBackendMessage = (
    message: Message | null | undefined
  ): message is Message & { id: number } => {
    if (!message) return false;
  
    // Message must have a real backend ID
    if (
      typeof message.id !== "number" ||
      message.id <= 0
    ) {
      return false;
    }
  
    // Local/pending messages are identified by status
    if (
      message.status === "pending" ||
      message.status === "sending" ||
      message.status === "failed" 
    ) {
      return false;
    }
  
    return true;
  };
  
  useEffect(() => {
    const loadCommunity = async () => {
      try {
        const community = await apiRequest(`api/communities/${communityId}/`);
        console.log("community", community)
        setCommunityData(community);
  
        await saveCommunityMeta(
          community.id,
          community.name,
          community.cover_image_url
        );
  
      } catch (err) {
        console.error(err);
      }
    };
  
    loadCommunity();
  }, [communityId]);
  
  useEffect(() => {
    const loadPinnedMessages = async () => {
      try {
        const data = await apiRequest(
          `api/chats/communities/${communityId}/pinned-messages/`
        );
  
        setPinnedMessages(
          Array.isArray(data.results)
            ? data.results
            : []
        );
      } catch (err) {
        console.error(
          "[PINNED] Failed to load pinned messages:",
          err
        );
      }
    };
  
    loadPinnedMessages();
  }, [communityId]);

  const isOwner =
    Number(currentUser?.id) ===
      Number(communityData?.owner?.id) ||
    communityData?.my_role === "owner";
  
  const isAdmin =
    communityData?.my_role === "admin";
  
  const isModerator =
    communityData?.my_role === "moderator";
  
  const canPinCommunityMessage =
    isOwner ||
    isAdmin ||
    isModerator;

  const canManage =
    isOwner ||
    isAdmin ||
    isModerator;
  
  const {
    previewIndex,
    setPreviewIndex,
    previewState,
    setPreviewState,
    isPreviewOpen,
  } = usePreview();
  
  const {
      lastMessageStatus,
      updateConversationStatus,
      setLastMessageStatus,
  } = useChatStatus({
      chatId: communityId,
      currentUser: currentUser.id,
  });
  
  const {
    input,
    setInput,
    drafts,
    clearDraft,
    saveCommunityDraftLocal,
  } = useCommunityDrafts(communityId);

  const {
    socketReady,
    pinMessage,
  } = useCommunitySocket(
    communityId,
    currentUser,
    socketRef
  );

  const {
      messages,
      setMessages,
      sendMessage,
      reactToMessage,
      deleteMessage,
      loadMore,
      loadNewer,
      resendPendingMessage,
      retryFailedMessage,
      hasMore,
      hasNewer,
      initializing,
      loadMessageWindow,
  } = useCommunityMessages({
      communityId,
      currentUser,
      socketRef,
      socketReady,
      input,
      setInput,
      replyingTo,
      setReplyingTo,
      clearDraft,
      updateConversationStatus,
  });
  
  const {
    handleSeen,
    handleDelivered,
  } = useDelivered({
    chatId: communityId,
    currentUser: currentUser.id,
    setMessages,
  });
  
  useEffect(() => {
    if (!socketReady || !socketRef.current) {
      return;
    }
  
    const socket = socketRef.current;
  
    socket.on("community_seen", handleSeen);
    socket.on("community_delivered", handleDelivered);
  
    return () => {
      socket.off("community_seen", handleSeen);
      socket.off("community_delivered", handleDelivered);
    };
  }, [
    socketReady,
    handleSeen,
    handleDelivered,
  ]);
  
  useEffect(() => {
    if (
      !socketReady ||
      !socketRef.current
    ) {
      return;
    }
  
    socketRef.current.setHandlers?.({
      setMessages,
      setTypingUsers,
      setOnlineCount,
    });
  }, [
    socketReady,
    setMessages,
  ]);
  
  const {
    handleTyping,
    stopTyping,
  } = useTypingIndicator({
    chatId: communityId,
    socketRef,
    setInput,
    saveDraft:
      saveCommunityDraftLocal,
    startEvent:
      "community_typing_start",
    stopEvent:
      "community_typing_stop",
    payloadKey:
      "communityId",
  });
  
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
    communityId,
    currentUser,
    setMessages,
    replyingTo,
    setReplyingTo,
    "community"
  );
  
  const jumpToMessage = async (messageId: number) => {
    await messageBodyRef.current?.jumpToMessage(
      messageId
    );
  };
  
  const handleReportCommunity = async (
    reason: string,
    details: string
  ) => {
    if (!communityId) return;
  
    await apiRequest(
      `api/chats/communities/${communityId}/report/`,
      {
        method: "POST",
        data: {
          reason,
          details,
        },
      }
    );
  
    toast.success("Community reported to Tribe");
  };
  
  const {
    callState,
    connectRoom,
    disconnect,
    setCallState,
  } = useCallManager();
  
  const {
    selectedMessages,
    toggleSelectMessage,
    clearSelection,
  } = useMessageSelection();
  const hasMultiple = selectedMessages.size > 1;
  
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
    currentUser,
    setMessages,
    clearSelection,
  });

  const {
    files,
    caption,
    setCaption,
    resendMedia,
    handleFileSelect,
    handleSendMedia,
    handleSendExternalMedia,
  } = useMediaUpload({
    chatId: communityId,
    currentUser,
    socketRef,
    setMessages,
    replyingTo,
    setReplyingTo,
    chatType: "community",
  });
  
  const {
    getSelectedMessages,
    canDeleteForEveryone,
    handleDeleteForMe,
    handleDeleteForEveryone,
  } = useDeleteMessages({
    communityId,
    chatType: "community",
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
    handleSendMessage,
  } = useSendCommunityMessage({
    communityId,
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
  
  useEffect(() => {
    if (replyingTo) {
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [replyingTo]);
  
  const getCurrentSelectedCommunityMessage = () => {
    const selected = getSelectedMessages();
  
    if (selected.length !== 1) {
      return null;
    }
  
    const selectedId = selected[0]?.id;
  
    return (
      messages.find(
        (message) =>
          Number(message.id) === Number(selectedId)
      ) ?? null
    );
  };
  
  const handlePinCommunityMessage = async () => {
    const message =
      getCurrentSelectedCommunityMessage();
  
    if (!message) return;
  
    if (!canPinCommunityMessage) {
      return;
    }
  
    if (!isBackendMessage(message)) {
      return;
    }
  
    const result =
      await pinMessage(
        message.id,
        true
      );
  
    if (!result?.ok) {
      return;
    }
  
    const data =
      result.data;
  
    const updatedMessage =
      data?.message;
  
    setMessages(prev =>
      prev.map(item =>
        Number(item.id) ===
        Number(message.id)
          ? {
              ...item,
              is_pinned: true,
            }
          : item
      )
    );
  
    if (updatedMessage) {
      setPinnedMessages(prev => {
        const exists =
          prev.some(
            item =>
              Number(item.id) ===
              Number(message.id)
          );
  
        if (exists) {
          return prev.map(item =>
            Number(item.id) ===
            Number(message.id)
              ? {
                  ...item,
                  ...updatedMessage,
                  is_pinned: true,
                }
              : item
          );
        }
  
        return [
          {
            ...updatedMessage,
            is_pinned: true,
          },
          ...prev,
        ];
      });
    }
  
    clearSelection();
  };
  
  const handleUnpinCommunityMessage = async () => {
    const message =
      getCurrentSelectedCommunityMessage();
  
    if (!message) return;
  
    if (!canPinCommunityMessage) {
      return;
    }
  
    if (!isBackendMessage(message)) {
      return;
    }
  
    const result =
      await pinMessage(
        message.id,
        false
      );
  
    if (!result?.ok) {
      return;
    }
  
    setMessages(prev =>
      prev.map(item =>
        Number(item.id) ===
        Number(message.id)
          ? {
              ...item,
              is_pinned: false,
            }
          : item
      )
    );
  
    setPinnedMessages(prev =>
      prev.filter(
        item =>
          Number(item.id) !==
          Number(message.id)
      )
    );
  
    clearSelection();
  };
  
  const handleManageCommunity = () => {
    if (!communityId) return;
  
    setShowChatOptions(false);
  
    push(
      `/main/community/${(communityId)}/settings`
    );
  };
  
  useEffect(() => {
    if (!socketReady || !socketRef.current) {
      return;
    }
  
    const socket = socketRef.current;
  
    const handleCommunityPin = ({
      communityId: eventCommunityId,
      messageId,
      pinned,
      message,
    }: {
      communityId: number;
      messageId: number;
      pinned: boolean;
      message?: Message | null;
    }) => {
    
      if (
        Number(eventCommunityId) !==
        Number(communityId)
      ) {
        return;
      }
    
      setMessages((prev: Message[]) =>
        prev.map((item) =>
          Number(item.id) === Number(messageId)
            ? {
                ...item,
                is_pinned: pinned,
              }
            : item
        )
      );
    
      setPinnedMessages((prev) => {
    
        if (!pinned) {
          return prev.filter(
            (item) =>
              Number(item.id) !==
              Number(messageId)
          );
        }
    
        if (!message) {
          return prev;
        }
    
        // Don't duplicate
        const alreadyExists = prev.some(
          (item) =>
            Number(item.id) ===
            Number(messageId)
        );
    
        if (alreadyExists) {
          return prev.map((item) =>
            Number(item.id) ===
            Number(messageId)
              ? {
                  ...item,
                  ...message,
                  is_pinned: true,
                }
              : item
          );
        }
    
        // Newest pinned message goes first
        return [
          {
            ...message,
            is_pinned: true,
          },
          ...prev,
        ];
      });
    };
  
    socket.on(
      "community_pin",
      handleCommunityPin
    );
  
    return () => {
      socket.off(
        "community_pin",
        handleCommunityPin
      );
    };
  }, [
    socketReady,
    communityId,
    setMessages,
  ]);
  
  useEffect(() => {
    if (!socketReady || !socketRef.current) {
      return;
    }
  
    const socket = socketRef.current;
  
    const handlePinError = ({
      error,
      code,
    }: {
      error: string;
      code?: string | null;
    }) => {
    
      console.error(
        "[PINNED] Community pin error:",
        error
      );
    
      if (code === "PIN_LIMIT_REACHED") {
        // Replace with your toast system
        toast.error(error);
        return;
      }
    
      toast.error(error);
    };
  
    socket.on(
      "community_pin_error",
      handlePinError
    );
  
    return () => {
      socket.off(
        "community_pin_error",
        handlePinError
      );
    };
  }, [socketReady]);
  
  const handleLeave = async () => {
    if (!communityData) return;
  
    const confirmed = window.confirm(
      `Are you sure you want to leave "${communityData.name}"?`
    );
  
    if (!confirmed) return;
  
    try {
      await apiRequest(
        `api/communities/${communityId}/leave/`,
        {
          method: "POST",
        }
      );
  
      push("/main/messages/");
    } catch (err) {
      console.error(
        "[COMMUNITY INFO] Failed to leave community:",
        err
      );
  
      alert(
        "Failed to leave community. Please try again."
      );
    }
  };
  
  const closeReactionPicker = () => {
    setActiveReaction(null);
  };
  
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
    Boolean(
      messages.find(
        m => Number(m.id) === Number(selectedMessage?.id)
      )?.is_pinned
    );
  
  const voice = useVoiceGestures({
    startRecording,
    stopRecording,
    cancelRecording,
    sendRecording,
    isRecording,
  });

  return (
    <div className="flex flex-col h-screen bg-gray-300 dark:bg-gray-900">
  
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

      {/* HEADER */}
      <CommunityChatHeader
        communityData={communityData}
        onlineCount={onlineCount}
        chatLocked={chatLocked}
        isTyping={typingUsers.length > 0}
        typingUsers={typingUsers}
        typingCount={typingUsers.length}
        onAudioCall={() => {}}
        onVideoCall={() => {}}
        onMore={() => setShowChatOptions(true)}
      />
  
      {/* PINNED BAR */}
      <CommunityPinnedBar
        pinnedMessages={pinnedMessages}
        onJumpToMessage={jumpToMessage}
      />
  
      {/* MESSAGES */}
      <div className="flex-1 min-h-0">
        <CommunityChatBody
          ref={messageBodyRef}
          communityId={communityId}
          messages={messages}
          closeReactionPicker={closeReactionPicker}
          currentUser={currentUser}
          currentUserId={currentUserId}
        
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
        
          resendPendingMessage={resendPendingMessage}
          retryFailedMessage={retryFailedMessage}
          resendMedia={resendMedia}
          onForward={openForward}
        
          toggleSelectMessage={toggleSelectMessage}
          clearSelection={clearSelection}
          loadMessageWindow={loadMessageWindow}
          initializing={initializing}
        
          replyingTo={replyingTo}
          setReplyingTo={setReplyingTo}
    
          onReaction={reactToMessage}
        />
        <div ref={chatEndRef} />
      </div>
  
      {/* INPUT */}
          <CommunityChatInput
            value={input}
            onChange={handleTyping}
            communityId={communityId}
            saveDraftLocal={saveCommunityDraftLocal}
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

      <ForwardDrawer
        open={forwardMode}
        destinations={destinations}
        selectedDestinations={selectedDestinations}
        setSelectedDestinations={setSelectedDestinations}
    
        selectedMessages={forwardMessages}
        handleScroll={handleScroll}
    
        forwardCaption={forwardCaption}
        setForwardCaption={setForwardCaption}
        currentDestination={
          communityData
              ? {
                    id: communityData.id,
                    name: communityData.name,
                    avatar:
                        communityData.cover_image_url ??
                        communityData.avatar,
                    type: "community",
                    communityId,
                }
              : undefined
        }
    
        getMessageKey={(msg) =>
          getMessageKey(msg) ??
          `message-${msg?.id ?? msg?.client_id ?? "unknown"}`
        }
        onClose={closeForward}
        onSend={sendForward}
      />
  
      <ReportCommunity
        open={showReportModal}
        communityName={communityData?.name}
        onClose={() => setShowReportModal(false)}
        onSubmit={handleReportCommunity}
      />
  
      <CommunityOptionsModal
        open={showChatOptions}
        onClose={() => setShowChatOptions(false)}
        muted={isMuted}
        isOwner={isOwner}
        canManage={canManage}
        onInfo={() => {
          setShowChatOptions(false);
          push(
            `/main/community/${communityId}/info`
          );
        }}
        onSearch={() => {
          setShowChatOptions(false);
          // open message search
        }}
        onMute={() => {
          setShowChatOptions(false);
          setShowMuteModal(true);
        }}
        onReport={() => {
          setShowChatOptions(false);
          setShowReportModal(true);
        }}
        onLeave={() => {
          setShowChatOptions(false);
          handleLeave();
        }}
        onManage={() => {
          setShowChatOptions(false);
          handleManageCommunity();
        }}
      />
  
      <ChatSelectionBar
        selectedCount={selectedMessages.size}
        hasMultiple={selectedMessages.size > 1}
      
        canReply={canReplyToSelection}
        canForward={canForwardSelection}
      
        canPin={
          canPinCommunityMessage &&
          selectedCommunityMessages.length === 1 &&
          selectedAreBackendMessages
        }
      
        isPinned={selectedMessageIsPinned}
      
        onPin={handlePinCommunityMessage}
      
        onUnpin={handleUnpinCommunityMessage}
      
        onClose={() => {
          closeReactionPicker();
          clearSelection();
        }}
      
        onReply={() => {
          const message = selectedMessage;
      
          if (!message || !isBackendMessage(message)) {
            return;
          }
      
          closeReactionPicker();
          setReplyingTo(message);
        }}
      
        onForward={() => {
          if (!selectedAreBackendMessages) {
            return;
          }
      
          closeReactionPicker();
      
          openForward(
            selectedCommunityMessages
          );
        }}
      
        onDelete={() => {
          messageBodyRef.current?.closeReactionPicker();
          setShowDeleteModal(true);
        }}
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
    </div>
  );
}