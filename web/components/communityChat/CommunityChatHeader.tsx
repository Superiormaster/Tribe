'use client';

import { Video, Pin, Phone, MoreVertical } from 'lucide-react';
import { formatCount } from '@/utils/formatCount';
import AppLink from "@/components/AppLink";
import { Community } from "@/utils/communityChatPage/community";

type Props = {
  communityData: Community | null;

  onlineCount: number;
  chatLocked: boolean;
  isTyping: boolean;
  typingCount?: number;
  typingUsers?: { username: string }[];

  onMore: () => void;
  onAudioCall?: () => void;
  onVideoCall?: () => void;
};

export default function CommunityChatHeader({
    communityData,
    onlineCount,
    chatLocked,
    isTyping,
    typingCount = 1,
    typingUsers = [],
    onMore,
    onAudioCall,
    onVideoCall,
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

        <AppLink
          href={`/main/community/${communityData?.id}`}
          prefetch={false}
        >
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
        </AppLink>

        <div className="flex flex-col leading-tight">
          <AppLink
            href={`/main/community/${communityData?.id}`}
            prefetch={false}
            className="font-semibold hover:underline"
          >
            {communityData?.name || "Community"}
          </AppLink>
      
          <div className="text-xs text-gray-500">
            {isTyping ? (
              <span>
                {typingUsers.length === 1
                ? `${typingUsers[0].username} is typing...`
                : `${typingUsers.length} people are typing...`}
              </span>
            ) : (
              <span className="text-xs text-gray-500">
                {formatCount(communityData?.members_count || 0)} members • {formatCount(onlineCount)} online
              </span>
            )}
          </div>
      
          {chatLocked && (
            <span className="text-xs text-red-500">
              <Pin />
            </span>
          )}
        </div>

      </div>

      <div className="flex items-center gap-4 text-gray-600 dark:text-gray-300">

        {/*<button
          onClick={onAudioCall}
          className="hover:text-indigo-600"
        >
          <Phone size={20} />
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