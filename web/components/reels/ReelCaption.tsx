'use client';

import { useState } from "react";
import { MoreVertical } from "lucide-react";

interface ReelCaptionProps {
    reel: any;
    currentUser: any;
    starredUsers: Set<number>;
    toggleStar: (userId: number) => void;
    onMenuClick: () => void;
}

export default function ReelCaption({
    reel,
    currentUser,
    starredUsers,
    toggleStar,
    onMenuClick,
}: ReelCaptionProps) {

    const [expanded, setExpanded] = useState(false);

    return (

        <div className="absolute bottom-3 left-4 right-4 text-white z-20">

            <div className="flex items-start justify-between">

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
                            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
                                starredUsers.has(reel.user.id)
                                    ? "text-black"
                                    : "bg-white text-black"
                            }`}
                        >

                            {starredUsers.has(reel.user.id)
                                ? "⭐"
                                : "⭐ Star"}

                        </button>

                    )}

                </div>

                <button
                    onClick={(e) => {

                        e.stopPropagation();

                        onMenuClick();

                    }}
                    className="text-white"
                >
                    <MoreVertical className="w-5 h-5" />
                </button>

            </div>

            <div className="mt-2 max-w-[70%]">

                <p
                    className={`text-sm ${
                        expanded ? "" : "line-clamp-1"
                    }`}
                >
                    {reel.caption}
                </p>

                {reel.caption?.length > 60 && (

                    <button
                        onClick={(e) => {

                            e.stopPropagation();

                            setExpanded(prev => !prev);

                        }}
                        className="mt-1 text-xs text-gray-300"
                    >

                        {expanded ? "less" : "more"}

                    </button>

                )}

            </div>

        </div>

    );

}