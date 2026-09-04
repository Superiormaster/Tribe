'use client';

import {
  Send,
  Mic,
  X,
  Plus,
  Keyboard,
  Reply,
  Lock,
  Camera,
} from 'lucide-react';
import { isNative } from "@/utils/usePlatform";
import ChatDrawer from "@/components/chat/ChatDrawer";
import { getVideoDuration } from "@/utils/chat/videoThumbnail";
import MediaPickerSheet from "@/components/chat/MediaPickerSheet";
import PreviewViewer from  "@/components/chat/PreviewViewer";
import { Message, ReplyMessage } from "@/utils/chat/messageContract";
import { useChatInputState } from "@/utils/chat/useChatInputState";
import CameraCaptureModal
from '@/components/CameraCaptureModal';

import { useRef, useEffect, useMemo, useState } from 'react';

type Props = {
  value: string;

  onChange: (v: string) => void;
  chatId: number;
  handleTyping?: (v: string) => void;
  saveDraftLocal: (v: string) => void;

  onSend: (payload?: any) => void;

  onFileSelect: (file: MediaFile) => void;

  disabled?: boolean;

  replyingTo?: ReplyMessage | null;

  onCancelReply?: () => void;

  // 🎤 Voice recording
  isRecording?: boolean;
  micPressed?: boolean;
  isLocked?: boolean;
  voiceState?: string;
  duration?: number;

  onMicStart?: (e: any) => void;

  onMicMove?: (e: any) => void;

  onMicEnd?: () => void;
  drag: {
    x: number;
    y: number;
  }
  
  showDrawer: boolean;
  setShowDrawer: (v: boolean) => void;
  drawerMode:
    | "plus"
    | "emoji"
    | "gif"
    | "stickers"
    | null;
  setDrawerMode: (
    v:
      | "plus"
      | "emoji"
      | "gif"
      | "stickers"
      | null
  ) => void;
  
  showMediaPicker?: boolean
  showCaptionBar?: boolean 
  previewIndex: number | null  
  
  selectedFiles: MediaFile[];
  files: MediaFile[];
  setSelectedFiles: React.Dispatch<
    React.SetStateAction<MediaFile[]>
  >;
  
  index?: number;
  setIndex?: React.Dispatch<React.SetStateAction<number>>;
  onClose?: () => void;
  
  setPreviewIndex: React.Dispatch<
    React.SetStateAction<number | null>
  >;
};

type InputMode =
  | "keyboard"
  | "emoji"
  | "gif"
  | "stickers"
  | "plus";

export interface MediaFile extends File {
  thumbnail?: string;
  duration?: number;
  preview?: string;
}

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
  drag,
  selectedFiles,
  setSelectedFiles,
  previewIndex,
  setPreviewIndex,
  setDrawerMode,
  isRecording,
  micPressed,
  isLocked,
  duration,
  voiceState,
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
  const [showCamera, setShowCamera] = useState(false);
  const media = useChatInputState();

  const [capturedImage, setCapturedImage] =
  useState<string | null>(null);

  const textRef =
    useRef<HTMLTextAreaElement | null>(null);
  
  const isActiveTab = (tab: string) => drawerMode === tab;
  
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
  
  const canSend =
    value?.trim()?.length > 0 ||
    (selectedFiles?.length ?? 0) > 0;

  useEffect(() => {
    if (!textRef.current) return;

    textRef.current.style.height = 'auto';

    textRef.current.style.height =
      Math.min(
        textRef.current.scrollHeight,
        100
      ) + 'px';

  }, [value]);
  
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
  
    return `${m}:${s.toString().padStart(2, "0")}`;
  };
  
  const previewUrl = useMemo(() => {
    const file = selectedFiles?.[0];
  
    if (!file) return null;
  
    return (
      file.preview ??
      URL.createObjectURL(file)
    );
  }, [selectedFiles]);
  
  const handleFileSelect = (file: File) => {
    if (typeof onFileSelect === "function") {
      onFileSelect(file);
    } else {
      console.error("onFileSelect is not a function");
    }
  };
  
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
  
  const previewItems = useMemo(() => {
    return selectedFiles.map((file: MediaFile) => ({
      file,
      url:
        file.preview ||
        URL.createObjectURL(file),
      type: file.type.startsWith("video/")
        ? "video"
        : "image",
    }));
  }, [selectedFiles]);
  
  const getReplyPreview = (reply: any) => {
    if (reply.encrypted_text) {
      return {
        type: "text",
        text: reply.encrypted_text,
      };
    }
  
    switch (reply.media_type) {
      case "image":
        return {
          type: "image",
          thumb: reply.media_url,
          text: reply.caption || "Photo",
        };
  
      case "video":
        return {
          type: "video",
          thumb: reply.thumbnail || reply.media_url,
          text: reply.caption || "Video",
        };
  
      case "gif":
        return {
          type: "gif",
          thumb: reply.media_url,
          text: "GIF",
        };
  
      case "sticker":
        return {
          type: "sticker",
          thumb: reply.media_url,
          text: "Sticker",
        };
  
      case "audio":
        return {
          type: "audio",
          text: "Voice message",
        };

      case "gallery": {
        const assets = Array.isArray(reply.media_assets)
          ? reply.media_assets
          : [];
      
        const media = Array.isArray(reply.media_url)
          ? reply.media_url
          : [];
      
        const items = assets.length
          ? assets
          : media.map((url: string, index: number) => ({
              original_url: url,
              media_type:
                reply.media_type === "video"
                  ? "video"
                  : reply.media_type === "audio"
                    ? "audio"
                    : "image",
            }));
      
        const images = items.filter(
          (item: any) =>
            item.content_type?.startsWith("image/") ||
            item.media_type === "image" ||
            !item.media_type
        ).length;
      
        const videos = items.filter(
          (item: any) =>
            item.content_type?.startsWith("video/") ||
            item.media_type === "video"
        ).length;
      
        let text = "Media";
      
        if (images > 0 && videos > 0) {
          text = `${images} photo${images > 1 ? "s" : ""}, ${videos} video${videos > 1 ? "s" : ""}`;
        } else if (images > 0) {
          text = `${images} photo${images > 1 ? "s" : ""}`;
        } else if (videos > 0) {
          text = `${videos} video${videos > 1 ? "s" : ""}`;
        }
      
        return {
          type: "gallery",
          thumb:
            assets[0]?.thumbnail_url ||
            assets[0]?.original_url ||
            media[0],
          text,
        };
      }
  
      default:
        return {
          type: "file",
          text: "Attachment",
        };
    }
  };
  
  const preview = replyingTo
    ? getReplyPreview(replyingTo)
    : null;
  
  const lockProgress =
    Math.min(
        Math.abs(drag.y)/120,
        1
    );
  
  const progress =
    Math.max(
        Math.abs(drag.x),
        Math.abs(drag.y)
    )/120;
  const p=Math.min(progress,1);
  
  const showRecorder =
    voiceState==="recording" ||
    voiceState==="locked";

  return (
    <div className="fixed bottom-0 left-0 right-0 md:left-64 flex flex-col z-50">

      <ChatDrawer
        showDrawer={showDrawer}
        setShowDrawer={setShowDrawer}
        drawerMode={drawerMode}
        setDrawerMode={setDrawerMode}
        dragY={dragY}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        gifQuery={gifQuery}
        stickerQuery={stickerQuery}
        setGifQuery={setGifQuery}
        setStickerQuery={setStickerQuery}
        onSend={onSend}
        onChange={onChange}
        insertEmoji={insertEmoji}
        closeDrawer={closeDrawer}
        isActiveTab={isActiveTab}
        media={media}
        isNative={isNative}
        fileRef={fileRef}
        setShowCamera={setShowCamera}
      />
    
      {/* INPUT BAR */}
      <div className="bg-gray-300 dark:bg-[#111b21] border-t z-50 order-1 border-gray-200 dark:border-gray-800">
        <div className="flex items-end gap-2 px-3 py-2">
    
          {/* ATTACH */}
          <button
            className="py-4 px-2 text-gray-700 rounded-full dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#202c33]"
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
                {selectedFiles.length > 0 && (
                  <div className="flex gap-1 w-8 h-8 rounded-md overflow-hidden bg-gray-700">
                    {previewItems[0].type === "video" ? (
                      <video
                        src={previewItems[0].url}
                        className="w-full h-full object-cover"
                        muted
                      />
                    ) : (
                      <img
                        src={previewItems[0].url}
                        className="w-full h-full object-cover"
                      />
                    )}
                
                    {selectedFiles.length > 1 && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs">
                        +{selectedFiles.length}
                      </div>
                    )}
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
            onChange={async (e) => {
              const files = e.target.files;
              if (!files) return;
            
              for (const rawFile of Array.from(files)) {
                const file = rawFile as MediaFile;
              
                file.preview = URL.createObjectURL(file);

                if (file.type.startsWith("video/")) {
                  file.duration = await getVideoDuration(file);
                }
              
                onFileSelect(file);
              }
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
                <div className="flex items-start gap-2 px-3 pt-3 pb-2 border-l-4 border-indigo-500 bg-gray-100 dark:bg-[#182229]">
  
                  <div className="flex-1 overflow-hidden">
  
                    <p className="text-xs items-center flex text-gray-900 dark:text-indigo-400 font-semibold">
                      <Reply className="mr-2 w-5" />
                      Replying to{" "}
                      {replyingTo.sender_username ??
                        replyingTo.sender_info?.username ??
                        "Unknown"}
                    </p>
  
                    {preview?.thumb && (
                      <img
                        src={preview.thumb}
                        className="w-10 h-10 rounded object-cover"
                      />
                    )}
                    
                    <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
                      {preview?.text}
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
  
            {showRecorder && (
              <div
                className="
                  absolute
                  inset-0
                  flex
                  items-center
                  px-4
                  bg-white
                  dark:bg-[#202c33]
                  rounded-2xl
                  overflow-hidden
                "
              >
                {/* Counter */}
                <div className="flex items-center gap-2 min-w-[70px]">
                  <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            
                  <span className="dark:text-white text-gray-600 text-lg">
                    {formatTime(duration ?? 0)}
                  </span>
                </div>
            
                {/* Slide text */}
                {!isLocked && (
                  <div
                    className="flex-1 text-center text-gray-400 text-lg transition-all duration-75"
                    style={{
                      transform: `translateX(${drag.x}px)`,
                    }}
                  >
                    &lt; Slide to cancel
                  </div>
                )}
              </div>
            )}

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
              placeholder={
                selectedFiles.length > 0
                  ? "Add a caption..."
                  : "Message"
              }
              disabled={disabled}
              rows={1}
              className="
                w-full
                px-4
                py-3
                pr-12
                bg-transparent
                text-gray-700
                dark:text-white
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
                  right-24
                  bottom-6
                  text-gray-400
                "
              >
                <Camera size={20} />
              </button>
            )}
  
          </div>
          {canSend ? (
  
            <button
              onClick={() => {
                onSend({
                  encrypted_text: selectedFiles.length
                    ? ""
                    : value,
                  caption: selectedFiles.length
                    ? value
                    : "",
                  files: selectedFiles,
                  media_source: selectedFiles.length
                    ? "upload"
                    : null,
                });
              
                setSelectedFiles([]);
                setPreviewIndex(null);
                onChange("");
                setShowDrawer(false);
                setDrawerMode(null);
                setInputMode("keyboard");
              }}
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
            <div className="relative flex items-center justify-center w-14 h-14">
              {/* LOCK */}
              {voiceState === "recording" && (
                <div
                  className="
                    absolute
                    bottom-20
                    right-2
                    w-12
                    h-28
                    rounded-full
                    bg-white
                    dark:bg-[#202c33]
                    flex
                    items-start
                    justify-center
                    p-2
                    z-50
                  "
                >
                  <div
                    className="transition-all duration-150"
                    style={{
                      transform: `translateY(${
                        Math.max(drag.y, -80) + 80
                      }px)`
                    }}
                  >
                    <Lock
                      size={20}
                      className={
                        isLocked
                          ? "text-green-400"
                          : "text-gray-400"
                      }
                    />
                  </div>
                </div>
              )}
  
              {/* MIC BUTTON */}
              <button
                onMouseDown={onMicStart}
                onMouseMove={onMicMove}
                onMouseUp={onMicEnd}
                onTouchStart={onMicStart}
                onTouchMove={onMicMove}
                onTouchEnd={onMicEnd}
                className={`
                  rounded-full
                  flex z-50
                  items-center border
                  justify-center
                  transition-all
                  duration-200
                  shadow-xl
                  ${
                    micPressed
                      ? "bg-gray-500 text-gray-300 w-15 h-15"
                      : "bg-transparent text-gray-700 dark:text-gray-300 w-10 h-10"
                  }
                `}
                style={{
                  transform:`
                  translate(${drag.x}px,${drag.y}px)
                  scale(${1-0.4*p})
                  `,
                  opacity:1-p,
                  transition: micPressed ? "none" : "all 0.15s ease",
                }}
              >
                <Mic
                  size={micPressed ? 30 : 20}
                />
              </button>
            </div>
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
            handleFileSelect(file);
            setShowCamera(false);
          }}
        />
      )}
      
      {media.showMediaPicker && (
        <MediaPickerSheet {...media} />
      )}
      
      {previewIndex !== null && (
        <PreviewViewer
          files={selectedFiles}
          index={previewIndex}
          setIndex={setPreviewIndex}
          onClose={() => setPreviewIndex(null)}
          onAddFiles={(newFiles: MediaFile[]) => {
            setSelectedFiles(prev => [
              ...prev,
              ...newFiles,
            ]);
          }}
          onDelete={(index: number) => {
            setSelectedFiles(prev => {
              const next = prev.filter((_, i) => i !== index);
          
              if (next.length === 0) {
                setPreviewIndex(null);
              } else if (previewIndex !== null && previewIndex >= next.length) {
                setPreviewIndex(next.length - 1);
              }
          
              return next;
            });
          }}
        />
      )}

    </div>
  );
}