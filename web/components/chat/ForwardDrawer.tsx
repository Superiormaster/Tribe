'use client';

import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import type{ ForwardDestination } from '@/hooks/useForwardMessages';

type Props = {
  open: boolean;
  currentDestination?: ForwardDestination;
  handleScroll: (
    e: React.UIEvent<HTMLDivElement>
  ) => void;

  forwardCaption: string;
  setForwardCaption:
    React.Dispatch<
      React.SetStateAction<string>
    >;

  destinations: ForwardDestination[];

  selectedDestinations: ForwardDestination[];

  setSelectedDestinations: React.Dispatch<
      React.SetStateAction<ForwardDestination[]>
  >;

  selectedMessages: any[];
  getMessageKey: (msg: any) => string;

  onClose: () => void;
  onSend: () => void;
};

export default function ForwardDrawer({
  open,
  destinations,
  handleScroll,
  currentDestination,
  selectedDestinations,
  setSelectedDestinations,
  selectedMessages = [],
  getMessageKey,
  forwardCaption,
  setForwardCaption,
  onClose,
  onSend,
}: Props) {
  const toggleDestination = (
    destination: ForwardDestination
  ) => {
    setSelectedDestinations(prev => {
        const exists = prev.some(
            d =>
                d.id === destination.id &&
                d.type === destination.type
        );

        if (exists) {
            return prev.filter(
                d =>
                    !(
                        d.id === destination.id &&
                        d.type === destination.type
                    )
            );
        }

        return [...prev, destination];
    });
  };
  
  const canAddCaption =
    selectedMessages.length === 1 &&
    (
      selectedMessages[0]?.media_type === "image" ||
      selectedMessages[0]?.media_type === "video" ||
      selectedMessages[0]?.media_type === "gallery"
    );
  
  const getPreview = (msg: any) => {
    const media = Array.isArray(msg.media_url)
      ? msg.media_url
      : typeof msg.media_url === "string"
      ? [msg.media_url]
      : [];
  
    const first = media[0];
  
    if (msg.text?.trim() || msg.encrypted_text?.trim()) {
      return {
        type: "text",
        text: (msg.text || msg.encrypted_text).slice(0, 30),
      };
    }
  
    switch (msg.media_type) {
      case "image":
        return {
          type: "image",
          thumb: first,
        };
  
      case "video":
        return {
          type: "video",
          thumb: Array.isArray(msg.thumbnail)
            ? msg.thumbnail[0]
            : msg.thumbnail || first,
        };
  
      case "gallery": {
        const images = media.filter((url: string) =>
          !/\.(mp4|mov|webm|mkv|avi)(\?|$)/i.test(url)
        ).length;
  
        const videos = media.length - images;
  
        let text = "";
  
        if (images && videos) {
          text = `${media.length} media`;
        } else if (images) {
          text = `${images} photo${images > 1 ? "s" : ""}`;
        } else if (videos) {
          text = `${videos} video${videos > 1 ? "s" : ""}`;
        } else {
          text = "Gallery";
        }
  
        return {
          type: "gallery",
          thumb: first,
          text,
        };
      }
  
      case "gif":
        return {
          type: "gif",
          thumb: first,
          text: "GIF",
        };
  
      case "sticker":
        return {
          type: "sticker",
          thumb: first,
          text: "Sticker",
        };
  
      case "audio":
        return {
          type: "audio",
          text: "🎤 Voice message",
        };
  
      default:
        return {
          type: "file",
          text: "Attachment",
        };
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="
            fixed inset-0
            bg-black/40
            flex justify-end
            z-[9999]
          "
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="
              w-full
              md:w-[420px]
              h-full
              bg-white
              dark:bg-gray-900
              flex flex-col
            "
            initial={{ x: 400 }}
            animate={{ x: 0 }}
            exit={{ x: 400 }}
          >
            <div
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-3 space-y-2"
            >
              {/* HEADER */}
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-semibold">
                  Forward To
                </h3>
  
                <button onClick={onClose}>
                  <X size={20} />
                </button>
              </div>
  
              {/* CURRENT CHAT */}
              {currentDestination && (
                <>
                  <div className="p-3">
                    <p className="text-xs text-gray-500 mb-2">
                      Current Chat
                    </p>
  
                    <div
                      onClick={() => toggleDestination(currentDestination)}
                      className={`
                        flex items-center gap-3
                        p-2 rounded-lg cursor-pointer
                        ${
                          selectedDestinations.some(
                        d =>
                            d.id === currentDestination.id &&
                            d.type === currentDestination.type
                      )
                            ? 'bg-indigo-100 dark:bg-indigo-900'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                        }
                      `}
                    >
                      {currentDestination.avatar ? (
                        <img
                            src={currentDestination.avatar}
                            className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center">
                            {currentDestination.type === "private" ? "👤" : "👥"}
                        </div>
                      )}
  
                      <span className="font-medium">
                        {currentDestination.name}
                      </span>
                      <p className="text-xs text-gray-500 mb-2">
                        {currentDestination.type === "private"
                            ? "Current Chat"
                            : "Current Community"}
                      </p>
                    </div>
                  </div>
  
                  <div className="border-t border-gray-200 dark:border-gray-700" />
                </>
              )}
  
              {/* USERS */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {destinations.map(destination => (
                  <div
                    key={`${destination.type}-${destination.id}`}
                    onClick={() => toggleDestination(destination)}
                    className={`
                        flex items-center gap-3 p-2 rounded-lg cursor-pointer
                        ${
                            selectedDestinations.some(
                                d =>
                                    d.id === destination.id &&
                                    d.type === destination.type
                            )
                                ? "bg-indigo-100 dark:bg-indigo-900"
                                : "hover:bg-gray-100 dark:hover:bg-gray-800"
                        }
                    `}
                >
                    {destination.avatar ? (
                      <img
                          src={destination.avatar}
                          className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      destination.type === "private" ? (
                          <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center">
                              👤
                          </div>
                      ) : (
                          <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center">
                              👥
                          </div>
                      )
                    )}
                
                    <div className="flex flex-col">
                        <span>{destination.name}</span>
                
                        <span className="text-xs text-gray-500">
                            {destination.type === "private"
                                ? "Private Chat"
                                : "Community"}
                        </span>
                    </div>
                  </div>
                ))}
              </div>
  
              {/* FOOTER */}
              <div className="border-t p-3">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex gap-2 overflow-x-auto">
                    {selectedMessages.map(msg => {
                      const preview = getPreview(msg);
                  
                      return (
                        <div
                          key={getMessageKey(msg)}
                          className="
                            flex items-center gap-2
                            bg-gray-200 dark:bg-gray-700
                            rounded-lg
                            px-2 py-2
                            shrink-0
                            max-w-[220px]
                          "
                        >
                          {(preview.type === "image" ||
                            preview.type === "video" ||
                            preview.type === "gallery" ||
                            preview.type === "gif" ||
                            preview.type === "sticker") &&
                            preview.thumb && (
                              <img
                                src={preview.thumb}
                                className="
                                  w-9 h-9
                                  rounded-lg
                                  object-cover
                                "
                              />
                            )}
                  
                          <span className="text-xs truncate">
                            {preview.text}
                          </span>
                        </div>
                      );
                    })}
                  </div>
    
                  {canAddCaption && (
                    <input
                      value={forwardCaption}
                      onChange={(e) =>
                        setForwardCaption(
                          e.target.value
                        )
                      }
                      placeholder="Add a message..."
                      className="
                        px-4 py-3 flex-1 min-w-0 rounded-full bg-gray-100 dark:bg-gray-800 outline-none
                      "
                    />
                  )}
                </div>
  
                <button
                  onClick={onSend}
                  disabled={selectedDestinations.length === 0}
                  className="
                    w-full
                    bg-indigo-600
                    text-white
                    py-2
                    rounded-lg
                    disabled:opacity-50
                  "
                >
                  Forward ({selectedDestinations.length})
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}