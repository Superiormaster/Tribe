'use client';

import { useEffect, useContext, useMemo, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Send, Mic, Video, Trash2, MoreVertical, X, Reply, Forward } from 'lucide-react';
import ForwardDrawer from '@/components/chat/ForwardDrawer';
import ChatHeader from '@/components/chat/ChatHeader';
import ChatBody from '@/components/chat/ChatBody';
import { normalizeMessage } from '@/utils/chat/messageNormalizer';
import ChatSelectionBar from '@/components/chat/ChatSelectionBar';
import DeleteModal from '@/components/chat/DeleteModal';
import { formatLastSeen } from '@/utils/chat/formatLastSeen';
import { UserContext } from '@/components/UserContext'
import MessageBubbles from '@/components/MessageBubbles';
import { apiRequest } from '@/utils/api';
import { useChatDrafts } from '@/hooks/useChatDrafts';
import { useMessageSelection } from '@/hooks/useMessageSelection';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useForwardMessages } from '@/hooks/useForwardMessages';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import {
  saveMessage,
  getMessagesByChat,
  saveMessages,
  replaceOptimisticMessage,
  updateMessage,
  deleteDraft,
  saveDraft,
  getDraft,
} from "@/lib/messageDB";
import { uploadToCloudinary } from '@/utils/cloudinary';
import { useChatSocket } from '@/lib/useChatSocket';
import { useVoiceRecorder } from '@/lib/useVoiceRecorder';
import VoiceRecorderUI from '@/components/VoiceRecorder';
import { openDB } from "idb";
import { encryptMessage, decryptMessage } from '@/lib/crypto';
import { useCallManager } from '@/lib/useCallManager';
import { getLivekitToken } from "@/lib/calls";
import CallUI from '@/components/CallUI';
import { motion, AnimatePresence } from 'framer-motion';
import { connectUser, getConnectedUsers, removeConnection } from '@/lib/api';
import ChatInput from '@/components/ChatInput';

type ChatUser = {
  id: number;
  username: string;
  avatar?: string;
  status?: string;
  last_seen?: string;
};

export default function ChatPage() {
  const { user } = useContext(UserContext)!;

  const currentUser = useMemo(() => ({
    id: user?.id ?? null,
    username: user?.username ?? "",
    privateKey: user?.private_key ?? null,
    avatar: user?.avatar ?? null,
  }), [user]);
  
  const searchParams = useSearchParams();
  const { chatId } = useParams<{ chatId: string }>();

  const chatIdNum = chatId ? Number(chatId) : null;
  const [chatUser, setChatUser] = useState<ChatUser | null>(null);

  const [showDrawer, setShowDrawer] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"plus" | "emoji" | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showDeleteModal, setShowDeleteModal] =
    useState(false);

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [isLocked, setIsLocked] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const isCancellingRef = useRef(false);
  const [page, setPage] = useState(1);
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const [mode, setMode] = useState<
    "idle" | "recording" | "paused"
  >("idle");

  const getMessageKey = (m: any) =>
  String(m.localId || m.clientId || m.id);
  const getSenderId = (m: any) =>
    m.sender?.id ||
    m.senderId ||
    m.sender;
  
  const {
    callState,
    connectRoom,
    disconnect,
    setCallState,
  } = useCallManager("", "");
  
  const {
    input,
    setInput,
    drafts,
    clearDraft,
    saveDraftLocal,
  } = useChatDrafts(chatIdNum);
  
  const socketRef = useChatSocket(chatIdNum, currentUser);
  
  const {
    messages,
    setMessages,
    sendMessage,
    resendMessage,
    reactToMessage,
    loadMore,
    hasMore,
  } = useChatMessages({
    chatId: chatIdNum,
    currentUser,
    chatUser,
    socketRef,
    input,
    setInput,
    replyingTo,
    setReplyingTo,
    clearDraft,
  });
  
  const {
    handleTyping,
  } = useTypingIndicator({
    chatId: chatIdNum,
    socketRef,
    setInput,
  
    saveDraft: (value) => {
      saveDraft(value);
    },
  });
  
  useEffect(() => {
    if (!socketRef.current) return;
  
    socketRef.current.setHandlers?.({
      setMessages,
      setIsTyping,
    });
  }, [socketRef, setMessages]);
  
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
  
    users,
  
    selectedForwardUsers,
    setSelectedForwardUsers,
  
    openForward,
    closeForward,
    sendForward,
  } = useForwardMessages({
    socketRef,
    chatUser,
    clearSelection,
  });
  
  const {
    selectedMedia,
    mediaPreview,
    mediaCaption,
    setMediaCaption,
    handleFileSelect,
    handleSendMedia,
  } = useMediaUpload({
    chatId: chatIdNum,
    currentUser,
    socketRef,
    setMessages,
  });

  const handleStartCall = async () => {
    const call = await startCall(chatIdNum, "audio");
  
    const { token, url } = await getLivekitToken(chatIdNum);
  
    await connectRoom(url, token);
  };
  
  const handleDeleteForMe = async () => {
    const selected = getSelectedMessages();
  
    try {
      await apiRequest(
        `api/chats/chats/${chatIdNum}/messages/hide/`,
        {
          method: "POST",
          data: {
            message_ids: selected.map(
              m => Number(m.id)
            ),
          },
        }
      );
  
      setMessages(prev =>
        prev.filter(
          m =>
            !selected.some(
              s => Number(s.id) === Number(m.id)
            )
        )
      );
  
      clearSelection();
      setShowDeleteModal(false);
  
    } catch (err) {
      console.error(err);
    }
  };
  
  const getSelectedMessages = () => {
    return messages.filter(m =>
      selectedMessages.has(getMessageKey(m))
    );
  };
  
  const selected = getSelectedMessages();
  
  const canDeleteForEveryone =
    selected.length > 0 &&
    selected.every(m => {
      const isMine =
        getSenderId(m) === currentUser.id;
  
      const alreadyDeleted =
        m.is_deleted === true;
  
      return isMine && !alreadyDeleted;
    });
  
  const handleDeleteForEveryone = async () => {
    const selected = getSelectedMessages();

    if (
      !selected.every(
        m => getSenderId(m) === currentUser.id
      )
    ) {
      return;
    }
  
    try {
      await apiRequest(
        `api/chats/chats/${chatIdNum}/messages/delete/`,
        {
          method: "POST",
          data: {
            message_ids: selected.map(
              m => Number(m.id)
            ),
          },
        }
      );
  
      setMessages(prev =>
        prev.map(m => {
          const deleted = selected.some(
            s => Number(s.id) === Number(m.id)
          );
  
          if (!deleted) return m;
  
          return {
            ...m,
            is_deleted: true,
            text: "Deleted message",
            media_url: null,
            media_urls: [],
            preview: null,
            reply_to: null,
          };
        })
      );
  
      clearSelection();
      setShowDeleteModal(false);
  
    } catch (err) {
      console.error(err);
    }
  };
  
  useEffect(() => {
    if (!chatIdNum) return;
  
    const loadChat = async () => {
      const chatRes = await apiRequest(
        `api/chats/chats/${chatIdNum}/detail/`
      );
  
      const other = chatRes.members.find(
        (m: any) => m.id !== currentUser.id
      );
  
      setChatUser(other);
    };
  
    loadChat();
  }, [chatIdNum]);

  // Voice Note
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };
  
  const handleSwipe = (currentX: number) => {
    const diff = startXRef.current - currentX;
  
    if (diff > 80) {
      // swipe left = cancel
      isCancellingRef.current = true;
      cancelRecording();
    }
  };
  
  const vibrate = (pattern: number | number[]) => {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  };
  
  const handleStart = async (e: any) => {
    const touch = e.touches?.[0] || e;
  
    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
  
    setIsLocked(false);
    setIsCancelling(false);
    setDrag({ x: 0, y: 0 });
  
    await startRecording();
    vibrate(30); 
    setMode("recording");
  };
  
  const handleMove = (e: any) => {
    e.preventDefault();

    const touch = e.touches?.[0] || e;
  
    const dx = touch.clientX - startXRef.current;
    const dy = touch.clientY - startYRef.current;
  
    setDrag({ x: dx, y: dy });
  
    if (dx < -80 && !isCancelling) {
      setIsCancelling(true);
      vibrate(50);
    }
  
    if (dy < -80 && !isLocked) {
      setIsLocked(true);
      vibrate([20, 40, 20]);
    }

    if (isCancelling) {
      setDrag({ x: -120, y: 0 });
    }

    if (isLocked) {
      setDrag({ x: 0, y: -120 });
    }
  };
  
  const handleEnd = () => {
    setDrag({ x: 0, y: 0 });
    if (isCancelling) {
      cancelRecording();
      return;
    }
  
    if (!isLocked) {
      stopRecording(); // auto preview
    }
  };
  
  const handleStop = () => {
    if (!isLocked) {
      stopRecording();
    }
  };
  
  const handleCancel = () => {
    cancelRecording();
    setMode("idle");
  };
  
  useEffect(() => {
    const move = (e: any) => handleMove(e);
    const end = () => handleEnd();
  
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", end);
    window.addEventListener("touchmove", move);
    window.addEventListener("touchend", end);
  
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", end);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", end);
    };
  }, [isRecording, isLocked, isCancelling]);

  // =========================
  // UI
  // =========================
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-300 dark:bg-[#0b141a]">
      {isRecording && (
        <VoiceRecorderUI
          waveform={waveform}
          duration={duration}
          drag={drag}
          isLocked={isLocked}
          previewBlob={previewBlob}
          onCancel={cancelRecording}
          onSend={sendRecording}
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
      />

      <ChatBody
        messages={messages}
        currentUser={currentUser}
      
        showDrawer={showDrawer}
        setShowDrawer={setShowDrawer}
        setDrawerMode={setDrawerMode}
      
        page={page}
        hasMore={hasMore}
      
        loadMore={() => {
          if (!hasMore) return;
      
          const next = page + 1;
      
          setPage(next);
      
          loadMessages(next);
        }}
      
        selectionMode={selectionMode}
        selectedMessages={selectedMessages}
      
        resendMessage={resendMessage}
      
        toggleSelectMessage={toggleSelectMessage}
        clearSelection={clearSelection}
      
        replyingTo={replyingTo}
        setReplyingTo={setReplyingTo}
      
        onReaction={reactToMessage}
      />

      {!isRecording && (
        <ChatInput
          value={input}
          onChange={handleTyping}
          onSend={sendMessage}
          onFileSelect={handleFileSelect}
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
          onMicStart={handleStart}
          onMicMove={handleMove}
          onMicEnd={handleEnd}
        />
      )}
      
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
        chatUser={chatUser}
        users={users}
        selectedUsers={selectedForwardUsers}
        setSelectedUsers={setSelectedForwardUsers}
        selectedMessages={getSelectedMessages()}
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
    </div>
  );
}