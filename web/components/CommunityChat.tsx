'use client';
import { useState, useEffect, useContext, useRef } from 'react';
import { UserContext } from './UserContext';
import { apiRequest } from '@/utils/api';
import { useMessageSelection } from '@/hooks/useMessageSelection';
import ForwardDrawer from '@/components/chat/ForwardDrawer';
import { useCommunitySocket } from '@/lib/useCommunitySocket';
import CommunityChatBody from '@/components/communityChat/CommunityChatBody';
import CommunityPinnedBar from '@/components/communityChat/CommunityPinnedBar';
import { usePreview } from "@/utils/chatPage/usePreview";
import CommunityChatInput from '@/components/communityChat/CommunityChatInput';
import CommunityChatHeader from '@/components/communityChat/CommunityChatHeader';
import { useCommunityDrafts } from '@/hooks/communityChat/useCommunityDrafts';
import { useCommunityMessages } from '@/hooks/communityChat/useCommunityMessages';
import { useVoiceRecorder } from '@/lib/useVoiceRecorder';
import VoiceRecorderUI from '@/components/VoiceRecorder';
import PreviewViewer from '@/components/chat/ChatPreview';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useForwardMessages } from '@/hooks/useForwardMessages';
import { useCommunityMediaUpload } from '@/utils/communityChatPage/useCommunityMediaUpload';
import { useDeleteCommunityMessages } from '@/utils/communityChatPage/useDeleteCommunityMessages';
import { useSendCommunityMessage } from '@/utils/communityChatPage/useSendCommunityMessage';
import { useVoiceGestures } from '@/utils/chatPage/useVoiceGestures';
import { getMessageKey } from '@/utils/chat/messageMerger';
import type { MessageStatus } from "@/utils/chat/messageContract";
import { useNetwork } from '@/components/networkConnection/NetworkContext';
import { useCallManager } from '@/lib/useCallManager';
import { getLivekitToken, startCall } from "@/lib/calls";
import CallUI from '@/components/CallUI';
import { useNavigation } from "@/utils/useNavigation";
import { Message } from "@/utils/chat/messageContract";

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
  const { canCommunicate } = useNetwork();
  const { replace } = useNavigation();
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
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
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [communityData, setCommunityData] = useState<any>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [chatLocked, setChatLocked] = useState(false);
  const [typingUsers, setTypingUsers] = useState<any[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const loadCommunity = async () => {
      try {
        const res = await apiRequest(`api/communities/${communityId}/`);
        setCommunityData(res);
  
        setOnlineCount(
          Math.floor((res?.members_count || 0) * 0.3)
        );
      } catch (err) {
        console.error(err);
      }
    };
  
    loadCommunity();
  }, [communityId]);
  
  const {
    previewIndex,
    setPreviewIndex,
    previewState,
    setPreviewState,
    isPreviewOpen,
  } = usePreview();

  const socketRef = useCommunitySocket(
    communityId,
    currentUser
  );
  
  const {
    input,
    setInput,
    drafts,
    clearDraft,
    saveCommunityDraftLocal,
  } = useCommunityDrafts(communityId);

  const {
      messages,
      setMessages,
      sendMessage,
      reactToMessage,
      deleteMessage,
      pinMessage,
      loadMore,
      loadNewer,
      resendPendingMessage,
      retryFailedMessage,
      hasMore,
      hasNewer,
  } = useCommunityMessages({
      communityId,
      currentUser,
      socketRef,
      input,
      setInput,
      replyingTo,
      setReplyingTo,
      clearDraft,
  });
  const pinnedMessages = messages.filter(
    (m) => m.is_pinned
  );
  
  useEffect(() => {
      if (!socketRef.current) return;
  
      socketRef.current.setHandlers?.({
          setMessages,
          setTypingUsers,
      });
  }, [socketRef]);
  
  const {
    handleTyping,
  } = useTypingIndicator({
    chatId: communityId,
    socketRef,
    setInput,
    saveDraft: saveCommunityDraftLocal,
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
  } = useVoiceRecorder(socketRef, communityId, currentUser, setMessages);
  
  const scrollToMessage = (messageId: number) => {
    const element = document.getElementById(
      `message-${messageId}`
    );
  
    if (!element) return;
  
    element.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  
    element.classList.add("ring-2", "ring-yellow-400");
  
    setTimeout(() => {
      element.classList.remove(
        "ring-2",
        "ring-yellow-400"
      );
    }, 1800);
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
  } = useCommunityMediaUpload({
    chatId: communityId,
    currentUser,
    socketRef,
    setMessages,
  });
  
  const {
    getSelectedMessages,
    canDeleteForEveryone,
    handleDeleteForMe,
    handleDeleteForEveryone,
  } = useDeleteCommunityMessages({
    communityId,
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

  // Delete message (user or moderator)
  const handleDeleteMessage = async (messageId: number, ownerId: number) => {
    if (ownerId !== currentUser.id && !isModerator) return alert('Not authorized');
    setMessages((prev) => prev.filter((m) => m.id !== messageId));

    try {
      await apiRequest(`api/communities/${communityId}/chat/${messageId}/`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error(err);
      alert('Failed to delete message.');
    }
  };

  const isModerator =
  currentUser?.role === 'moderator' ||
  currentUser?.role === 'admin';

  // Admin actions
  const toggleChatLock = async () => {
    setChatLocked(!chatLocked);
    // backend call to lock/unlock chat
    await apiRequest(`api/communities/${communityId}/lock/`, {
      method: 'POST',
      data: { lock: !chatLocked },
    });
  };
  
  const togglepinMessage = async (messageId: number) => {
    try {
      await apiRequest(
        `api/messages/${messageId}/toggle_pin/`,
        {
          method: 'POST',
        }
      );
  
      setMessages((prev: any) =>
        prev.map((msg: any) =>
          msg.id === messageId
            ? {
                ...msg,
                is_pinned: !msg.is_pinned,
              }
            : msg
        )
      );
    } catch (err) {
      console.error(err);
    }
  };
  
  const voice = useVoiceGestures({
    startRecording,
    stopRecording,
    cancelRecording,
    sendRecording,
    isRecording,
  });
  
  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 overflow-hidden">
  
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
  
          {isModerator && (
            <button
              onClick={toggleChatLock}
              className="p-2 rounded-full bg-gray-700 text-white"
            >
              🔒
            </button>
          )}
  
      {/* PINNED BAR */}
      <CommunityPinnedBar
        pinnedMessages={pinnedMessages}
        onJumpToMessage={scrollToMessage}
      />
  
      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto">
        <CommunityChatBody
          communityId={communityId}
          messages={messages}
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
          setIndex={(value: number) => {
            setPreviewState(prev => {
              if (!prev) return null;
          
              return {
                ...prev,
                index: value,
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
                        communityData.cover_image ??
                        communityData.avatar,
                    type: "community",
                    communityId,
                }
              : undefined
        }
    
        getMessageKey={getMessageKey}
    
        onClose={closeForward}
        onSend={sendForward}
      />
    </div>
  );
}