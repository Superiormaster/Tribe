'use client';

import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

type User = {
  id: number;
  username: string;
  avatar?: string;
};

type Props = {
  open: boolean;
  users: User[];
  chatUser?: User | null;

  selectedUsers: Set<number>;
  setSelectedUsers: React.Dispatch<
    React.SetStateAction<Set<number>>
  >;
  forwardCaption: string;
  setForwardCaption:
    React.Dispatch<
      React.SetStateAction<string>
    >;

  selectedMessages: any[];
  getMessageKey: (msg: any) => string;

  onClose: () => void;
  onSend: () => void;
};

export default function ForwardDrawer({
  open,
  users,
  chatUser,
  selectedUsers,
  setSelectedUsers,
  selectedMessages,
  getMessageKey,
  forwardCaption,
  setForwardCaption,
  onClose,
  onSend,
}: Props) {
  const toggleUser = (id: number) => {
    setSelectedUsers(prev => {
      const next = new Set(prev);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  };
  
  const canAddCaption =
    selectedMessages.length === 1 &&
    (
      selectedMessages[0].media_type === "image" ||
      selectedMessages[0].media_type === "video"
    );
  
  const getPreview = (msg: any) => {
    const media = Array.isArray(msg.media_url)
      ? msg.media_url
      : typeof msg.media_url === "string"
      ? [msg.media_url]
      : [];
  
    const first = media[0];
  
    if (msg.text?.trim()) {
      return {
        type: "text",
        text: msg.text.slice(0, 30),
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
          thumb: msg.thumbnail || first,
        };
  
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
            {chatUser && (
              <>
                <div className="p-3">
                  <p className="text-xs text-gray-500 mb-2">
                    Current Chat
                  </p>

                  <div
                    onClick={() => toggleUser(chatUser.id)}
                    className={`
                      flex items-center gap-3
                      p-2 rounded-lg cursor-pointer
                      ${
                        selectedUsers.has(chatUser.id)
                          ? 'bg-indigo-100 dark:bg-indigo-900'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                      }
                    `}
                  >
                    {chatUser.avatar ? (
                      <img
                        src={chatUser.avatar}
                        className="w-10 h-10 rounded-full object-cover"
                        alt=""
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center text-white">
                        {chatUser.username
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                    )}

                    <span className="font-medium">
                      {chatUser.username}
                    </span>
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700" />
              </>
            )}

            {/* USERS */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {users.map(user => (
                <div
                  key={user.id}
                  onClick={() => toggleUser(user.id)}
                  className={`
                    flex items-center gap-3
                    p-2 rounded-lg
                    cursor-pointer transition
                    ${
                      selectedUsers.has(user.id)
                        ? 'bg-indigo-100 dark:bg-indigo-900'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    }
                  `}
                >
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      className="w-10 h-10 rounded-full object-cover"
                      alt=""
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center text-white">
                      {user.username
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                  )}

                  <span>{user.username}</span>
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
                disabled={!selectedUsers.size}
                className="
                  w-full
                  bg-indigo-600
                  text-white
                  py-2
                  rounded-lg
                  disabled:opacity-50
                "
              >
                Forward ({selectedUsers.size})
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}