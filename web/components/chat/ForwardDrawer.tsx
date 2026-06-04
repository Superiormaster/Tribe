'use client';

import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
              <div className="flex gap-2 overflow-x-auto mb-3">
                {selectedMessages.map(msg => (
                  <div
                    key={getMessageKey(msg)}
                    className="
                      text-xs
                      bg-gray-200
                      dark:bg-gray-700
                      px-2 py-1
                      rounded
                      whitespace-nowrap
                    "
                  >
                    {msg.text?.slice(0, 20) || 'media'}
                  </div>
                ))}
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