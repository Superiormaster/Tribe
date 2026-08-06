'use client';

import { useState } from "react";
import { MoreVertical } from "lucide-react";
import Linkify from "linkify-react";

interface ReelCaptionProps {
    reel: any;
    currentUser: any;
    starredUsers: Set<number>;
    toggleStar: (userId: number) => void;
}

export default function ReelCaption({
    reel,
    currentUser,
    starredUsers,
    toggleStar,
}: ReelCaptionProps) {

    const [expanded, setExpanded] = useState(false);

    return (

      <div className="absolute inset-x-0 bottom-0 z-20">
        {/* Bottom gradient */}
        <div className="absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />
      
        {/* Caption */}
        <div
          className="relative px-4 pb-3 text-white"
          style={{
            textShadow: "0 2px 8px rgba(0,0,0,.9)",
          }}
        >

            <div className="flex items-center min-w-0">
              <p className="font-bold truncate mr-2">
                  @{reel.user.username}
              </p>
          
              {reel.user?.id !== currentUser?.id && (
                  <button
                      onClick={(e) => {
                          e.stopPropagation();
                          toggleStar(reel.user.id);
                      }}
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium backdrop-blur-sm transition ${
                          starredUsers.has(reel.user.id)
                              ? "text-black"
                              : "bg-black/30 text-white"
                      }`}
                  >
                      {starredUsers.has(reel.user.id) ? "⭐" : "⭐ Star"}
                  </button>
              )}
            </div>

            <div className="mt-2 max-w-[70%]">
              <div className="flex items-end gap-1">
                <Linkify
                  options={{
                    defaultProtocol: "https",
                    target: "_blank",
                    rel: "noopener noreferrer",
                    attributes: {
                      class: "text-indigo-300 hover:underline break-all",
                      onClick: (e: React.MouseEvent<HTMLAnchorElement>) => {
                        e.stopPropagation();
                      },
                    },
                  }}
                >
                  <p
                    className={`text-sm ${
                      expanded ? "" : "line-clamp-1"
                    }`}
                  >
                    {reel.caption}
                  </p>
                </Linkify>
            
                {reel.caption?.length > 60 && !expanded && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpanded(true);
                    }}
                    className="text-xs text-gray-300 shrink-0"
                  >
                    more
                  </button>
                )}
              </div>
            
              {expanded && reel.caption?.length > 60 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded(false);
                  }}
                  className="mt-1 text-xs text-gray-300"
                >
                  less
                </button>
              )}
            </div>

        </div>
      </div>

    );

}