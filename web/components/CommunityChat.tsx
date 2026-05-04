'use client';
import { useState, useEffect, useContext, useRef } from 'react';
import { UserContext } from './UserContext';
import { apiRequest } from '@/utils/api';
import { Send as SendIcon, Mic, Video, Trash2, Lock, Pin } from 'lucide-react';

type ChatMessage = {
  id: number;
  userId: number;
  username: string;
  text?: string;
  image?: string;
  video?: string;
  audio?: string;
  created_at: string;
};

type Props = {
  communityId: number;
  user: any;
};

export default function CommunityChat({ communityId, user }: Props) {
  const { user: currentUser } = useContext(UserContext);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [chatLocked, setChatLocked] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch messages periodically
  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [communityId]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const data = await apiRequest(`/api/communities/${communityId}/chat/`);
      setMessages(data || []);
      scrollToBottom();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  // Send message with optional file
  const handleSendMessage = async () => {
    if (!newMessage.trim() && !file) return;

    const tempMessage: ChatMessage = {
      id: Date.now(),
      userId: currentUser.id,
      username: currentUser.username,
      text: newMessage || undefined,
      image: file?.type.startsWith('image') ? preview || undefined : undefined,
      video: file?.type.startsWith('video') ? preview || undefined : undefined,
      audio: file?.type.startsWith('audio') ? preview || undefined : undefined,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMessage]);
    setNewMessage('');
    setFile(null);
    setPreview(null);
    scrollToBottom();

    try {
      const formData = new FormData();
      if (newMessage.trim()) formData.append('text', newMessage);
      if (file) formData.append('file', file);

      await apiRequest(`/api/communities/${communityId}/chat/`, {
        method: 'POST',
        data: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } catch (err) {
      console.error(err);
      alert('Failed to send message.');
      setMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
    }
  };

  // Delete message (user or moderator)
  const handleDeleteMessage = async (messageId: number, ownerId: number) => {
    if (ownerId !== currentUser.id && !isModerator()) return alert('Not authorized');
    setMessages((prev) => prev.filter((m) => m.id !== messageId));

    try {
      await apiRequest(`/api/communities/${communityId}/chat/${messageId}/`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error(err);
      alert('Failed to delete message.');
    }
  };

  const isModerator = () => user?.role === 'moderator' || currentUser.id === user?.id;

  // Admin actions
  const toggleChatLock = async () => {
    setChatLocked(!chatLocked);
    // backend call to lock/unlock chat
    await apiRequest(`/api/communities/${communityId}/lock/`, {
      method: 'POST',
      data: { lock: !chatLocked },
    });
  };

  const scrollToMessage = (id: number) => {
    document.getElementById(`msg-${id}`)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col h-full border border-gray-300 dark:border-gray-700 rounded-xl p-2 bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex justify-between items-center mb-2 px-2">
        <h4 className="font-bold">Community Chat {chatLocked && '(Locked)'}</h4>
        <div className="flex gap-2">
          <button title="Voice Call" className="p-1 rounded bg-green-600 text-white"><Mic /></button>
          <button title="Video Call" className="p-1 rounded bg-blue-600 text-white"><Video /></button>
          {isModerator() && (
            <>
              <button onClick={toggleChatLock} title="Lock Chat" className="p-1 rounded bg-gray-600 text-white"><Lock /></button>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {loading && <div className="text-center text-gray-500">Loading messages...</div>}
        {messages.map((m) => (
          <div key={m.id} id={`msg-${m.id}`} className="flex justify-between items-start">
            <div className="flex flex-col">
              <span className="font-semibold">{m.username}</span>
              {m.text && <span>{m.text}</span>}
              {m.image && <img src={m.image} className="max-w-xs rounded-lg mt-1" alt="attachment" />}
              {m.video && <video src={m.video} controls className="max-w-xs rounded-lg mt-1" />}
              {m.audio && <audio src={m.audio} controls className="mt-1" />}
            </div>
            {(m.userId === currentUser.id || isModerator()) && (
              <button onClick={() => handleDeleteMessage(m.id, m.userId)} className="ml-2 text-red-600 p-1">
                <Trash2 />
              </button>
            )}
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="flex flex-col gap-2 mt-2">
        {preview && (
          <div className="relative">
            {file?.type.startsWith('image') && <img src={preview} className="w-32 h-32 object-cover rounded-lg" />}
            {file?.type.startsWith('video') && <video src={preview} className="w-48 h-32 rounded-lg" controls />}
            {file?.type.startsWith('audio') && <audio src={preview} controls />}
            <button onClick={() => { setFile(null); setPreview(null); }} className="absolute top-0 right-0 text-white bg-red-600 rounded-full p-1">X</button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            placeholder={chatLocked ? "Chat is locked" : "Write a message..."}
            disabled={chatLocked}
          />
          <input type="file" accept="image/*,video/*,audio/*" onChange={handleFileChange} />
          <button
            onClick={handleSendMessage}
            disabled={chatLocked || (!newMessage && !file)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center justify-center"
          >
            <SendIcon className="rotate-0" />
          </button>
        </div>
      </div>
    </div>
  );
}