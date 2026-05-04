'use client';

import React, { useRef, useState, useEffect } from 'react';
import AudioWaveform from '@/components/AudioWaveform';

type Message = {
  id: number | string;
  text?: string;
  username: string;
  avatar?: string;
  created_at?: string;
  seen_by?: number[];
  media_type?: string;
  media_url?: string;
  status?: string;
};

type Props = {
  messages: Message[];
  currentUser: string;
  currentUserId: number;

  // 🔥 injected from parent (important separation)
  onLoadMore?: () => void;
  hasMore?: boolean;
  resendMessage?: (msg: Message) => void;
};

export default function MessageBubbles({
  messages,
  currentUser,
  currentUserId,
  onLoadMore,
  hasMore,
  resendMessage,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [activeMessage, setActiveMessage] = useState<any>(null);
  const [showMenu, setShowMenu] = useState(false);
  
  const pressTimer = useRef<any>(null);

  const handleLongPress = (msg: any) => {
    pressTimer.current = setTimeout(() => {
      setActiveMessage(msg);
      setShowMenu(true);
    }, 500); // 500ms = WhatsApp feel
  };
  
  const cancelLongPress = () => {
    clearTimeout(pressTimer.current);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
  
    const p =
      audioRef.current.currentTime /
      audioRef.current.duration;
  
    setProgress(p);
  };

  // =========================
  // 📜 SCROLL LOAD MORE (TOP)
  // =========================
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !onLoadMore) return;

    const handleScroll = () => {
      if (el.scrollTop < 50 && hasMore) {
        onLoadMore();
      }
    };

    el.addEventListener('scroll', handleScroll);

    return () => el.removeEventListener('scroll', handleScroll);
  }, [hasMore, onLoadMore]);

  // =========================
  // ⬇️ AUTO SCROLL (NEW MSG)
  // =========================
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // =========================
  // 🧠 GROUP MESSAGES
  // =========================
  const groupedByDate = messages.reduce((acc: any, msg) => {
    const date = formatMessageDate(msg.created_at);
    if (!acc[date]) acc[date] = [];
    acc[date].push(msg);
    return acc;
  }, {});

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto p-2 space-y-2 flex flex-col"
    >
      {Object.entries(groupedByDate).map(([date, msgs]: any) => {

        return (
          <div
            key={date}
            className={`flex flex-col mb-2`}
          >
            <div className="text-center text-xs text-gray-400 my-3">
              {date}
            </div>

            {/* 💬 MESSAGES */}
            {msgs.map((msg: Message) => {
              const isSeen = msg.seen_by?.includes(currentUserId);
              const isCurrentUser = msg.username === currentUser;

              return (
                <div
                  key={msg.id}
                  onMouseDown={() => handleLongPress(msg)}
                  onMouseUp={cancelLongPress}
                  onMouseLeave={cancelLongPress}
                  onTouchStart={() => handleLongPress(msg)}
                  onTouchEnd={cancelLongPress}
                  className={`px-3 py-2 rounded-lg break-words max-w-xs mb-[2px] ${
                  activeMessage?.id === msg.id
                  ? "bg-yellow-200 scale-105"
                  : isCurrentUser
                  ? "bg-indigo-600 text-white rounded-br-none items-end ml-auto"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-900 items-start dark:text-gray-100 rounded-bl-none mr-auto"
                  }`}
                >
                  {/* MEDIA */}
                  {msg.media_type === 'image' && (
                    <img
                      src={msg.media_url}
                      className="rounded-lg max-w-full"
                    />
                  )}

                  {msg.media_type === 'video' && (
                    <video controls className="rounded-lg max-w-full">
                      <source src={msg.media_url} />
                    </video>
                  )}

                  {msg.media_type === "audio" && (
                    <AudioBubble url={msg.media_url} isMe={isCurrentUser} />
                  )}

                  {/* TEXT */}
                  {msg.text && <div>{msg.text}</div>}

                  {/* TIME */}
                  <div className="text-xs text-gray-400 mt-1 text-right">
                    {msg.created_at &&
                      new Date(msg.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                  </div>

                  {showMenu && activeMessage && (
                    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-white shadow-lg rounded-full px-3 py-2 flex gap-2 z-50">
                      {["👍", "❤️", "😂", "😮", "😢"].map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => {
                            console.log("React:", emoji);
                            setShowMenu(false);
                          }}
                          className="text-lg"
                        >
                          {emoji}
                        </button>
                      ))}
                  
                      <button className="text-lg">➕</button>
                    </div>
                  )}
                  
                  {showMenu && activeMessage && (
                    <div className="fixed bottom-0 left-0 right-0 dark:text-white text-black rounded-t-xl shadow-lg p-4 z-50">
                      <div className="flex flex-col gap-3">
                  
                        {activeMessage.text && (
                          <button>Edit</button>
                        )}
                  
                        <button>Copy</button>
                        <button>Delete</button>
                  
                        {activeMessage.status === "failed" && (
                          <button>Resend</button>
                        )}
                  
                      </div>
                    </div>
                  )}

                  {showMenu && (
                    <div
                      className="fixed inset-0 bg-black/30 z-40"
                      onClick={() => setShowMenu(false)}
                    />
                  )}

                  {/* STATUS */}
                  {isCurrentUser && (
                    <div className="text-[10px] text-right mt-1">
                      {msg.status === 'sending' && '⏳'}
                      {msg.status === 'failed' && (
                        <button
                          onClick={() => resendMessage?.(msg)}
                          className="text-red-400"
                        >
                          Retry
                        </button>
                      )}
                      {msg.status === 'sent' && '✓'}
                      {msg.status === 'delivered' && '✓✓'}
                      {msg.status === 'read' && '✓✓'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      {/* anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
}

function AudioBubble({ url, isMe }: { url: string; isMe: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (audioRef.current.paused) {
      audioRef.current.play();
      setPlaying(true);
    } else {
      audioRef.current.pause();
      setPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;

    const p =
      audioRef.current.currentTime /
      audioRef.current.duration;

    setProgress(isNaN(p) ? 0 : p);
  };

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-full max-w-xs ${
        isMe ? "bg-green-500 text-white" : "bg-gray-300"
      }`}
    >
      {/* ▶️ PLAY BUTTON */}
      <button onClick={togglePlay}>
        {playing ? "⏸" : "▶️"}
      </button>

      {/* 📊 WAVEFORM */}
      <AudioWaveform progress={progress} />

      {/* 🎚 SEEK */}
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={progress}
        onChange={(e) => {
          if (!audioRef.current) return;

          const val = Number(e.target.value);
          audioRef.current.currentTime =
            val * audioRef.current.duration;

          setProgress(val);
        }}
        className="w-20"
      />

      {/* 🔊 AUDIO */}
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setPlaying(false)}
      />
    </div>
  );
}

const formatMessageDate = (dateStr?: string) => {
  if (!dateStr) return "";

  const date = new Date(dateStr);
  const now = new Date();

  const diffDays =
    Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";

  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
  });
};