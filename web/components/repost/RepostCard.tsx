'use client';

import AppLink from '@/components/AppLink';
import { Repeat, AlarmClock, MoreHorizontal, Trash2 } from 'lucide-react';
import { useState, useEffect, useRef } from "react";
import { timeAgo } from '@/utils/timeAgo'
import { starCreator } from '@/lib/api'
import PostCard from '@/components/PostCard';
import { apiRequest } from '@/utils/api';
import { useNavigation } from "@/utils/useNavigation";

type CardContext =
  | "feed"
  | "profile"
  | "community"
  | "search";

type RepostCardProps = {
  repost: any;
  handlePostAction?: (action: string, post: any) => void;
  currentUser: any;
  hideStarButton?: boolean;
  starredUserIds?: Set<number>;
  shouldHideStar?: boolean;
  canModerateReposts?: boolean;
  context?: CardContext;
};

export default function RepostCard({
  repost,
  handlePostAction,
  currentUser,
  context = "feed",
  hideStarButton = false,
  starredUserIds = new Set(),
  shouldHideStar = false,
  canModerateReposts = false,
}: RepostCardProps) {
  const [isStarred, setIsStarred] = useState(false);
  const isSearch = context === "search";

  const currentUserId = Number(currentUser?.id);
  const { push } = useNavigation();
  const repostUserId = Number(repost.user.id);
  const isOwnProfile = currentUserId === repostUserId;
  const hideStar =
  hideStarButton ||
  shouldHideStar ||
  isOwnProfile;
  
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
  
    document.addEventListener(
      "mousedown",
      handleClickOutside
    );
  
    return () =>
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
  }, []);

  const handleStar = async (userId: number) => {
    if (userId === currentUser?.id) {
      console.warn("Cannot star yourself");
      return;
    }
    
    const previous = isStarred;
    setIsStarred(!previous);
  
    try {
      const starred = await starCreator(userId);
      setIsStarred(starred);
    } catch (err:any) {
      if (err?.data?.error === "You cannot star yourself") {
        console.warn("Self-star blocked");
        return;
      }

      setIsStarred(previous);
    }
  };

  useEffect(() => {
    if (!repost?.user?.id) return;
  
    setIsStarred(starredUserIds.has(repost.user.id));
  }, [starredUserIds, repost?.user?.id]);

  const handleDeleteRepost = () => {
    handlePostAction?.("delete_repost", repost.id);
  };
  
  const isRepostOwner =
    currentUserId === repostUserId;
  
  const canDeleteRepost =
    isRepostOwner ||
    canModerateReposts;

  const fetchReposts = async (page = 1) => {
    const res = await apiRequest(
      `api/post/reposts/?page=${page}`
    );
  
    return res.results;
  };
  
  return (
    <div
      className="block bg-white dark:bg-gray-900 border-b-4 border-gray-600 p-2 space-y-3"
    >

      {/* REPOST HEADER */}
      <div className="flex items-center gap-2 mb-2 text-gray-500">

        <AppLink href={`/main/profile/${repost.user.username}`}
        prefetch={false} className="flex-shrink-0">  
          {repost.user.avatar ? (  
            <img  
              src={repost.user.avatar}  
              alt={repost.user.username}  
              className="w-10 h-10 rounded-full border-2 border-gray-400 dark:border-white object-cover cursor-pointer"  
            />  
          ) : (  
            <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center text-white font-bold cursor-pointer">  
              {repost.user.username.slice(0,2).toUpperCase()}  
            </div>  
          )}  
        </AppLink>  

        <AppLink
          href={`/main/profile/${repost.user.username}`}
          prefetch={false}
          className="font-semibold hover:underline"
        >
          {repost.user.username}
        </AppLink>
  
        {/* STAR BUTTON */}
        {!hideStar && (
          !isStarred ? (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!repost?.user?.id) return;
                handleStar(repost.user.id);
              }}
              className="text-xs px-2 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Star
            </button>
          ) : (
            <span
              className="text-xs px-2 py-1 text-white rounded-md hover:bg-yellow-600"
            >
              ⭐
            </span>
          )
        )}

        <span>reposted</span>
        
        <span className="ml-2 flex flex-1 items-center text-gray-500 text-sm">  
          <AlarmClock className="text-sm mr-1" /> {timeAgo(repost.created_at)}  
        </span>
        
        {canDeleteRepost && (
          <div
            className="relative"
            ref={menuRef}
          >
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMenuOpen(!menuOpen);
              }}
              className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
        
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg z-50">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
        
                    handleDeleteRepost()
        
                    setMenuOpen(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div onClick={() => push(`/main/reposts/${repost.id}`)}>
        {/* QUOTE TEXT */}
        {repost.repost_type === 'quote' && repost.quote_text && (
          <div className="text-gray-800 dark:text-gray-200 mb-1 whitespace-pre-line">
            {repost.quote_text}
          </div>
        )}
  
        {/* ORIGINAL POST */}
        <div className="border border-gray-300 dark:border-gray-700 rounded-2xl overflow-hidden">
          {repost.post && (
            <PostCard
              post={repost.post}
    
              hideCommunityName={false}
              isEmbedded={true}
    
              canEdit={false}
              canDelete={false}
              canRepost={false}
              showPinnedLabel={false}
    
              showManageButtons={false}
    
              handlePostAction={handlePostAction}
              hideStarButton={true}
              showJoinButton={false} 
              shouldHideStar={true}
  
              isRepostContext={true}
              repostId={repost.id}
              repostOwnerId={repost.user.id}
            />
          )}
        </div>
      </div>

    </div>
  );
}