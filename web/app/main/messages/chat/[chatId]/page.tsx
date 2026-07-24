'use client';

import { useEffect, useContext, useMemo, useState, useCallback, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import ForwardDrawer from '@/components/chat/ForwardDrawer';
import ChatHeader from '@/components/chat/ChatHeader';
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
import VoiceRecorderUI from '@/components/VoiceRecorder';
import { useNetwork } from '@/components/networkConnection/NetworkContext';
import { useCallManager } from '@/lib/useCallManager';
import { getLivekitToken, startCall } from "@/lib/calls";
import CallUI from '@/components/CallUI';
import ChatInput from '@/components/ChatInput';
import { useNavigation } from "@/utils/useNavigation";
import { Message } from "@/utils/chat/messageContract";

type voiceState =
  | "idle"
  | "recording"
  | "locked"
  | "cancelling"
  | "preview";

export default function ChatPage() {
  const { user } = useContext(UserContext)!;
  const { canCommunicate } = useNetwork();
  const { replace } = useNavigation();

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
  
  const [showChatOptions, setShowChatOptions] = useState(false);
  const [showMuteModal, setShowMuteModal] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [mutedUntil, setMutedUntil] =
    useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
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
      const chatRes = await apiRequest(
        `api/chats/${chatIdNum}/detail/`
      );

      const other = chatRes.other_user;
    
      const presence =
        await apiRequest(
          `api/users/presence/${other.id}/`
        );
    
      setChatUser({
        ...other,
        status: presence.status,
        last_seen:
          presence.last_seen,
        is_message_blocked:
          chatRes.is_message_blocked,
        blocked_me:
          chatRes.blocked_me,
      });
      
      await saveChatMeta(
        chatIdNum,
        other.id,
        other.username,
        other.avatar
      );
    
      setIsMuted(chatRes.is_muted);
      setMutedUntil(chatRes.muted_until);
      setLastMessageStatus(
        chatRes.last_message?.status
      );
    };
  
    loadChat();
  }, [chatIdNum, currentUser.id]);
  
  const messagingBlocked =
    chatUser?.is_message_blocked ||
    chatUser?.blocked_me;
  
  const getSenderId = (m: any) => m.sender;
  
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
    setSocketRef,
  } = useChatMessages({
    chatId: chatIdNum,
    currentUser,
    chatUser,
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
    chatId: chatIdNum,
    currentUser: currentUser.id,
    setMessages,
  });
  
  const socketRef = useChatSocket(
    chatIdNum,
    currentUser,
    {
      onSeen: handleSeen,
      onDelivered: handleDelivered,
    }
  );
  
  const {
    handleTyping,
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
  
  useEffect(() => {
    if (socketRef.current) {
        setSocketRef(socketRef.current);
    }
  }, [socketRef, setSocketRef]);
  
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
  } = useVoiceRecorder(socketRef, chatIdNum, currentUser, setMessages);
  
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
        muted={isMuted}
        onBlock={handleBlock}
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
        onClose={clearSelection}
        onReply={() =>
          setReplyingTo(getSelectedMessages()[0])
        }
        onForward={() =>
          openForward(getSelectedMessages())
        }
        onDelete={() => setShowDeleteModal(true)}
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
    
        getMessageKey={getMessageKey}
    
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
    </div>
  );
}