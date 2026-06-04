'use client';

import AppLink from '@/components/AppLink';
import { Repeat, AlarmClock } from 'lucide-react';
import { useState, useEffect } from "react";
import { timeAgo } from '@/utils/timeAgo'
import { starCreator } from '@/lib/api'
import PostCard from '@/components/PostCard';
import { apiRequest } from '@/utils/api';

export default function RepostCard({
  repost,
  handlePostAction,
  currentUser,
  hideStarButton = false,
  starredUserIds = new Set(),
  shouldHideStar,
}) {
  const [isStarred, setIsStarred] = useState(
    starredUserIds.has(repost.user.id)
  );
  const currentUserId = Number(currentUser?.id);
  const repostUserId = Number(repost.user.id);
  const isOwnProfile = currentUserId === repostUserId;
  const hideStar =
  hideStarButton ||
  shouldHideStar ||
  isOwnProfile;
  
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
    setIsStarred(starredUserIds.has(repost.user.id));
  }, [starredUserIds, repost.user.id]);

  const fetchReposts = async (page = 1) => {
    const res = await apiRequest(
      `api/post/reposts/?page=${page}`
    );
  
    return res.results;
  };
  
  return (
    <AppLink
      href={`/main/reposts/${repost.id}`}
      prefetch={false}
      className="block bg-white dark:bg-gray-900 border-b-4 border-gray-600 p-1 space-y-3"
    >

      {/* REPOST HEADER */}
      <div className="flex items-center gap-2 text-gray-500">

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
      </div>

      {/* QUOTE TEXT */}
      {repost.repost_type === 'quote' && repost.quote_text && (
        <div className="text-gray-800 dark:text-gray-200 whitespace-pre-line">
          {repost.quote_text}
        </div>
      )}

      {/* ORIGINAL POST */}
      <div className="border border-gray-300 dark:border-gray-700 rounded-2xl overflow-hidden">
        {repost.post && (
          <PostCard
            post={repost.post}
  
            hideCommunityName={false}
            hideStarButton={false}
            isEmbedded={true}
  
            canEdit={false}
            canDelete={true}
            canRepost={false}
            showPinnedLabel={false}
  
            showManageButtons={true}
  
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

    </AppLink>
  );
}