'use client'  
  
import { useState, useRef, useEffect } from 'react'  
import { useNavigation } from "@/utils/useNavigation"
import AppLink from '@/components/AppLink';
import { apiRequest } from '@/utils/api';  
import { starCreator } from '@/lib/api'
import { Share2, ThumbsUp, AlarmClock, MessageCircle, ChartNoAxesColumn, Edit, Trash2, Repeat, MoreHorizontal } from 'lucide-react';  
import { timeAgo } from '@/utils/timeAgo'  
import ShareButton from '@/components/ShareButton'
import { useSmartPostView } from '@/lib/useSmartPostView'
import { useContext } from 'react'  
import { UserContext } from '@/components/UserContext'
import { useInView } from '@/components/UseInView'
import RepostActions from '@/components/repost/RepostActions';
  
type PostCardProps = {  
  post: {  
    id: number  
    user: {  
      id: number  
      username: string  
      avatar?: string  
    }  
    community_name?: string  
    caption?: string  
    media_files: {  
      file_url: string  
      thumbnail_url?: string  
      media_type: "image" | "video"  
    }[]  
    content_type: string  
    likes_count: number  
    comments_count: number  
    liked_by_user: boolean
    community_id?: number
    views_count?: number
    created_at: string  
    is_starred_by_user: boolean
  }  
  user?: any
  community?: any
  onViewed?: () => void
  hideCommunityName?: boolean
  hideStarButton?: boolean
  showJoinButton?: boolean
  community_joined?: boolean
  
  isMyProfile?: boolean

  canEdit?: boolean;
  canDelete?: boolean;
  canRepost?: boolean;
  canReport?: boolean;
  
  isRepostContext?: boolean;
  repostId?: number;
  repostOwnerId?: number;
  shouldHideStar?: boolean;

  canBulkSelect?: boolean;
  isSelected?: boolean;
  setSelectMode?: (value: boolean) => void;
  onLongPress?: () => void;

  onSelect?: (id: number) => void;

  handlePostAction?: (action: string, postId: number) => void
  onDelete?: (id: number) => void
  currentUser?: any
  videoRef?: any
  isPinnedDraggable?: boolean
  onToggleProfilePin?: (postId: number) => void
  onToggleCommunityPin?: (postId: number) => void

  // NEW
  showManageButtons?: boolean
  canPin?: boolean
  isEmbedded?: boolean
  showPinnedLabel?: boolean
}  
  
export default function PostCard({ post, user, onViewed, community, videoRef, onDelete, isMyProfile, canPin, setSelectMode, isPinnedDraggable, onToggleProfilePin, onLongPress, onToggleCommunityPin, canBulkSelect, canEdit, canRepost, canReport, canDelete, onSelect, isSelected, isEmbedded, isRepostContext,
  handlePostAction, hideCommunityName = false, hideStarButton = false, showJoinButton = false, showManageButtons = false, showPinnedLabel=true }: PostCardProps) {
  const [liked, setLiked] = useState(!!post.is_liked || !!post.liked_by_user)
  const [likes, setLikes] = useState(post.likes_count || 0)
  const [isStarred, setIsStarred] = useState(post.is_starred_by_user)
  const [menuOpen, setMenuOpen] = useState(false);
  const { user: currentUser } = useContext(UserContext)  
  const { push } = useNavigation()
  const menuRef = useRef<HTMLDivElement>(null);
  const [reportOpen, setReportOpen] = useState(false)
  const [reportText, setReportText] = useState("")
  const [joined, setJoined] = useState(false);
  const alreadyJoined = post.community_joined;
  const hasValidCommunity =
    post?.community_id !== undefined &&
    post?.community_id !== null &&
    post?.community_id !== "undefined" &&
    post?.community_name;
  const isLikedByUser = liked;
  const postRef = useRef<HTMLDivElement | null>(null);

  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const handlePlay = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    videoRefs.current[index]?.play();
  };
  
  useEffect(() => {
    setLiked(!!post.is_liked || !!post.liked_by_user)
    setLikes(post.likes_count || 0)
  }, [post.id])
  
  useSmartPostView({
    post,
    ref: postRef,
    onViewed,
  });
  
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      if (!isSelected) {
        onLongPress?.();
      }
    }, 500);
  };
  
  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const handleJoin = async () => {

    setJoined(true);

    try {
  
      await apiRequest(
        `api/communities/${post.community_id}/join/`,
        {
          method: "POST",
        }
      )
  
    } catch (err) {
  
      console.error(err);
      setJoined(false);
  
    }
  }
  
  const handleStar = async () => {
    const creatorId = post?.user?.id;
  
    if (!creatorId) {
      console.warn("Missing creatorId");
      return;
    }
  
    const previous = isStarred;
    setIsStarred(!previous);
  
    try {
      const res = await starCreator(creatorId);
  
      if (res?.starred !== undefined) {
        setIsStarred(res.starred);
      }
    } catch (err) {
      console.error(err);
      setIsStarred(previous);
    }
  };
  
  const handleDoubleClick = (index: number) => {
    const currentTime = videoRefs.current[index]?.currentTime || 0;
  
    push(`/main/home/${post.id}?t=${Math.floor(currentTime)}`);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Toggle like  
  const handleLike = async () => {  
    try {  
      const result = await apiRequest(`api/likes/${post.id}/toggle/`, {  
        method: "POST"  
      });  
  
      setLiked(result.liked)  
      setLikes(result.likes_count)  
  
    } catch (error) {  
      console.error("Failed to toggle like:", error);  
    }  
  };
  
  const handleDelete = async () => {
    if (!confirm("Delete this post?")) return;

    try {
      await apiRequest(`api/post/${post.id}/`, { method: "DELETE" });

      onDelete?.(post.id);

      alert("Post deleted");
      setMenuOpen(false);
    } catch (err) {
      console.error(err);
    }
  };
  
  const handleReport = async () => {
    if (!reportText.trim()) return;
  
    try {
      await apiRequest(`api/posts/${post.id}/report/`, {
        method: "POST",
        data: { reason: reportText },
      });
  
      setReportOpen(false);
      setReportText("");
      alert("Reported successfully");
    } catch (err) {
      console.error(err);
    }
  };
  
  const shouldHideStar =
    hideStarButton ||
    isMyProfile ||
    isRepostContext;
  
  const handleMediaClick = () => {
    push(`/main/home/${post.id}`);
  };
  
  return (  
    <div 
      id={`post-${post.id}`} ref={postRef} 
      onContextMenu={(e) => {
        if (!onSelect) return;
    
        e.preventDefault();
      
        setSelectMode?.(true);
      
        onSelect?.(post.id);
      }} 
      onTouchStart={handleTouchStart}
      onTouchEnd={clearLongPress}
      onTouchMove={clearLongPress}
      onTouchCancel={clearLongPress}
      className={`bg-white dark:bg-gray-900 p-4 relative border-gray-600 border-b-4 space-y-4 shadow-sm transition-colors bg-white dark:bg-gray-900 ${
        isEmbedded ? '' : 'border-b-4 border-gray-600 p-4'
      }`}>

    {canBulkSelect && (
      <button
        onClick={() => onSelect?.(post.id)}
        className={`absolute top-3 right-14 w-7 h-7 rounded-full border-2 ${
          isSelected
            ? "bg-indigo-600 border-indigo-600"
            : "bg-white border-gray-400"
        }`}
      >
        ✓
      </button>
    )}

      {showPinnedLabel && (post.profile_pinned || post.community_pinned) && (
        <div
          className={`text-sm font-semibold ${
            post.profile_pinned
              ? "text-yellow-500"
              : "text-indigo-500"
          }`}
        >
          📌 {post.profile_pinned
            ? "Pinned Posts"
            : "Pinned"}
        </div>
      )}

      {/* User info */}  
      <div className="flex items-center gap-3 mb-3">  
        <AppLink href={`/main/profile/${post.user.username}`}
        prefetch={false}
        className="flex-shrink-0">  
          {post.user.avatar ? (  
            <img  
              src={post.user.avatar}  
              alt={post.user.username}  
              className="w-10 h-10 rounded-full border-2 border-gray-400 dark:border-white object-cover cursor-pointer"  
            />  
          ) : (  
            <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center text-white font-bold cursor-pointer">  
              {post.user.username.slice(0,2).toUpperCase()}  
            </div>  
          )}  
        </AppLink>  
  
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <AppLink
              href={`/main/profile/${post.user.username}`}
              prefetch={false}
              className="font-bold text-gray-900 dark:text-gray-100 hover:underline"
            >
              {post.user.username}
            </AppLink>
          
            {/* STAR BUTTON */}
            {!shouldHideStar && (
              !isStarred ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!post?.user?.id) return;
                    handleStar();
                  }}
                  className="text-xs px-2 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Star
                </button>
              ) : (
                <span
                  className="text-xs px-2 py-1 text-white rounded-md"
                >
                  ⭐
                </span>
              )
            )}
          </div>
          <div className="flex items-center gap-2">
            {!hideCommunityName && (
              <AppLink href={`/main/community/${post.community_id}`}
                prefetch={false}
              >
                {post.community_name && (
                  <span className="text-gray-500 dark:text-gray-400 text-sm">
                    in {post.community_name}
                  </span>
                )}
              </AppLink>
            )}
            {/* JOIN BUTTON */}
            {showJoinButton && !isRepostContext && !alreadyJoined && !joined && (
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  handleJoin();
                }}
                className="text-xs px-2 py-1 bg-green-600 text-white rounded-md"
              >
                Join
              </button>
            )}
            
            {joined && (
              <button
                disabled
                className="text-xs px-2 py-1 bg-gray-500 text-white rounded-md"
              >
                Joined
              </button>
            )}
          </div>
        </div>

        <span className="ml-2 flex flex-1 items-center text-gray-500 text-sm">
          <AlarmClock className="text-sm mr-1" />
        
          {post.is_edited ? (
            <>
              Edited • {timeAgo(post.updated_at)}
            </>
          ) : (
            timeAgo(post.created_at)
          )}
        </span>

      <div className="flex items-center gap-2 relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800"
        >
          <MoreHorizontal className="w-5 text-gray-700 dark:text-gray-300 h-5" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-2 w-40 bg-white max-h-64 overflow-y-auto dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg z-50 flex flex-col">
            {canReport && (
              <button
                onClick={() => setReportOpen(true)}
                className="text-left px-3 py-2 text-gray-700 dark:text-gray-400 hover:bg-gray-100 hover:rounded-lg dark:hover:bg-gray-700"
              >
                Report
              </button>
            )}

            {showManageButtons && (canDelete || canEdit || canRepost || canReport) && (
              <div className="flex flex-col px-3 space-y-4 py-2">
                {onToggleCommunityPin && (
                  <button
                    className="flex gap-1 text-gray-700 dark:text-gray-400 hover:bg-gray-100 hover:rounded-lg dark:hover:bg-gray-700 items-center"
                    onClick={() => onToggleCommunityPin?.(post.id)}
                  >
                    {post.community_pinned
                      ? "Unpin Post"
                      : "Pin To Community"}
                  </button>
                )}
  
                {onToggleProfilePin && (
                  <button
                    className="flex gap-1 text-gray-700 dark:text-gray-400 hover:bg-gray-100 hover:rounded-lg dark:hover:bg-gray-700 items-center"
                    onClick={() => onToggleProfilePin?.(post.id)}
                  >
                    {post.profile_pinned
                      ? "Unpin Post"
                      : "Pin Post"}
                  </button>
                )}

                {canEdit && (
                  <button className="flex gap-1 text-gray-700 dark:text-gray-400 hover:bg-gray-100 hover:rounded-lg dark:hover:bg-gray-700 items-center"
                    onClick={() => handlePostAction?.('edit', post.id)}
                  >
                    <Edit className="w-5 h-5 text-gray-500 hover:text-indigo-600"/> Edit
                  </button>
                )}
              
                {canDelete && (
                  <button
                    className="flex gap-1 text-gray-700 dark:text-gray-400 hover:bg-gray-100 hover:rounded-lg dark:hover:bg-gray-700 items-center"
                    onClick={() => {
                      if (isRepostContext && repostId) {
                        handlePostAction?.('delete_repost', repostId);
                      } else {
                        handlePostAction?.('delete', post.id);
                      }
                    }}
                  >
                    <Trash2 className="w-5 h-5 text-red-500"/> Delete
                  </button>
                )}

                {canRepost && !post.community_pinned && (
                  <RepostActions
                    onNormal={() =>
                      handlePostAction?.(
                        'repost_normal',
                        post.id
                      )
                    }
                
                    onQuote={() =>
                      handlePostAction?.(
                        'repost_quote',
                        post.id
                      )
                    }
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>
      </div>

      {/* Post content */}  
      <div onClick={handleMediaClick} className="cursor-pointer">  
        {post.caption && (  
          <p className="text-gray-800 dark:text-gray-200 line-clamp-3 mb-2 whitespace-pre-line">  
            {post.caption}  
          </p>  
        )}  
        {post.media_files?.length > 0 && (
          <div className={`grid gap-2 ${
            post.media_files.length === 1
              ? "grid-cols-1"
              : post.media_files.length === 2
                ? "grid-cols-2"
                : "grid-cols-2 md:grid-cols-3"
          }`}>
            {post.media_files.map((media, index) => (
              <MediaItem
                key={index}
                media={media}
                index={index}
                videoRefs={videoRefs}
                handlePlay={handlePlay}
                handleDoubleClick={handleDoubleClick}
              />
            ))}
          </div>
        )}
      </div>  
  
      {/* Actions */}  
      <div className="flex flex-wrap items-center gap-6 mt-2">  
        <button  
          onClick={handleLike}  
          className={`flex items-center gap-1 font-medium ${  
            isLikedByUser ? "text-blue-600" : "text-gray-500"  
          }`}  
        >
          <ThumbsUp className="mr-2" /> 
          {likes > 0 && (
            <span>{likes}</span>
          )}  
        </button>  
  
        <button  
          onClick={handleMediaClick}  
          className="flex items-center gap-1 text-gray-500 font-medium"  
        >  
          <MessageCircle className="mr-2" />
          {post.comments_count > 0 && (
            <span>{post.comments_count}</span>
          )}
        </button>  
  
        <ShareButton post={post} />

        <span className="flex items-center text-gray-500"> <ChartNoAxesColumn className="mr-2" />
          {post.views_count > 0 && (
            <span>{post.views_count}</span>
          )}
        </span>
  
      </div>

      {reportOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-200 dark:bg-gray-900 p-4 rounded-xl w-[90%] max-w-md">
            
            <h2 className="font-bold text-gray-800 dark:text-gray-200 mb-2">Report Post</h2>
      
            <textarea
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              className="w-full border p-2 rounded-md text-gray-700 dark:text-gray-200 dark:bg-gray-800"
              rows={4}
              placeholder="Why are you reporting this?"
            />
      
            <div className="flex justify-end text-gray-900 dark:text-gray-200 gap-2 mt-3">
              <button onClick={() => setReportOpen(false)}>
                Cancel
              </button>
      
              <button
                onClick={handleReport}
                className="bg-red-600 text-white px-3 py-1 rounded-md"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>  
  )  
}  

const MediaItem = ({ media, index, videoRefs, handlePlay, handleDoubleClick }) => {
  const { ref, isVisible } = useInView();

  if (media.media_type === "image") {
    return (
      <img
        key={index}
        src={media.file_url}
        loading="lazy"
        className="rounded-xl w-full aspect-square max-h-96 object-cover"
      />
    );
  }

  return (
    <div key={index} ref={ref}>
      {isVisible ? (
        <div
          onDoubleClick={() => handleDoubleClick(index)}
          className="relative"
        >
          <video
            ref={(el) => (videoRefs.current[index] = el)}
            src={media.file_url}
            poster={media.thumbnail_url}
            preload="metadata"
            onError={() => {}}
            className="rounded-xl w-full aspect-video max-h-96 object-cover"
          />
            {/* PLAY BUTTON */}
            <button
              onClick={(e) => handlePlay(index, e)}
              className="absolute inset-0 flex items-center justify-center text-white text-3xl"
            >
              ▶
            </button>
          </div>
        ) : (
          <div className="rounded-xl w-full aspect-video max-h-96 bg-gray-300 dark:bg-gray-700 animate-pulse" />
        )}
    </div>
  );
};