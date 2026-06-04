'use client';

import { useState } from "react";
import { MoreVertical, Search } from "lucide-react";
import AppLink from '@/components/AppLink';

type Props = {
  community: any;
  membersCount: number;
  user: any;
  onJoin: () => void;
  onOpenMenu: () => void;
  communityId: string;
};

export default function CommunityHeader({
  community,
  membersCount,
  user,
  onJoin,
  onOpenMenu,
  communityId,
}: Props) {
  const [muted, setMuted] = useState(true);
  
  const handleJoin = async () => {
    try {
      await onJoin();
    } catch (err) {
      console.error(err);
    }
  };
  
  return (
    <div className="relative p-2 w-full rounded-xl overflow-hidden h-72">

      <button
        onClick={() => setMuted(prev => !prev)}
        className="absolute top-4 right-4 z-30 bg-black/50 text-white px-3 py-1 rounded-full text-xs"
      >
        {muted ? "🔊" : "🔇"}
      </button>
      {community.intro_video && (
        <video
          src={community.intro_video}
          className="absolute top-0 left-0 w-full h-full object-cover"
          autoPlay
          loop
          muted={muted}
          playsInline
        />
      )}

      <div className="absolute inset-0 bg-black/30" />

      <div className="absolute top-4 left-4 w-24 h-24 rounded-full overflow-hidden border-4 border-white z-20">
        {community.cover_image ? (
          <img
            src={community.cover_image}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-400 flex items-center justify-center text-white text-xl">
            {community.name?.[0]}
          </div>
        )}
      </div>

      <div className="absolute bottom-4 left-4 right-4 z-20">

        <h1 className="text-3xl font-bold text-white">
          {community.name}
        </h1>

        <p className="text-sm text-gray-200">
          {community.description}
        </p>

        <div className="flex items-center justify-between mt-3">

          <div className="flex items-center gap-3">

            <span className="text-white text-sm">
              {membersCount} members
            </span>

            {!community.joined && (
              <button
                onClick={handleJoin}
                className="px-3 py-1 bg-indigo-600 text-white rounded-full text-sm"
              >
                Join
              </button>
            )}

            <AppLink
              href="/main/search"
              prefetch={false}
              className="p-2 rounded-lg bg-gray-200 text-gray-900 dark:text-gray-200 dark:bg-gray-800"
            >
              <Search size={18} />
            </AppLink>

            <AppLink
              className="text-xs px-2 py-1 bg-yellow-500 text-black rounded"
              href={`/main/community/${communityId}/invite`}
              prefetch={false}
            >
              Invite
            </AppLink>

          </div>

          <button
            onClick={onOpenMenu}
            className="p-2 rounded-lg bg-black/40 text-white"
          >
            <MoreVertical />
          </button>

        </div>

      </div>
    </div>
  );
}