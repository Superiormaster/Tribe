'use client';

import { Video, MoreVertical } from 'lucide-react';

type ChatUser = {
  id: number;
  username: string;
  avatar?: string;
  status?: string;
  last_seen?: string;
};

type Props = {
  chatUser: ChatUser | null;
  isTyping: boolean;
  isMuted: boolean;
  mutedUntil?: string | null;
  formatMutedUntil: (
    date?: string | null
  ) => string;
  onAudioCall: () => void;
  onVideoCall: () => void;
  formatLastSeen: (
    date?: string
  ) => string;
  onMore: () => void;
};

export default function ChatHeader({
  chatUser,
  isTyping,
  onAudioCall,
  onVideoCall,
  formatLastSeen,
  isMuted,
  mutedUntil,
  formatMutedUntil,
  onMore,
}: Props) {
  return (
    <div className="flex fixed top-0 left-0 right-0 z-50 text-gray-700 dark:text-gray-100 md:left-64 bg-white dark:bg-gray-900 gap-2 justify-between px-3 py-2 border-b">

      <div className="flex items-center gap-3">

        <button
          onClick={() => window.history.back()}
          className="text-xl  px-2"
        >
          ←
        </button>

        <div className="w-9 h-9 rounded-full relative overflow-hidden bg-gray-300 flex items-center justify-center">
          {chatUser?.avatar ? (
            <img
              src={chatUser.avatar}
              className="w-9 h-9 rounded-full object-cover"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs">
              {chatUser?.username?.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        <div className="flex flex-col">
          <span className="font-semibold">
            {chatUser?.username}
          </span>

          <div className="text-xs text-gray-500">
            {isTyping ? (
              <span>typing...</span>
            ) : chatUser?.status ===
              "online" ? (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-green-500">
                  online
                </span>
              </span>
            ) : (
              <span>
                {formatLastSeen(
                  chatUser?.last_seen
                )}
              </span>
            )}
          
            {isMuted && (
              <div className="text-[11px] text-gray-400">
                {mutedUntil
                  ? formatMutedUntil(
                      mutedUntil
                    )
                  : "Muted"}
              </div>
            )}
          </div>
        </div>

      </div>

      <div className="flex items-center gap-4 text-gray-600 dark:text-gray-300">

        {/*<button
          onClick={onAudioCall}
          className="hover:text-indigo-600"
        >
          📞
        </button>

        <button
          onClick={onVideoCall}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <Video size={20} />
        </button>*/}

        <div className="relative">
          <button
            onClick={onMore}
            className="hover:text-indigo-600 text-xl"
          >
            <MoreVertical size={20} />
          </button>
        </div>

      </div>

    </div>
  );
}