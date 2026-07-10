'use client';
import { useState, useEffect, useContext, useRef } from 'react';
import { UserContext } from './UserContext';
import { apiRequest } from '@/utils/api';
import { uploadToCloudinary } from '@/utils/cloudinary';
import { useCommunitySocket } from '@/lib/useCommunitySocket';
import { Phone, Video } from 'lucide-react';
import CommunityMessageBubbles from '@/components/communityChat/CommunityMessageBubble';
import CommunityPinnedBar from '@/components/communityChat/CommunityPinnedBar';
import CommunityChatInput from '@/components/communityChat/CommunityChatInput';
import CommunityMediaPreview from '@/components/communityChat/CommunityMediaPreview';

type ChatMessage = {
  id: number;

  text?: string;

  media_url?: string;
  media_type?: string;

  created_at: string;

  sender: number;

  sender_username: string;

  sender_avatar?: string;

  sender_role?: string;

  is_pinned?: boolean;

  deleted?: boolean;

  deleted_by_admin?: boolean;

  reactions?: any[];

  reply_to?: any;
};

type Props = {
  communityId: number;
};

export default function CommunityChat({ communityId }: Props) {
  const { user: currentUser } = useContext(UserContext);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [communityData, setCommunityData] = useState<any>(null);
  const [replyingTo, setReplyingTo] =
  useState<any>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [chatLocked, setChatLocked] = useState(false);
  const [typingUsers, setTypingUsers] =
  useState<any[]>([]);
  const [text, setText] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch messages periodically
  useEffect(() => {
    fetchMessages();
  }, [communityId]);
  
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
    socketRef,
    sendMessage,
    sendTyping,
    reactToMessage,
    deleteMessage,
    pinMessage,
  } = useCommunitySocket(
    communityId,
    setMessages,
    setTypingUsers,
    currentUser
  );

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const data = await apiRequest(`api/communities/${communityId}/chat/`);
      setMessages(data || []);
      scrollToBottom();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const pinnedMessages = messages.filter((m) => m.is_pinned);

  const scrollToMessage = (id: number) => {
    document.getElementById(`message-${id}`)?.scrollIntoView({
      behavior: 'smooth',
    });
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!text && !file) return;

    const temp = {
      id: Date.now(),
    
      text,
    
      created_at: new Date().toISOString(),
    
      sender: currentUser.id,
    
      sender_username: currentUser.username,
    
      sender_avatar: currentUser.avatar,
    
      sender_role: currentUser?.role || 'member',
    
      reactions: [],
    
      deleted: false,
    
      is_pinned: false,

      reply_to: replyingTo
        ? {
            id: replyingTo.id,
            username: replyingTo.username,
            text: replyingTo.text,
          }
        : null,
    };

    setMessages((prev) => [...prev, temp]);
    setText('');
    setFile(null);
    setPreview(null);
    setReplyingTo(null);

    sendMessage({
      text,
      sender: currentUser.id,
      sender_username:
        currentUser.username,
    
      sender_avatar:
        currentUser.avatar,
    
      sender_role:
        currentUser?.role || 'member',
    
      reply_to: replyingTo
        ? {
            id: replyingTo.id,
            username:
              replyingTo.username,
            text: replyingTo.text,
          }
        : null,
    });
  };

  const handleFile = (f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };
  
  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };
  
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
    if (ownerId !== currentUser.id && !isModerator()) return alert('Not authorized');
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
  
  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 overflow-hidden">
  
      {/* HEADER */}
      <div className="flex fixed top-0 left-0 right-0 md:left-64 bg-white dark:bg-gray-900 gap-3 justify-between px-3 py-2 border-b items-center z-40">
      
        {/* LEFT */}
        <div className="flex items-center gap-3">
      
          {/* Back button */}
          <button
            onClick={() => window.history.back()}
            className="text-xl px-2"
          >
            ←
          </button>
      
          {/* Community Avatar */}
          <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-300 flex items-center justify-center">
            {communityData?.cover_image ? (
              <img
                src={communityData.cover_image}
                className="w-9 h-9 object-cover"
              />
            ) : (
              <div className="text-xs font-bold text-white">
                {communityData?.name?.slice(0, 2)?.toUpperCase() || "CM"}
              </div>
            )}
          </div>
      
          {/* NAME + STATUS */}
          <div className="flex flex-col leading-tight">
            <span className="font-semibold">
              {communityData?.name || "Community"}
            </span>
      
            <span className="text-xs text-gray-500">
              {communityData?.members_count || 0} members • {onlineCount} online
            </span>
      
            {chatLocked && (
              <span className="text-xs text-red-500">
                locked
              </span>
            )}
          </div>
        </div>
      
        {/* RIGHT ACTIONS */}
        <div className="flex items-center gap-3">
      
          <button className="p-2 rounded-full bg-green-600 text-white">
            <Phone size={18} />
          </button>
      
          <button className="p-2 rounded-full bg-blue-600 text-white">
            <Video size={18} />
          </button>
      
          {isModerator && (
            <button
              onClick={toggleChatLock}
              className="p-2 rounded-full bg-gray-700 text-white"
            >
              🔒
            </button>
          )}
        </div>
      
      </div>
  
      {/* PINNED BAR */}
      <CommunityPinnedBar
        pinnedMessages={pinnedMessages}
        onJumpToMessage={scrollToMessage}
      />
  
      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto">
        <CommunityMessageBubbles
          messages={messages}
          currentUserId={currentUser.id}
          onDelete={(id, ownerId) =>
            handleDeleteMessage(id, ownerId)
          }
          onPin={togglepinMessage}
          isModerator={user?.role === 'moderator'}
          onReply={(message) => {
        
            setReplyingTo({
              id: message.id,
              username:
                message.sender_username,
              text: message.text,
            });
          }}
        />
        <div ref={chatEndRef} />
      </div>
  
      {/* PREVIEW */}
      <CommunityMediaPreview
        file={file}
        previewUrl={preview}
        onClear={() => {
          setFile(null);
          setPreview(null);
        }}
      />
  
      {/* INPUT */}
      <CommunityChatInput
        value={text}
        onChange={(value) => {
          setText(value);
        
          sendTyping();
        }}
        onSend={handleSend}
        onFileSelect={handleFile}
        disabled={chatLocked}
        replyingTo={replyingTo}
        onCancelReply={() =>
          setReplyingTo(null)
        }
      />
    </div>
  );
}