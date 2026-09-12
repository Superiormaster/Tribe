// components/inbox/ConnectionsPanel.tsx

'use client';

import { AnimatePresence, motion } from "framer-motion";
import AppLink from "@/components/AppLink";
import type{ ConnectedUser } from "@/hooks/inbox/useConnectedUsers";
import type{ JoinedCommunity } from "@/hooks/communityInbox/useJoinedCommunities";

type User = {
  id: number;
  username: string;
  avatar?: string;
};

type Props = {
  open: boolean;

  users: ConnectedUser[];
  communities: JoinedCommunity[];

  loadingUsers: boolean;
  loadingCommunities: boolean;

  connectionsRef: React.RefObject<HTMLDivElement | null>;
  communitiesRef: React.RefObject<HTMLDivElement | null>;

  onConnectionsScroll: () => void;
  onCommunitiesScroll: () => void;

  onClose: () => void;

  onOpenChat: (userId: number) => void;
  onOpenCommunity: (communityId: number) => void;
};

export default function ConnectionsPanel({
  open,
  users,
  communities,
  loadingUsers = false,
  loadingCommunities = false,
  connectionsRef,
  communitiesRef,
  onConnectionsScroll, 
  onCommunitiesScroll,
  onClose,
  onOpenChat,
  onOpenCommunity,
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[1001] flex justify-end bg-black/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ x: 320 }}
            animate={{ x: 0 }}
            exit={{ x: 320 }}
            transition={{
              type: "spring",
              stiffness: 320,
              damping: 30,
            }}
            className="w-80 h-full bg-white p-4 text-gray-700 dark:text-gray-200 dark:bg-gray-900 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center border-b justify-between mb-4">
              <h3 className="font-semibold text-lg">
                Discover More
              </h3>

              <button
                onClick={onClose}
                className="text-xl"
              >
                ✕
              </button>
            </div>
    
            {/* Connected section */}
            <div className="flex flex-col flex-1 min-h-0">
          
              <h3 className="px-4 py-2 font-semibold">
                  Connected Users
              </h3>

              {/* Users */}
              <div
                ref={connectionsRef}
                onScroll={onConnectionsScroll}
                className="flex-1 overflow-y-auto space-y-2"
              >
                {users.length === 0 && !loadingUsers && (
                  <div className="py-12 text-center text-gray-500">
                    No connections yet
                  </div>
                )}
  
                {users.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => onOpenChat(user.id)}
                    className="
                      flex
                      items-center
                      gap-3
                      p-3
                      rounded-lg
                      cursor-pointer
                      hover:bg-gray-100
                      dark:hover:bg-gray-800
                    "
                  >
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.username}
                        className="w-11 h-11 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className="
                          w-11
                          h-11
                          rounded-full
                          bg-gray-400
                          text-white
                          flex
                          items-center
                          justify-center
                          font-bold
                        "
                      >
                        {user.username
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                    )}
  
                    <span className="truncate">
                      {user.username}
                    </span>
                  </div>
                ))}
  
                {loadingUsers && (
                  <div className="py-4 text-center text-gray-500">
                    Loading...
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="pt-4 border-t dark:border-gray-800">
                <AppLink
                  href="/main/discover"
                  prefetch={false}
                  className="
                    block
                    w-full
                    rounded-lg
                    bg-indigo-600
                    py-3
                    text-center
                    text-white
                  "
                >
                  Find More People
                </AppLink>
              </div>
            </div>

            {/* Community section */}
            <div className="flex flex-col flex-1 min-h-0 border-t">
          
              <h3 className="px-4 py-2 font-semibold">
                  Joined Communities
              </h3>

              <div
                ref={communitiesRef}
                onScroll={onCommunitiesScroll}
                className="flex-1 overflow-y-auto"
              >
                {communities.length === 0 && !loadingCommunities && (
                  <div className="py-12 text-center text-gray-500">
                    No communities yet
                  </div>
                )}
  
                {communities.map(c => (
                  <div
                      key={c.id}
                      onClick={() => onOpenCommunity(c.id)}
                      className="flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                  >
                      {c.cover_image ? (
                          <img
                              src={c.cover_image}
                              className="w-11 h-11 rounded-full object-cover"
                          />
                      ) : (
                          <div className="w-11 h-11 rounded-full bg-gray-400 flex items-center justify-center text-white font-bold">
                              {c.name.slice(0,2).toUpperCase()}
                          </div>
                      )}
              
                      <span className="truncate">
                          {c.name}
                      </span>
                  </div>
                ))}
  
                {loadingCommunities && (
                  <div className="py-4 text-center text-gray-500">
                    Loading...
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="pt-4 border-t dark:border-gray-800">
                <AppLink
                  href="/main/tribe"
                  prefetch={false}
                  className="
                    block
                    w-full
                    rounded-lg
                    bg-indigo-600
                    py-3
                    text-center
                    text-white
                  "
                >
                  Discover More Communities
                </AppLink>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}