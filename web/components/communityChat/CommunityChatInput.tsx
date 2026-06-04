'use client';

import {
  Send,
  Paperclip,
  Mic,
  X,
  Keyboard,
  File,
  Camera,
  Sticker,
  Search,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EmojiSection from '@/components/chat/EmojiSection';
import GifSection from '@/components/chat/GifSection';
import StickerSection from '@/components/chat/StickerSection';
import CameraCaptureModal
from '@/components/CameraCaptureModal';

import { useRef, useEffect, useState } from 'react';

type ReplyData = {
  id: number;
  username: string;
  text?: string;
};

type InputMode =
  | "keyboard"
  | "emoji"
  | "gif"
  | "stickers"
  | "plus";

type Props = {
  value: string;

  onChange: (v: string) => void;

  onSend: () => void;

  onFileSelect: (file: File) => void;

  disabled?: boolean;

  replyingTo?: ReplyData | null;

  onCancelReply?: () => void;
};

export default function CommunityChatInput({
  value,
  onChange,
  onSend,
  onFileSelect,
  disabled,
  replyingTo,
  onCancelReply,
}: Props) {

  const GIPHY_KEY = process.env.NEXT_PUBLIC_GIPHY_KEY!;
  const fileRef =
    useRef<HTMLInputElement | null>(null);
  
  const isActiveTab = (tab: string) =>
  drawerMode === tab;
  const [inputMode, setInputMode] = useState<InputMode>("keyboard");
  const cursorRef = useRef<number>(0);

  const [dragY, setDragY] = useState(0);
  const startY = useRef(0);
  const isDragging = useRef(false);
  
  const [showDrawer, setShowDrawer] = useState(false);
  const [gifQuery, setGifQuery] = useState("");
  const [gifs, setGifs] = useState<any[]>([]);
  const [loadingGifs, setLoadingGifs] = useState(false);

  const [drawerMode, setDrawerMode] = useState<
    'emoji' | 'gif' | 'stickers' | 'plus' | null
  >(null);
  
  const [showCamera, setShowCamera] =
  useState(false);

  const [capturedImage, setCapturedImage] =
  useState<string | null>(null);

  const textRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!textRef.current) return;
  
    textRef.current.style.height = 'auto';
    textRef.current.style.height =
      Math.min(textRef.current.scrollHeight, 100) + 'px';
  }, [value]);
  
   const fetchGifs = async (query = "trending") => {
    try {
      setLoadingGifs(true);
  
      const res = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${query}&limit=20`
      );
  
      const data = await res.json();
      setGifs(data.data);
    } catch (err) {
      console.log("GIF error:", err);
    } finally {
      setLoadingGifs(false);
    }
  };
  
  useEffect(() => {
    if (drawerMode === "gif") {
      fetchGifs();
    }
  }, [drawerMode]);
  
  const fetchStickers = async (query = "stickers") => {
    const res = await fetch(
      `https://api.giphy.com/v1/stickers/search?api_key=${GIPHY_KEY}&q=${query}&limit=20`
    );
  
    const data = await res.json();
    return data.data;
  };
  
  const onTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    isDragging.current = true;
  };
  
  const onTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
  
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
  
    if (diff > 0) {
      setDragY(diff);
    }
  };
  
  const onTouchEnd = () => {
    isDragging.current = false;
  
    if (dragY > 120) {
      setShowDrawer(false);
      setDrawerMode(null);
    }
  
    setDragY(0);
  };
  
  const insertEmoji = (emoji: string) => {
    const start = value.slice(0, cursorRef.current);
    const end = value.slice(cursorRef.current);
  
    const newValue = start + emoji + end;
  
    onChange(newValue);
  
    setTimeout(() => {
      const pos = cursorRef.current + emoji.length;
      textRef.current?.setSelectionRange(pos, pos);
      textRef.current?.focus();
    }, 0);
  };
  
  const closeDrawer = () => {
    setShowDrawer(false);
    setDrawerMode(null);
    setInputMode("keyboard");
  
    document.body.style.overflow = "auto";
  
    setTimeout(() => {
      textRef.current?.focus();
    }, 80);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-[#111b21] border-t border-gray-800 flex flex-col z-50">
  
      {/* EXPANDABLE DRAWER */}
      <AnimatePresence>
        {showDrawer && (
          <>
            {/* BACKDROP */}
            <div
              className="fixed inset-0 bg-black/40 z-30"
              onClick={() => {
                setShowDrawer(false);
                setDrawerMode(null);
              }}
            />

            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 340 }}
              exit={{ height: 0 }}
              transition={{
                type: "spring",
                damping: 24,
                stiffness: 240,
              }}
              style={{
                transform: `translateY(${dragY}px)`,
              }}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              className="
                flex flex-col
                overflow-hidden
                bg-[#111b21] order-2
                z-40 relative
              "
            >
      
              {/* HANDLE */}
              <div className="pt-2 pb-3 flex justify-center">
                <div className="w-14 h-1.5 rounded-full bg-gray-600" />
              </div>
              
              {/* SEARCH */}
              <div className="flex items-center gap-2 mx-5 bg-[#202c33] rounded-xl px-3 py-2 mb-2">
                <Search size={18} className="text-gray-400" />
            
                <input
                  value={gifQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    setGifQuery(val);
                
                    if (val.trim().length > 2) {
                      fetchGifs(val);
                    }
                  }}
                  placeholder="Search GIFs or stickers"
                  className="
                    bg-transparent
                    outline-none
                    text-sm
                    text-white
                    flex-1
                  "
                />
              </div>
      
              {/* HEADER */}
              <div className="flex items-center justify-center gap-4 px-4 pb-3 overflow-x-auto">
  
                <button
                  onClick={() => {
                    if (!showDrawer) setShowDrawer(true);
                    setDrawerMode("emoji");
                  }}
                  className={`
                    flex flex-col items-center gap-2
                    px-2 py-1 rounded-xl transition
                    ${
                      isActiveTab("emoji")
                        ? "bg-indigo-600/20"
                        : "bg-transparent"
                    }
                  `}
                >
                  <div
                    className={`
                      w-10 h-10 rounded-2xl flex items-center justify-center
                      ${
                        isActiveTab("emoji")
                          ? "bg-indigo-600"
                          : "bg-yellow-500/20"
                      }
                    `}
                  >
                    😊
                  </div>
                
                  <span
                    className={`
                      text-xs
                      ${
                        isActiveTab("emoji")
                          ? "text-white"
                          : "text-gray-300"
                      }
                    `}
                  >
                    Emoji
                  </span>
                </button>
      
                <button
                  onClick={() => {
                    setShowDrawer(true);
                    setDrawerMode("gif");
                  }}
                  
                  className={`
                    flex flex-col items-center gap-2
                    px-2 py-1 rounded-xl transition
                    ${
                      isActiveTab("gif")
                        ? "bg-indigo-600/20"
                        : "bg-transparent"
                    }
                  `}
                >
                  <div
                    className={`
                      w-10 h-10 rounded-2xl flex items-center justify-center
                      ${
                        isActiveTab("gif")
                          ? "bg-indigo-600"
                          : "bg-green-500/20"
                      }
                    `}
                  >
                    <File size={16} />
                  </div>
                
                  <span
                    className={`
                      text-xs
                      ${
                        isActiveTab("gif")
                          ? "text-white"
                          : "text-gray-300"
                      }
                    `}
                  >
                    GIFs
                  </span>
                </button>
      
                <button
                  onClick={() => {
                    setShowDrawer(true);
                    setDrawerMode("stickers");
                  }}
                  className={`
                    flex flex-col items-center gap-2
                    px-2 py-1 rounded-xl transition
                    ${
                      isActiveTab("stickers")
                        ? "bg-indigo-600/20"
                        : "bg-transparent"
                    }
                  `}
                >
                  <div
                    className={`
                      w-10 h-10 rounded-2xl flex items-center justify-center
                      ${
                        isActiveTab("stickers")
                          ? "bg-indigo-600"
                          : "bg-red-500/20"
                      }
                    `}
                  >
                    <Sticker size={14} />
                  </div>
                
                  <span
                    className={`
                      text-xs
                      ${
                        isActiveTab("stickers")
                          ? "text-white"
                          : "text-gray-300"
                      }
                    `}
                  >
                    Stickers
                  </span>
                </button>
              </div>
      
              {/* SCROLLABLE CONTENT */}
              <div className="flex-1 min-h-0 overflow-hidden px-2 pb-2">

                {drawerMode === 'emoji' && (
                  <EmojiSection
                    onEmojiSelect={insertEmoji}
                  />
                )}
              
                {drawerMode === 'gif' && (
                  <GifSection
                    query={gifQuery}
                    onGifSelect={(gif) => {
                      console.log(gif);
              
                      closeDrawer();
                    }}
                  />
                )}
              
                {drawerMode === 'stickers' && (
                  <StickerSection
                    query={gifQuery}
                    onStickerSelect={(sticker) => {
                      console.log(sticker);
              
                      closeDrawer();
                    }}
                  />
                )}
              
                 {drawerMode === 'plus' && (
                  <AttachmentSection
                    onCamera={() => {
                      setShowDrawer(false);
                      setShowCamera(true);
                    }}
                    onMedia={() => {
                      fileRef.current?.click();
                    }}
                  />
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="w-full z-50 flex flex-col">
    
        {/* REPLY PREVIEW */}
        
    
        {/* INPUT BAR */}
        <div className="w-full flex gap-2 items-end px-3 py-2 order-1 transition-all duration-300">
    
          <button
            className="p-2 rounded-full text-gray-300 hover:bg-[#202c33]"
            onClick={() => {
              if (showDrawer) {
                setShowDrawer(false);
                setDrawerMode(null);
              } else {
                setShowDrawer(true);
                setDrawerMode('emoji');
              }
            }}
          >
            {showDrawer ? (
              <Keyboard size={20} />
            ) : (
              <span className="text-xl">😊</span>
            )}
          </button>
  
          {!value.trim() && (
            <button
              onClick={() => fileRef.current?.click()}
              className="p-2 rounded-full hover:bg-gray-800 text-gray-300 self-end"
            >
              <Paperclip size={20} />
            </button>
          )}
    
          <input
            ref={fileRef}
            type="file"
            hidden
            multiple
            accept="image/*,video/*,audio/*"
            onChange={(e) => {
              const files = e.target.files;
          
              if (!files) return;
          
              Array.from(files).forEach((file) => {
                onFileSelect(file);
              });
            }}
          />
    
          {/* TEXTAREA EXPANDS FULLY */}
          <div className="flex-1 bg-[#202c33] rounded-2xl overflow-hidden relative">

            {/* REPLY PREVIEW */}
            <div
              className={`
                overflow-hidden transition-all duration-300
                ${
                  replyingTo
                    ? 'max-h-24 opacity-100'
                    : 'max-h-0 opacity-0'
                }
              `}
            >
              {replyingTo && (
                <div className="flex items-start gap-2 px-3 pt-3 pb-2 border-l-4 border-green-500 bg-[#182229]">
          
                  <div className="flex-1 overflow-hidden">
                    <p className="text-xs text-green-400 font-semibold">
                      ↩ Replying to {replyingTo.username}
                    </p>
          
                    <p className="text-xs text-gray-300 truncate">
                      {replyingTo.text}
                    </p>
                  </div>
          
                  <button
                    onClick={onCancelReply}
                    className="text-gray-400"
                  >
                    <X size={16} />
                  </button>
          
                </div>
              )}
            </div>
          
            {/* TEXTAREA */}
            <textarea
              ref={textRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={
                disabled
                  ? 'Chat locked'
                  : 'Message'
              }
              
              onSelect={(e) => {
                cursorRef.current = e.currentTarget.selectionStart;
              }}
              
              onClick={(e) => {
                cursorRef.current = e.currentTarget.selectionStart;
              }}
              disabled={disabled}
              rows={1}
              className="
                w-full
                bg-[#202c33]
                px-4
                pr-12
                py-3
                bg-transparent
                text-white
                outline-none
                resize-none
                max-h-32
                overflow-y-auto
              "
            />
  
            {!value.trim() && (
              <button
                onClick={() => setShowCamera(true)}
                className="
                  absolute
                  right-3
                  bottom-4
                  text-gray-400
                "
              >
                <Camera size={20} />
              </button>
            )}
          </div>
    
          {value.trim() ? (
            <button
              onClick={onSend}
              disabled={disabled}
              className="
                p-3
                rounded-full
                bg-indigo-600
                text-white
              "
            >
              <Send size={18} />
            </button>
          ) : (
            <button
              className="
                p-2
                rounded-full
                hover:bg-gray-800
                text-gray-300
                self-end
              "
            >
              <Mic size={20} />
            </button>
          )}
    
        </div>
      </div>
  
      {showCamera && (
        <CameraCaptureModal
          onClose={() => {
            setShowCamera(false);
            setCapturedImage(null);
          }}
      
          onCapture={(file) => {
            onFileSelect(file);
      
            setShowCamera(false);
            setCapturedImage(null);
          }}
        />
      )}
    </div>
  );
}