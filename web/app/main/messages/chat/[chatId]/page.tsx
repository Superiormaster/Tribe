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
import { useChatDrafts } from '@/hooks/useChatDrafts';
import { useMessageSelection } from '@/hooks/useMessageSelection';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useForwardMessages } from '@/hooks/useForwardMessages';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { getMessageKey } from '@/utils/chat/messageMerger';
import {
  saveMessage, getMessagesByChat, saveMessages, saveDraft, saveChatMeta, updateMessage, deleteChatData
} from "@/lib/messageDB";
import { muteChat, unmuteChat } from '@/utils/chat/MessageClientApi';
import { useChatSocket } from '@/lib/useChatSocket';
import { useVoiceRecorder } from '@/lib/useVoiceRecorder';
import VoiceRecorderUI from '@/components/VoiceRecorder';
import { useNetwork } from '@/components/networkConnection/NetworkContext';
import { useCallManager } from '@/lib/useCallManager';
import { getLivekitToken } from "@/lib/calls";
import CallUI from '@/components/CallUI';
import { motion, AnimatePresence } from 'framer-motion';
import ChatInput from '@/components/ChatInput';

type ChatUser = {
  id: number;
  username: string;
  avatar?: string;
  status?: string;
  last_seen?: string;
  is_message_blocked?: boolean;
  blocked_me?: boolean;
};

type voiceState =
  | "idle"
  | "recording"
  | "locked"
  | "cancelling"
  | "preview";

export default function ChatPage() {
  const { user } = useContext(UserContext)!;
  const { canCommunicate } = useNetwork();

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
  
  const [previewIndex, setPreviewIndex] =
    useState<number | null>(null);
  const [previewState, setPreviewState] = useState<{
    files: any[];
    index: number;
    msg: any;
    isMine: boolean;
    onReply: React.Dispatch<
      React.SetStateAction<any | null>
    >;
  } | null>(null);
  const isPreviewOpen = previewState !== null;

  const chatIdNum = chatId ? Number(chatId) : null;
  const [chatUser, setChatUser] = useState<ChatUser | null>(null);

  const [lastMessageStatus,
    setLastMessageStatus] =
    useState(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"plus" | "emoji" | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  const [showChatOptions, setShowChatOptions] = useState(false);
  const [showMuteModal, setShowMuteModal] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [mutedUntil, setMutedUntil] =
    useState<string | null>(null);

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const isDraggingMicRef = useRef(false);
  const gestureRef = useRef<"none"|"lock"|"cancel">("none");
  const [isLocked, setIsLocked] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const isCancellingRef = useRef(false);
  const [page, setPage] = useState(1);
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const [voiceState, setVoiceState] = useState<voiceState>("idle");
  const [micPressed, setMicPressed] = useState(false);
  
  useEffect(() => {
    if (!chatIdNum) return;
  
    const loadChat = async () => {
      const chatRes = await apiRequest(
        `api/chats/${chatIdNum}/detail/`
      );
    
      const other =
        chatRes.members.find(
          m => m.id !== currentUser.id
        ) || {};
    
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
  
  const STATUS_PRIORITY = {
    sending: 0,
    pending: 0,
    sent: 1,
    delivered: 2,
    seen: 3,
  };
  
  const updateStatus = (
    oldStatus,
    newStatus
  ) => {
    return (
      STATUS_PRIORITY[newStatus] >
      STATUS_PRIORITY[oldStatus]
    )
      ? newStatus
      : oldStatus;
  };
  
  const updateConversationStatus = (
    status
  ) => {
    setLastMessageStatus(prev =>
      updateStatus(
        prev,
        status
      )
    );
  };

  useEffect(() => {
    const onDelivered = (e) => {
      if (
        e.detail.chatId === chatIdNum
      ) {
        updateConversationStatus(
          "delivered"
        );
      }
    };
  
    const onSeen = (e) => {
      if (
        e.detail.chatId === chatIdNum
      ) {
        updateConversationStatus(
          "seen"
        );
      }
    };
  
    window.addEventListener(
      "message-delivered",
      onDelivered
    );
  
    window.addEventListener(
      "message-seen",
      onSeen
    );
  
    return () => {
      window.removeEventListener(
        "message-delivered",
        onDelivered
      );
  
      window.removeEventListener(
        "message-seen",
        onSeen
      );
    };
  }, [chatIdNum]);
  
  const handleSeen = useCallback(({
    messageIds = [],
    userId,
    chatId,
  }) => {
    if (
      userId === currentUser.id ||
      chatId !== chatIdNum ||
      !messageIds.length
    ) {
      return;
    }
  
    setMessages(prev => {
      const updated = prev.map(msg => {
        if (
          messageIds.includes(Number(msg.id))
        ) {
          return {
            ...msg,
            status: updateStatus(
              msg.status,
              "seen"
            ),
          };
        }
  
        return msg;
      });
  
      const last =
        updated[updated.length - 1];
  
      if (
        last?.sender === currentUser.id &&
        last.status === "seen"
      ) {
        setLastMessageStatus(
          "seen"
        );
      }
  
      return updated;
    });
  }, [chatIdNum, currentUser?.id]);
  
  const handleDelivered = useCallback(({
    messageIds = [],
    userId,
    chatId,
  }) => {
    if (
      userId === currentUser.id ||
      chatId !== chatIdNum ||
      !messageIds.length
    ) {
      return;
    }
  
    setMessages(prev => {
      const updated = prev.map(msg => {
        if (
          messageIds.includes(Number(msg.id))
        ) {
          return {
            ...msg,
            status: updateStatus(
              msg.status,
              "delivered"
            ),
          };
        }
  
        return msg;
      });
  
      const last =
        updated[updated.length - 1];
  
      if (
        last?.sender === currentUser.id &&
        last.status === "delivered"
      ) {
        setLastMessageStatus(
          "delivered"
        );
      }
  
      return updated;
    });
  }, [chatIdNum, currentUser?.id]);
  
  const getSenderId = (m: any) => m.sender;
  
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
  
  const socketRef = useChatSocket(
    chatIdNum,
    currentUser,
    {
      onSeen: handleSeen,
      onDelivered: handleDelivered,
    }
  );
  
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
    updateConversationStatus,
  });
  
  const {
    handleTyping,
  } = useTypingIndicator({
    chatId: chatIdNum,
    socketRef,
    setInput,
  
    saveDraft: (value: string) => {
      if (chatIdNum == null) return;
    
      saveDraft({
        chatId: chatIdNum,
        text: value,
        updated_at: new Date().toISOString(),
      });
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
    forwardMessages,
    forwardCaption,
    setForwardCaption,
    users,
    selectedForwardUsers,
    setSelectedForwardUsers,
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
  
  const handleSendMessage =
    async (payload?: any) => {
      if (!chatIdNum) {
        return;
      }
      console.log("SEND BUTTON PRESSED");
  
      // gif / sticker
      if (
        payload?.media_type ===
          "gif" ||
        payload?.media_type ===
          "sticker"
      ) {
        await handleSendExternalMedia(
          payload
        );
        return;
      }
  
      const text =
        payload?.encrypted_text ??
        input;
  
      const mediaCaption =
        payload?.caption ??
        caption;
  
      const mediaFiles =
        payload?.files ??
        files;
  
      const hasMedia =
        mediaFiles.length > 0;
  
      const hasText =
        text.trim().length > 0;
  
      const hasCaption =
        mediaCaption.trim()
          .length > 0;
  
      //
      // MEDIA MESSAGE
      //
      if (hasMedia) {
        await handleSendMedia({
          message: {
            chatId: chatIdNum,
            files: mediaFiles,
            caption: mediaCaption,
            encrypted_text: mediaCaption,
            media_source: "upload",
            reply_to: replyingTo,
          },
        });
      
        setSelectedFiles([]);
        setReplyingTo(null);
        return;
      }
  
      //
      // TEXT MESSAGE
      //
      if (hasText) {
        await sendMessage(text);
      }
    };

  const handleStartCall = async () => {
    const call = await startCall(chatIdNum, "audio");
  
    const { token, url } = await getLivekitToken(chatIdNum);
  
    await connectRoom(url, token);
  };
  
  const formatLastSeen = (date?: string) => {
    if (!date) return "";
  
    const lastSeen = new Date(date);
    const now = new Date();
  
    const diff =
      now.getTime() - lastSeen.getTime();
  
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
  
    // under a minute
    if (seconds < 60) {
      return "Just now";
    }
  
    // under an hour
    if (minutes < 60) {
      return `${minutes} min${
        minutes > 1 ? "s" : ""
      } ago`;
    }
  
    // today
    if (
      lastSeen.toDateString() ===
      now.toDateString()
    ) {
      return `${lastSeen.toLocaleTimeString(
        [],
        {
          hour: "numeric",
          minute: "2-digit",
        }
      )}`;
    }
  
    // yesterday
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
  
    if (
      lastSeen.toDateString() ===
      yesterday.toDateString()
    ) {
      return `Yesterday, ${lastSeen.toLocaleTimeString(
        [],
        {
          hour: "numeric",
          minute: "2-digit",
        }
      )}`;
    }
  
    // older dates
    return `${lastSeen.toLocaleDateString(
      [],
      {
        day: "numeric",
        month: "short",
        year:
          lastSeen.getFullYear() !==
          now.getFullYear()
            ? "numeric"
            : undefined,
      }
    )}`;
  };
  
  const getSelectedMessages = () => {
    return messages.filter(m =>
      selectedMessages.has(getMessageKey(m))
    );
  };
  
  const selected = getSelectedMessages();
  
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
  
      for (const msg of selected) {
        await updateMessage(
          msg.client_id || msg.id,
          currentUser.id,
          {
            hidden_for: [
              ...(msg.hidden_for || []),
              currentUser.id,
            ],
          }
        );
      }
  
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
    
      const remainingMessages =
        messages.filter(
          m =>
            !selected.some(
              s =>
                getMessageKey(s) ===
                getMessageKey(m)
            )
        );

      const isLastMessage =
        remainingMessages.length === 0;
      
      setMessages(remainingMessages);
      
      clearSelection();
      setShowDeleteModal(false);
      
      if (isLastMessage) {
        await deleteChatData(
          chatIdNum,
          currentUser.id
        );
      
        window.dispatchEvent(
          new CustomEvent(
            "chat-deleted",
            {
              detail: {
                chatId: chatIdNum,
              },
            }
          )
        );
      
        replace("/main/messages");
      }
  
    } catch (err) {
      console.error(err);
    }
  };
  
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
  
      for (const msg of selected) {
        await updateMessage(
          msg.client_id || msg.id?.toString(),
          currentUser.id,
          {
            is_deleted: true,
            text: "Deleted message",
            encrypted_text: "Deleted message",
            media_url: null,
            media_urls: [],
            media_type: null,
            thumbnail: null,
            preview: null,
          }
        );
      }
  
      for (const message of messages) {
        const repliedToDeleted =
          selected.some(
            s =>
              Number(s.id) ===
              Number(message.reply_to?.id)
          );
      
        if (!repliedToDeleted) continue;
      
        await updateMessage(
          message.client_id || message.id?.toString(),
          currentUser.id,
          {
            reply_to: {
              ...message.reply_to,
              text: "Deleted message",
              is_deleted: true,
            },
          }
        );
      }

      setMessages(prev =>
        prev.map(m => {
          const deleted =
            selected.some(
              s => Number(s.id) === Number(m.id)
            );
      
          const repliedToDeleted =
            selected.some(
              s =>
                Number(s.id) ===
                Number(m.reply_to?.id)
            );
      
          if (deleted) {
            return {
              ...m,
              is_deleted: true,
              text: "Deleted message",
              encrypted_text: "Deleted message",
              media_url: null,
              media_urls: [],
              media_type: null,
              thumbnail: null,
              preview: null,
            };
          }
      
          if (repliedToDeleted) {
            return {
              ...m,
              reply_to: {
                ...m.reply_to,
                text: "Deleted message",
                is_deleted: true,
              },
            };
          }
      
          return m;
        })
      );
  
      clearSelection();
      setShowDeleteModal(false);
  
    } catch (err) {
      console.error(err);
    }
  };
  
  const handleBlock = async () => {
    if (!chatUser) return;
  
    try {
      if (
        chatUser.is_message_blocked
      ) {
        await apiRequest(
          `api/chats/message-unblock/${chatUser.id}/`,
          {
            method: "POST",
          }
        );
  
        setChatUser(prev =>
          prev
            ? {
                ...prev,
                is_message_blocked:
                  false,
              }
            : prev
        );
      } else {
        await apiRequest(
          `api/chats/message-block/${chatUser.id}/`,
          {
            method: "POST",
          }
        );
  
        setChatUser(prev =>
          prev
            ? {
                ...prev,
                is_message_blocked:
                  true,
              }
            : prev
        );
      }
    } finally {
      setShowChatOptions(false);
    }
  };
  
  const handleMute = async (
    duration: "8h" | "1w" | "forever"
  ) => {
    const res = await muteChat(
      chatIdNum,
      duration
    );
  
    setIsMuted(true);
    setMutedUntil(
      res.muted_until
    );
  
    setShowMuteModal(false);
    setShowChatOptions(false);
  };
  
  const handleUnmute = async () => {
    await unmuteChat(chatIdNum);
  
    setIsMuted(false);
    setMutedUntil(null);
  
    setShowChatOptions(false);
  };
  
  const formatMutedUntil = (
    date?: string | null
  ) => {
    if (!date) return "";
  
    const mutedDate =
      new Date(date);
  
    const now = new Date();
  
    const tomorrow = new Date();
    tomorrow.setDate(
      now.getDate() + 1
    );
  
    if (
      mutedDate.toDateString() ===
      tomorrow.toDateString()
    ) {
      return `Muted until tomorrow, ${mutedDate.toLocaleTimeString(
        [],
        {
          hour: "numeric",
          minute: "2-digit",
        }
      )}`;
    }
  
    if (
      mutedDate.toDateString() ===
      now.toDateString()
    ) {
      return `Muted until today, ${mutedDate.toLocaleTimeString(
        [],
        {
          hour: "numeric",
          minute: "2-digit",
        }
      )}`;
    }
  
    return `Muted until ${mutedDate.toLocaleDateString(
      [],
      {
        month: "short",
        day: "numeric",
        year:
          mutedDate.getFullYear() !==
          now.getFullYear()
            ? "numeric"
            : undefined,
      }
    )}, ${mutedDate.toLocaleTimeString(
      [],
      {
        hour: "numeric",
        minute: "2-digit",
      }
    )}`;
  };
  
  useEffect(() => {
    if (!socketRef.current) return;
  
    socketRef.current.onUserStatus = ({
      userId,
      status,
      last_seen,
    }) => {
      if (userId !== chatUser?.id) return;
  
      setChatUser(prev =>
        prev
          ? {
              ...prev,
              status,
              last_seen,
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
    e.preventDefault();
    setMicPressed(true);
    draggingRef.current = true;
    isDraggingMicRef.current = true;
    const touch = e.touches?.[0] || e;
  
    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
  
    setIsLocked(false);
    setIsCancelling(false);
    setDrag({ x: 0, y: 0 });
    gestureRef.current = "none";

    setVoiceState("recording");
  
    await startRecording();
    vibrate(30); 
  };
  
  const handleMove = (e: any) => {
    e.preventDefault();
    if (isLocked) return;
    if (!draggingRef.current && !isDraggingMicRef.current) return;

    isDraggingMicRef.current = false;

    const touch = e.touches?.[0] || e;
  
    const dx = touch.clientX - startXRef.current;
    const dy = touch.clientY - startYRef.current;
  
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
  
    if (gestureRef.current === "none") {

    if (absX > 18 || absY > 18) {

          gestureRef.current =
              absX > absY
                  ? "cancel"
                  : "lock";
      }
    }
  
    if (gestureRef.current === "cancel") {

        setDrag({
            x: Math.max(dx, -120),
            y: 0,
        });
  
    } else if (gestureRef.current === "lock") {
    
        setDrag({
            x: 0,
            y: Math.max(dy, -120),
        });
    }
  
    if(
        gestureRef.current==="cancel" &&
        absY>20
    ){
        handleSend();
        return;
    }

    if(
        gestureRef.current==="lock" &&
        absX>20
    ){
        handleSend();
        return;
    }
  
    if (dx < -100 && !isCancelling) {
      setIsCancelling(true);
      vibrate(50);
      setVoiceState("cancelling");
    } else {
      setIsCancelling(false);
    }

    if (isCancelling) {
      setDrag({ x: -120, y: 0 });
    }

    if (dy <= -100 && !isLocked) {
      setIsLocked(true);
      setVoiceState("locked");
  
      draggingRef.current = false;
      isDraggingMicRef.current = false;
  
      gestureRef.current = "none";
  
      setMicPressed(false);
  
      // Snap mic back
      setDrag({ x: 0, y: 0 });
  
      vibrate([20, 40, 20]);
  
      return;
    }
  };
  
  const handleEnd = () => {
    // Locked?
    if (isLocked) {
        draggingRef.current = false;
        isDraggingMicRef.current = false;
        return;
    }

    setMicPressed(false);
    draggingRef.current = false;
    isDraggingMicRef.current = false;
    setDrag({ x:0,y:0 });

    if (isCancelling) {
        handleCancelVoice();
        setVoiceState("idle");
        return;
    }

    handleSend();
  };
  
  const handleStop = () => {
    if (voiceState === "locked") {
      stopRecording();
      setVoiceState("preview");
    }
  };
  
  const handleSend = () => {
    sendRecording();

    setMicPressed(false);
    setIsLocked(false);
    setIsCancelling(false);

    setDrag({ x: 0, y: 0 });

    gestureRef.current = "none";

    setVoiceState("idle");
  };
  
  const handleCancelVoice = () => {
    cancelRecording();

    setMicPressed(false);
    setIsLocked(false);
    setIsCancelling(false);

    setDrag({ x: 0, y: 0 });

    gestureRef.current = "none";

    setVoiceState("idle");
  };
  
  useEffect(() => {
    if (!isRecording && !isDraggingMicRef.current && voiceState === ("idle")) return;
  
    const move = (e) => handleMove(e);
    const end = (e) => {
      if (!micPressed) return;
      handleEnd(e);
    }
  
    window.addEventListener("mousemove", move);
  
    window.addEventListener("mouseup", end);
  
    window.addEventListener(
      "touchmove",
      move,
      {
        passive: false,
      }
    );
  
    window.addEventListener("touchend", end);
  
    return () => {
      window.removeEventListener("mousemove", move);
  
      window.removeEventListener("mouseup", end);
  
      window.removeEventListener("touchmove", move);
  
      window.removeEventListener("touchend", end);
    };
  }, [isRecording, voiceState, micPressed]);

  // =========================
  // UI
  // =========================
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-300 dark:bg-[#0b141a]">
      {voiceState === "locked" && (
        <VoiceRecorderUI
          waveform={waveform}
          duration={duration}
          drag={drag}
          isLocked={isLocked}
          previewBlob={previewBlob}
          onCancel={handleCancelVoice}
          onSend={handleSend}
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
      
        selectionMode={selectionMode}
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
            onSend={handleSendMessage}
            onFileSelect={(file) => {
              setSelectedFiles(prev => [...prev, file]);
              handleFileSelect(file);
            }}
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
            micPressed={micPressed}
            duration={duration}
            isLocked={isLocked}
            voiceState={voiceState}
            onMicStart={handleStart}
            onMicMove={handleMove}
            onMicEnd={handleEnd}
            drag={drag}
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
        chatUser={chatUser}
        users={users}
        selectedUsers={selectedForwardUsers}
        setSelectedUsers={setSelectedForwardUsers}
        selectedMessages={forwardMessages}
        forwardCaption={forwardCaption}
        setForwardCaption={setForwardCaption}
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
          setIndex={(value) => {
            setPreviewState(prev => {
              if (!prev) return null;
      
              const index =
                typeof value === "function"
                  ? value(prev.index)
                  : value;
      
              return {
                ...prev,
                index,
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