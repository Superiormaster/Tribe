'use client';

import { AnimatePresence, motion } from "framer-motion";
import { 
  Search,
  Sticker,
  File as FileIcon,
} from 'lucide-react';

import EmojiSection from "@/components/chat/EmojiSection";
import GifSection from "@/components/chat/GifSection";
import StickerSection from "@/components/chat/StickerSection";
import AttachmentSection from "@/components/chat/AttachmentSection";

type Props = {
  showDrawer: boolean;
  setShowDrawer: (v: boolean) => void;
  drawerMode: "emoji" | "gif" | "stickers" | "plus" | null;
  setDrawerMode: (v: any) => void;

  dragY: number;
  onTouchStart: (e: any) => void;
  onTouchMove: (e: any) => void;
  onTouchEnd: () => void;

  gifQuery: string;
  stickerQuery: string;
  setGifQuery: (v: string) => void;
  setStickerQuery: (v: string) => void;

  onSend: (payload: any) => void;
  onChange: (v: string) => void;
  insertEmoji: (emoji: string) => void;
  closeDrawer: () => void;

  isActiveTab: (tab: string) => boolean;
  media: any;
  isNative: boolean;
  fileRef: React.RefObject<HTMLInputElement | null>;
  setShowCamera: (v: boolean) => void;
};

export default function ChatDrawer({
  showDrawer,
  setShowDrawer,
  drawerMode,
  setDrawerMode,
  dragY,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  gifQuery,
  stickerQuery,
  setGifQuery,
  setStickerQuery,
  onSend,
  onChange,
  insertEmoji,
  closeDrawer,
  isActiveTab,
  media,
  isNative,
  fileRef,
  setShowCamera,
}: Props) {
  return (
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
            className="flex flex-col overflow-hidden dark:bg-[#111b21] bg-gray-300 z-40 relative"
          >
            {/* HANDLE */}
            <div className="pt-2 pb-3 flex justify-center">
              <div className="w-14 h-1.5 rounded-full bg-gray-100 dark:bg-gray-600" />
            </div>

            {/* SEARCH */}
            <div className="flex items-center gap-2 mx-5 bg-gray-200 dark:bg-[#202c33] rounded-xl px-3 py-2 mb-2">
              <Search size={18} className="text-gray-400" />
              <input
                value={drawerMode === "gif" ? gifQuery : stickerQuery}
                onChange={(e) => {
                  const val = e.target.value;
                  if (drawerMode === "gif") setGifQuery(val);
                  if (drawerMode === "stickers") setStickerQuery(val);
                }}
                placeholder="Search GIFs or stickers"
                className="bg-transparent text-gray-700 dark:text-white outline-none text-sm flex-1"
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
                  <FileIcon size={16} />
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

            {/* CONTENT */}
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
                    onChange(""); 

                    onSend({
                      media_type: "gif",
                      media_source: "external",
                      media_url: gif.images.original.url,
                      thumbnail:
                        gif.images.fixed_width_still.url ||
                        gif.images.original_still?.url ||
                        gif.images.preview_gif.url ||
                        gif.images.fixed_height_small_still.url,
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
                      thumbnail:
                        sticker.images.fixed_width_still?.url ||
                        sticker.images.fixed_width.url ||
                        sticker.images.preview_gif.url ||
                        sticker.images.original.url,
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
                    if (isNative) {
                      media.setShowMediaPicker(true);
                    } else {
                      fileRef.current?.click();
                    }
                  }}
                />
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}