'use client';

import {
  Send,
  Mic,
  X,
  Plus,
  Sticker,
  Search,
  Keyboard,
  File,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import MediaPickerSheet from "@/components/chat/MediaPickerSheet";
import CaptionBar from "@/components/chat/CaptionBar";
import PreviewViewer from  "@/components/chat/PreviewViewer";
import { useChatInputState } from "@/utils/chat/useChatInputState";

import EmojiSection from '@/components/chat/EmojiSection';
import GifSection from '@/components/chat/GifSection';
import StickerSection from '@/components/chat/StickerSection';
import AttachmentSection from '@/components/chat/AttachmentSection';
import CameraCaptureModal
from '@/components/CameraCaptureModal';
import EmojiPicker from 'emoji-picker-react';

import { useRef, useEffect, useState } from 'react';

type ReplyData = {
  id: number;
  username: string;
  text?: string;
};

type Props = {
  value: string;

  onChange: (v: string) => void;
  chatId: number;
  handleTyping?: (v: string) => void;
  saveDraftLocal: (v: string) => void;

  onSend: () => void;

  onFileSelect: (file: File) => void;

  disabled?: boolean;

  replyingTo?: ReplyData | null;

  onCancelReply?: () => void;

  // 🎤 Voice recording
  isRecording?: boolean;

  onMicStart?: (e: any) => void;

  onMicMove?: (e: any) => void;

  onMicEnd?: () => void;
  
  showDrawer: boolean;
  setShowDrawer: (v: boolean) => void;
  setDrawerMode: (
    v:
      | "plus"
      | "emoji"
      | "gif"
      | "stickers"
      | null
  ) => void;
  
  selectedFiles: File[]
  showMediaPicker: boolean
  showCaptionBar: boolean 
  previewIndex: number | null  
};

type InputMode =
  | "keyboard"
  | "emoji"
  | "gif"
  | "stickers"
  | "plus";

export default function ChatInput({
  value,
  onChange,
  chatId,
  handleTyping,
  saveDraftLocal,
  onSend,
  onFileSelect,
  disabled,
  replyingTo,
  onCancelReply,
  setDrawerMode,
  isRecording,
  onMicStart,
  onMicMove,
  onMicEnd,
  showDrawer,
  setShowDrawer,
  drawerMode,
}: Props) {

  const GIPHY_KEY = process.env.NEXT_PUBLIC_GIPHY_KEY!;
  const fileRef =
    useRef<HTMLInputElement | null>(null);
  const [showCamera, setShowCamera] =
  useState(false);
  const media = useChatInputState();

  const [capturedImage, setCapturedImage] =
  useState<string | null>(null);

  const textRef =
    useRef<HTMLTextAreaElement | null>(null);
  
  const isActiveTab = (tab: string) =>
  drawerMode === tab;
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
  const [inputMode, setInputMode] = useState<InputMode>("keyboard");
  const cursorRef = useRef<number>(0);

  const [dragY, setDragY] = useState(0);
  const startY = useRef(0);
  const isDragging = useRef(false);
  
  const [gifQuery, setGifQuery] = useState("");
  const [stickerQuery, setStickerQuery] = useState("");
  const [stickers, setStickers] = useState<any[]>([]);
  const [gifs, setGifs] = useState<any[]>([]);
  const [loadingGifs, setLoadingGifs] = useState(false);

  const activeQuery =
    drawerMode === "gif"
      ? gifQuery
      : drawerMode === "stickers"
      ? stickerQuery
      : "";

  useEffect(() => {
    if (!textRef.current) return;

    textRef.current.style.height = 'auto';

    textRef.current.style.height =
      Math.min(
        textRef.current.scrollHeight,
        100
      ) + 'px';

  }, [value]);
  
  useEffect(() => {
    if (drawerMode !== "gif") return;
  
    const fetchGifsData = async () => {
      setLoadingGifs(true);
  
      const res = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${gifQuery}&limit=20`
      );
  
      const data = await res.json();
      setGifs(data.data || []);
      setLoadingGifs(false);
    };
  
    fetchGifsData();
  }, [gifQuery, drawerMode]);
  
  useEffect(() => {
    if (drawerMode !== "stickers") return;
  
    const fetchStickersData = async () => {
      const res = await fetch(
        `https://api.giphy.com/v1/stickers/search?api_key=${GIPHY_KEY}&q=${stickerQuery}&limit=20`
      );
  
      const data = await res.json();
      setStickers(data.data || []);
    };
  
    fetchStickersData();
  }, [stickerQuery, drawerMode]);
  
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
    <div className="fixed bottom-0 left-0 right-0 md:left-64 flex flex-col z-50">

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
                dark:bg-[#111b21] order-2 bg-gray-300
                z-40 relative
              "
            >
      
              {/* HANDLE */}
              <div className="pt-2 pb-3 flex justify-center">
                <div className="w-14 h-1.5 rounded-full bg-gray-100 dark:bg-gray-600" />
              </div>
              
              {/* SEARCH */}
              <div className="flex items-center gap-2 mx-5 bg-gray-200 dark:bg-[#202c33] rounded-xl px-3 py-2 mb-2">
                <Search size={18} className="text-gray-400" />
            
                <input
                  value={
                    drawerMode === "gif"
                      ? gifQuery
                      : stickerQuery
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                  
                    if (drawerMode === "gif") {
                      setGifQuery(val);
                    } else if (drawerMode === "stickers") {
                      setStickerQuery(val);
                    }
                  }}
                  placeholder="Search GIFs or stickers"
                  className="
                    bg-transparent
                    outline-none
                    text-sm text-gray-700
                    dark:text-white
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
                          : "bg-yellow-500 dark:bg-yellow-500/20"
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
                          : "text-gray-700 dark:text-gray-300"
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
                          : "bg-green-500 dark:bg-green-500/20"
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
                          : "text-gray-700 dark:text-gray-300"
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
                          : "bg-red-500 dark:bg-red-500/20"
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
                          : "text-gray-700 dark:text-gray-300"
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
                      onChange(""); // optional clear text
            
                      console.log("SENDING PAYLOAD:", {
                        media_type: "gif",
                        media_source: "external",
                        media_url: gif.images.original.url,
                      });

                      onSend({
                        media_type: "gif",
                        media_source: "external",
                        media_url: gif.images.original.url,
                      });
                    
                      closeDrawer();
                    }}
                  />
                )}
              
                {drawerMode === 'stickers' && (
                  <StickerSection
                    query={gifQuery}
                    onStickerSelect={(sticker) => {
                      onSend({
                        media_type: "sticker",
                        media_source: "external",
                        media_url: sticker.images.original.url,
                      });
                    
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
                      media.setShowMediaPicker(true);
                    }}
                  />
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    
      {/* INPUT BAR */}
      <div className="bg-gray-300 dark:bg-[#111b21] border-b z-50 order-1 border-gray-800">
        <div className="flex items-end gap-2 px-3 py-2">
    
          {/* ATTACH */}
          <button
            className="p-2 text-gray-700 rounded-full dark:text-gray-300 hover:bg-[#202c33]"
            onClick={() => {
              if (showDrawer) {
                closeDrawer();
              } else {
                setDrawerMode("plus");
                setShowDrawer(true);
                setInputMode("plus");
              }
            }}
          >
            {selectedFiles.length > 0 ? (
              <div
                onClick={() => setPreviewIndex(0)}
                className="relative w-8 h-8 rounded-md overflow-hidden bg-gray-700"
              >
                <img
                  src={URL.createObjectURL(selectedFiles[0])}
                  className="w-full h-full object-cover"
                />
          
                {selectedFiles.length > 1 && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-xs text-white font-bold">
                    {selectedFiles.length}
                  </div>
                )}
              </div>
            ) : showDrawer ? (
              <Keyboard size={20} />
            ) : (
              <Plus size={20} />
            )}
          </button>
  
          <input
            ref={fileRef}
            type="file"
            hidden
            multiple
            accept="image/*,video/*"
            onChange={(e) => {
              const files = e.target.files;
          
              if (!files) return;
          
              Array.from(files).forEach((file) => {
                onFileSelect(file);
              });
            }}
          />

          {/* INPUT CONTAINER */}
          <div className="flex-1 bg-gray-200 dark:bg-[#202c33] rounded-2xl overflow-hidden">
  
            {/* REPLY PREVIEW */}
            <div
              className={`
                transition-all duration-300 overflow-hidden
                ${
                  replyingTo
                    ? 'max-h-24 opacity-100'
                    : 'max-h-0 opacity-0'
                }
              `}
            >
              {replyingTo && (
                <div className="flex items-start gap-2 px-3 pt-3 pb-2 border-l-4 border-green-500 bg-gray-100 dark:bg-[#182229]">
  
                  <div className="flex-1 overflow-hidden">
  
                    <p className="text-xs text-gray-900 dark:text-green-400 font-semibold">
                      ↩ Replying to {replyingTo.username}
                    </p>
  
                    <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
                      {replyingTo.text}
                    </p>
  
                  </div>
  
                  <button
                    onClick={onCancelReply}
                    className="text-gray-400 hover:text-white"
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
              onChange={(e) => {
                const val = e.target.value;
              
                onChange(val);
              
                handleTyping?.(val);
              
                saveDraftLocal?.(val);
              }}
              onSelect={(e) => {
                cursorRef.current = e.currentTarget.selectionStart;
              }}
              
              onClick={(e) => {
                cursorRef.current = e.currentTarget.selectionStart;
              }}
              
              onKeyUp={(e) => {
                cursorRef.current = e.currentTarget.selectionStart;
              }}
              placeholder="Message"
              disabled={disabled}
              rows={1}
              className="
                w-full
                px-4
                py-3
                bg-transparent
                text-gray-700
                dark:text-white
                outline-none
                resize-none
                max-h-32
                overflow-y-auto
              "
            />
  
          </div>
  
          {/* MIC */}
          <button
            onMouseDown={onMicStart}
            onMouseMove={onMicMove}
            onMouseUp={onMicEnd}
          
            onTouchStart={onMicStart}
            onTouchMove={onMicMove}
            onTouchEnd={onMicEnd}
          
            className={`
              p-2
              rounded-full
              transition
              ${
                isRecording
                  ? 'bg-red-600 text-white scale-110'
                  : 'text-gray-800 dark:text-gray-300 dark:hover:bg-[#202c33]'
              }
            `}
          >
            <Mic size={20} />
          </button>
  
          {/* SEND */}
          <button
            onClick={onSend}
            disabled={!value.trim()}
            className="
              p-3
              rounded-full
              bg-indigo-600
              disabled:opacity-50
              text-white
            "
          >
            <Send size={18} />
          </button>
    
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
      
      {media.showMediaPicker && (
        <MediaPickerSheet {...media} />
      )}
      
      {media.showCaptionBar && (
        <CaptionBar
          selectedFiles={media.selectedFiles}
          value={value}
          onChange={onChange}
          setPreviewIndex={media.setPreviewIndex}
          onSend={onSend}
        />
      )}
      
      <PreviewViewer
        files={media.selectedFiles}
        index={media.previewIndex}
        setIndex={media.setPreviewIndex}
        onClose={() => media.setPreviewIndex(null)}
      />

    </div>
  );
}