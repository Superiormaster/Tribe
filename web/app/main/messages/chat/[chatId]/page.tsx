'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Send, Mic, Video, Trash2, MoreVertical, Plus } from 'lucide-react';
import MessageBubbles from '@/components/MessageBubbles';
import { apiRequest } from '@/utils/api';
import { uploadToCloudinary } from '@/utils/cloudinary';
import { useChatSocket } from '@/lib/useChatSocket';
import { useVoiceRecorder } from '@/lib/useVoiceRecorder';
import { useMessageQueue } from '@/lib/useMessageQueue';
import VoiceRecorderUI from '@/components/VoiceRecorder';
import { openDB } from "idb";
import { encryptMessage, decryptMessage } from '@/lib/crypto';
import { useCallManager } from '@/lib/useCallManager';
import { getLivekitToken } from "@/lib/calls";
import CallUI from '@/components/CallUI';

const currentUser = { id: 1, username: 'You' };

type ChatUser = {
  id: number;
  username: string;
  avatar?: string;
  status?: string;
  last_seen?: string;
};

export default function ChatPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const chatId = Array.isArray(params.chatId)
    ? params.chatId[0]
    : params.chatId;

  const chatIdNum = chatId ? Number(chatId) : null;
  const [chatUser, setChatUser] = useState<ChatUser | null>(null);

  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [isLocked, setIsLocked] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const isCancellingRef = useRef(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [mode, setMode] = useState<
    "idle" | "recording" | "paused"
  >("idle");

  const typingTimeout = useRef<any>(null);

  const CACHE_KEY = `chat_cache_${chatIdNum}`;

  const socketRef = useChatSocket(
    chatIdNum,
    setMessages,
    setIsTyping,
    currentUser
  );

  const {
    isRecording,
    duration,
    startRecording,
    stopRecording,
    resendMessage,
    cancelRecording,
    waveform,
    previewBlob,
    sendRecording,
    isPaused,
    togglePause,
  } = useVoiceRecorder(socketRef, chatIdNum, currentUser, setMessages);
  
  const {
    callState,
    connectRoom,
    disconnect,
    setCallState,
  } = useCallManager("", "");
  
  const { addToQueue, startQueueProcessor } = useMessageQueue(
    socketRef,
    setMessages
  );
  
  useEffect(() => {
    startQueueProcessor();
  }, []);
  
  const handleStartCall = async () => {
    const call = await startCall(chatIdNum, "audio");
  
    const { token, url } = await getLivekitToken(chatIdNum);
  
    await connectRoom(url, token);
  };
  
  useEffect(() => {
    if (!chatIdNum) return;

    const load = async () => {
      const res = await apiRequest(`api/chats/${chatIdNum}/`);
  
      // 🔥 HARD GUARD
      const isMember = res.members.some(
        (m: any) => m.id === currentUser.id
      );
  
      if (!isMember) {
        console.error("INVALID CHAT ACCESS");
        return;
      }
  
      const other = res.members.find(
        (m: any) => m.id !== currentUser.id
      );
  
      setChatUser(other);
    };
  
    load();
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
  // LOAD + CACHE
  // =========================
  const loadMessages = async (pageNum = 1) => {
    const res = await apiRequest(
      `api/chats/${chatIdNum}/?page=${pageNum}`
    );

    if (pageNum === 1) {
      setMessages(res.results);
    } else {
      setMessages(prev => [...res.results, ...prev]);
    }

    setHasMore(!!res.next);

    localStorage.setItem(CACHE_KEY, JSON.stringify(res.results));
  };

  useEffect(() => {
    if (!chatIdNum) return;

    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) setMessages(JSON.parse(cached));

    loadMessages(1);
  }, [chatIdNum]);

  // =========================
  // TYPING (DEBOUNCED)
  // =========================
  const handleTyping = (value: string) => {
    setInput(value);

    socketRef.current?.emit("typing_start", { chatId: chatIdNum });

    if (typingTimeout.current) clearTimeout(typingTimeout.current);

    typingTimeout.current = setTimeout(() => {
      socketRef.current?.emit("typing_stop", { chatId: chatIdNum });
    }, 800);
  };

  // =========================
  // SEND MESSAGE
  // =========================
  const sendMessage = async () => {
    if (!input.trim()) return;
  
    const clientId = crypto.randomUUID();
  
    const tempMsg = {
      id: clientId,
      text: input,
      sender: currentUser.id,
      status: "sending",
    };
  
    setMessages(prev => [...prev, tempMsg]);
    setInput("");
  
    try {
      if (!chatUser?.id) return;

      const recipientPublicKey = await apiRequest(
        `api/users/${chatUser.id}/public-key/`
      );

      if (!recipientPublicKey?.public_key) {
        console.error("No public key available");
        return;
      }

      const encrypted = await encryptMessage(
        recipientPublicKey.public_key,
        input
      );
  
      const payload = {
        clientId,
        chatId: chatIdNum,
        encrypted,
      };
  
      // offline
      if (!navigator.onLine || !socketRef.current?.connected) {
        addToQueue(payload);
        return;
      }
  
      socketRef.current.emit("send_message", payload, (ack: any) => {
        if (ack?.ok) {
          setMessages(prev =>
            prev.map(m =>
              m.id === clientId
                ? { ...m, id: ack.id, status: "sent" }
                : m
            )
          );
        } else {
          addToQueue(payload);
        }
      });
  
    } catch (err) {
      console.error("Encryption failed:", err);
    }
  };

  const getStatusText = (user) => {
    if (user.status === "online") return "🟢 online";
    return `⚫ last seen ${user.last_seen}`;
  };

  // =========================
  // MARK SEEN
  // =========================
  useEffect(() => {
    if (!chatIdNum || !socketRef.current) return;

    socketRef.current.emit("mark_seen", { chatId: chatIdNum });
  }, [chatIdNum]);

  // =========================
  // MEDIA UPLOAD
  // =========================
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleMediaUpload = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await uploadToCloudinary({
      file,
      folder: "Tribe/Media",
    });

    socketRef.current?.emit("send_message", {
      chatId: chatIdNum,
      media_url: url,
      media_type: file.type.startsWith("video") ? "video" : "image",
    });
  };

  // =========================
  // UI
  // =========================
  return (
    <div className="flex flex-col h-screen">
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

      {/* HEADER */}
      <div className="flex fixed top-0 left-0 right-0 md:left-64 bg-white dark:bg-gray-900 gap-2 justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-3">
  
          {/* Back button */}
          <button
            onClick={() => window.history.back()}
            className="text-xl px-2"
          >
            ←
          </button>
  
          {/* Avatar */}
          <div className="w-9 h-9 rounded-full relative overflow-hidden bg-gray-300 flex items-center justify-center">
            {chatUser?.avatar ? (
              <img
                src={chatUser.avatar}
                className="w-9 h-9 rounded-full object-cover"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs">
                {chatUser?.username.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
  
          <div className="flex flex-col">
            {/* Username */}
            <span className="font-semibold">
              {chatUser?.username}
            </span>
          
            {/* Typing */}
            {isTyping && (
              <span className="text-xs text-gray-500">
                typing...
              </span>
            )}
          
            {/* Online status */}
            <span className="flex items-center gap-1 text-xs text-gray-500">
              {chatUser?.status === "online" ? (
                <>
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-green-500">online</span>
                </>
              ) : (
                <>
                  <span> {formatLastSeen(chatUser?.last_seen)}
                  </span>
                </>
              )}
            </span>
          </div>
        </div>
  
        {/* RIGHT: actions */}
        <div className="flex items-center gap-4 text-gray-600 dark:text-gray-300">
  
          <button
            onClick={async () => {
              const { token, url } = await getLivekitToken(String(chatIdNum));
              await connectRoom(url, token);
            }}
            className="hover:text-indigo-600"
          >
            📞
          </button>
          
          <button
            onClick={async () => {
              const { token, url } = await getLivekitToken(String(chatIdNum));
              await connectRoom(url, token);
            }}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Video size={20} />
          </button>
  
          {/* More (vertical dots) */}
          <button className="hover:text-indigo-600 text-xl">
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* MESSAGES */}
      <div className="flex-1 mt-12 overflow-y-auto">
        <MessageBubbles
          messages={messages}
          currentUser={currentUser.username}
          currentUserId={currentUser.id}
          loadMore={() => {
            if (!hasMore) return;
            const next = page + 1;
            setPage(next);
            loadMessages(next);
          }}
        />
      </div>

      {/* INPUT */}
      {!isRecording && (
        <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-white dark:bg-gray-900 border-t p-2 flex items-center z-40">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <Plus size={20} />
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            hidden
            onChange={handleMediaUpload}
          />
  
          <input
            value={input}
            onChange={(e) => handleTyping(e.target.value)}
            className="flex-1 border px-3 py-2 rounded-full dark:bg-gray-800"
            placeholder="Message..."
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          />

          <button
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <Mic size={20} />
          </button>
  
          <button
            onClick={sendMessage}
            disabled={isRecording}
            className={`p-2 rounded-full ${
              isRecording
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700"
            } text-white`}
          >
            <Send size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

function formatLastSeen(timestamp) {
  if (!timestamp) return "";

  const last = new Date(timestamp);
  const now = new Date();

  const diff = Math.floor((now - last) / 1000);

  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hrs ago`;

  return last.toLocaleDateString();
}