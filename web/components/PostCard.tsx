'use client'  
  
import { useState, useRef, useEffect } from 'react'
import React from "react";
import { useNavigation } from "@/utils/useNavigation"
import AppLink from '@/components/AppLink';
import { apiRequest } from '@/utils/api';  
import { starCreator } from '@/lib/api'
import { Share2, ThumbsUp, AlarmClock, MessageCircle, ChartNoAxesColumn, Edit, Trash2, Repeat, MoreHorizontal } from 'lucide-react';  
import { timeAgo } from '@/utils/timeAgo'  
import CommentsModal from "@/components/CommentsModal";
import MediaViewer from "@/components/media/MediaViewer";
import toast from "react-hot-toast";
import ShareButton from '@/components/share/ShareButton'
import { useShareSheet } from '@/components/share/ShareContext'
import { useSmartPostView } from '@/lib/useSmartPostView'
import { useContext } from 'react'  
import { UserContext } from '@/components/UserContext'
import { useInView } from '@/components/UseInView'
import Linkify from "linkify-react";
import RepostActions from '@/components/repost/RepostActions';
import { formatCount } from '@/utils/formatCount';
  
type CardContext =
  | "feed"
  | "profile"
  | "community"
  | "search";

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
    is_liked?: boolean;
    liked_by_user: boolean
    community_id?: number
    community_joined?: boolean
    community_requested?: boolean
    community_invited?: boolean
    profile_pinned?: boolean
    community_pinned?: boolean
    is_edited?: boolean
    updated_at?: string
    views_count: number
    created_at: string  
    is_starred_by_user: boolean
  }  
  starredUserIds?: Set<number>
  setStarredUsers?: React.Dispatch<
    React.SetStateAction<Set<number>>
  >;
  user?: any
  community?: any
  onViewed?: () => void
  hideCommunityName?: boolean
  hideStarButton?: boolean
  showJoinButton?: boolean
  
  isMyProfile?: boolean
  context?: CardContext

  canEdit?: boolean;
  canDelete?: boolean;
  canRepost?: boolean;
  canReport?: boolean;
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
  
  isRepostContext?: boolean;
  isPending?: boolean;
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
  
function PostCard({ post, user, onViewed, community, videoRef, onDelete, isMyProfile, canPin, setSelectMode, isPinnedDraggable, onToggleProfilePin, onLongPress, onToggleCommunityPin, canBulkSelect, canEdit, canRepost, canReport, onApprove, onReject, canDelete, onSelect, isSelected, isPending = false, isEmbedded, isRepostContext, repostId, repostOwnerId, starredUserIds, setStarredUsers, context = "feed",
  handlePostAction, hideCommunityName = false, hideStarButton = false, showJoinButton = false, showManageButtons = false, showPinnedLabel=true }: PostCardProps) {
  const [liked, setLiked] = useState(!!post.is_liked || !!post.liked_by_user)
  const [likes, setLikes] = useState(post.likes_count || 0)
  const isStarred = starredUserIds?.has(post.user.id);
  const isSearch = context === "search";
  const [menuOpen, setMenuOpen] = useState(false);
  const { user: currentUser } = useContext(UserContext)!
  const { push } = useNavigation()
  const menuRef = useRef<HTMLDivElement>(null);
  const [reportOpen, setReportOpen] = useState(false)
  const [viewerOpen, setViewerOpen] = useState(false);
  const [startIndex, setStartIndex] = useState(0);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [joinStatus, setJoinStatus] = useState<
    "none" | "joined" | "requested" | "invited"
  >("none");
  const hasValidCommunity =
    typeof post.community_id === "number" &&
    !!post.community_name;
  const isLikedByUser = liked;
  const postRef = useRef<HTMLDivElement | null>(null);
  const isPostOwner =
    Number(currentUser?.id) === Number(post?.user?.id);
  const [openCommentsPostId, setOpenCommentsPostId] =
    useState<number | null>(null);
  
  const canManagePost =
    canDelete ||
    canEdit ||
    canRepost;
  const { showShare } = useShareSheet();

  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
 
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
    try {
      const res = await apiRequest(
        `api/communities/${post.community_id}/join/`,
        { method: "POST" }
      );
  
      if (
        res.status === "joined" ||
        res.status === "already_joined"
      ) {
        setJoinStatus("joined");
      } else if (
        res.status === "requested" ||
        res.status === "already_requested"
      ) {
        setJoinStatus("requested");
      } else if (
        res.status === "invited" ||
        res.status === "already_invited"
      ) {
        setJoinStatus("invited");
      }
    } catch (err) {
      console.error(err);
    }
  };
  
  const handleStar = async () => {
    const creatorId = post?.user?.id;
  
    if (!creatorId || !setStarredUsers) return;
  
    const previous = new Set(starredUserIds);
  
    // Optimistic update
    setStarredUsers(prev => {
      const next = new Set(prev);
  
      if (next.has(creatorId)) {
        next.delete(creatorId);
      } else {
        next.add(creatorId);
      }
  
      return next;
    });
  
    try {
      const res = await starCreator(creatorId);
  
      setStarredUsers(prev => {
        const next = new Set(prev);
  
        if (res.starred) {
          next.add(creatorId);
        } else {
          next.delete(creatorId);
        }
  
        return next;
      });
    } catch (err) {
      console.error(err);
  
      // rollback
      setStarredUsers(previous);
    }
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
  
  const handleMute = async () => {
    await apiRequest(`api/users/mute/${post.user.id}/`, {
      method: "POST"
    });
    setMenuOpen(false);
  };
  
  const handleBlock = async () => {
    await apiRequest(`api/users/block/${post.user.id}/`, {
      method: "POST"
    });
    setMenuOpen(false);
  };
  
  const handleReport = async () => {
    if (!reportReason) {
      alert("Please select a reason");
      return;
    }
  
    try {
      const res = await apiRequest(
        `api/post/${post.id}/report/`,
        {
          method: "POST",
          data: {
            reason: reportReason,
            details: reportDetails,
          },
        }
      );
  
      alert(res.message);
  
      setReportOpen(false);
      setReportReason("");
      setReportDetails("");
  
    } catch (err: any) {
  
      alert(
        err?.data?.message ||
        "Failed to submit report"
      );
  
      console.error(err);
    }
  };
  
  const openComments = () => {
    setOpenCommentsPostId(post.id);
  };
  
  const shouldHideStar =
    hideStarButton ||
    isMyProfile ||
    isRepostContext ||
    isPostOwner;
  
  const handleMediaClick = () => {
    if (isPending) {
      toast("⏳ This post is pending approval.");
      return;
    }
    push(`/main/home/${post.id}`);
  };
  
  const openViewer = (index: number) => {
    setStartIndex(index);
    setViewerOpen(true);
  
    window.dispatchEvent(
      new CustomEvent("media-viewer-change", {
        detail: { open: true },
      })
    );
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
      className={`bg-white dark:bg-gray-900 p-4 relative border-gray-600 border-b-4 overflow-visible space-y-4 shadow-sm transition-colors bg-white dark:bg-gray-900 ${
        isEmbedded ? '' : 'border-b-4 border-gray-600 p-4'
      }`}>

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
      <div className="flex items-center gap-3 mb-3 min-w-0">
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
  
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <AppLink
              href={`/main/profile/${post.user.username}`}
              prefetch={false}
              className="font-bold text-gray-900 truncate dark:text-gray-100 hover:underline overflow-hidden whitespace-nowrap max-w-[100px]"
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
            {showJoinButton && !isRepostContext && joinStatus === "none" && (
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

            {joinStatus === "joined" && (
              <button
                disabled
                className="text-xs px-2 py-1 bg-gray-500 text-white rounded-md"
              >
                Joined
              </button>
            )}

            {joinStatus === "requested" && (
              <button
                disabled
                className="text-xs px-2 py-1 bg-yellow-500 text-white rounded-md"
              >
                Requested
              </button>
            )}

            {joinStatus === "invited" && (
              <button
                disabled
                className="text-xs px-2 py-1 bg-indigo-500 text-white rounded-md"
              >
                Invited
              </button>
            )}
          </div>
        </div>

        <span className="ml-2 flex flex-1 items-center flex-shrink-0 text-gray-500 text-sm">
          <AlarmClock className="text-sm mr-1" />
        
          {post.is_edited && post.updated_at ? (
            <>
              Edited • {timeAgo(post.updated_at)}
            </>
          ) : (
            timeAgo(post.created_at)
          )}
        </span>

      <div className="flex items-center gap-2 relative" ref={menuRef}>
        {showManageButtons && (
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800"
          >
            <MoreHorizontal className="w-5 text-gray-700 dark:text-gray-300 h-5" />
          </button>
        )}

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
  
            {!isPostOwner && (
              <>
                <button
                  className="text-left px-3 py-2 text-gray-700 dark:text-gray-400 hover:bg-gray-100 hover:rounded-lg dark:hover:bg-gray-700"
                  onClick={handleMute}
                >
                  Mute User
                </button>
            
                <button
                  onClick={handleBlock}
                  className="text-left px-3 py-2 text-gray-700 dark:text-gray-400 hover:bg-gray-100 hover:rounded-lg dark:hover:bg-gray-700"
                >
                  Block User
                </button>
              </>
            )}

            {showManageButtons && (canDelete || canEdit || canRepost || canReport) && (
              <div className="flex flex-col z-50 px-3 space-y-4 py-2">
                {onToggleCommunityPin && canPin && (
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
  
                {onApprove && (
                  <button
                    onClick={() => {
                      onApprove(post.id);
                      setMenuOpen(false);
                    }}
                    className="flex gap-1 text-gray-700 dark:text-gray-400 hover:bg-gray-100 hover:rounded-lg dark:hover:bg-gray-700 items-center"
                  >
                    👍 Approve
                  </button>
                )}
                
                {onReject && (
                  <button
                    onClick={() => {
                      onReject(post.id);
                      setMenuOpen(false);
                    }}
                    className="flex gap-1 text-gray-700 dark:text-gray-400 hover:bg-gray-100 hover:rounded-lg dark:hover:bg-gray-700 items-center"
                  >
                    👎 Reject
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
          <div className="mb2">
            <Linkify
              options={{
                defaultProtocol: "https",
                target: "_blank",
                rel: "noopener noreferrer",
                attributes: {
                  class: "text-indigo-600 hover:underline break-all",
                  onClick: (e: React.MouseEvent<HTMLAnchorElement>) => {
                    e.stopPropagation();
                  },
                },
              }}
            >
              <p 
                className="whitespace-pre-line mb-2 text-gray-600 dark:text-gray-300 line-clamp-3 overflow-hidden"
              >
                {post.caption}
              </p>
            </Linkify>
  
            {post.caption.length > 150 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleMediaClick();
                }}
                className="mt-1 text-sm font-medium text-indigo-600 hover:underline"
              >
                More
              </button>
            )}
          </div>
        )}
        {post.media_files?.length > 0 && (
          <div
            className={`grid gap-2 ${
              post.media_files.length === 1
                ? "grid-cols-1"
                : "grid-cols-2 md:grid-cols-3"
            }`}
          >
            {post.media_files
              .slice(0, 4)
              .map((media, index) => {
                const remaining =
                  post.media_files.length - 4;
        
                const showOverlay =
                  index === 3 && remaining > 0;
        
                return (
                  <div
                    key={index}
                    className="relative"
                  >
                    <MediaItem
                      media={media}
                      index={index}
                      videoRefs={videoRefs}
                      onOpen={openViewer}
                    />
        
                    {showOverlay && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openViewer(index);
                        }}
                        className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl text-white text-3xl font-bold"
                      >
                        +{remaining}
                      </button>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>  
  
      {/* Actions */}  
      <div className="flex flex-wrap items-center gap-6 mt-2">  
        <button  
          onClick={(e) => {
            e.stopPropagation();
            handleLike();
          }}  
          className={`flex items-center gap-1 font-medium ${  
            isLikedByUser ? "text-blue-600" : "text-gray-500"  
          }`}  
        >
          <ThumbsUp className="mr-2" /> 
          {likes > 0 && (
            <span>{formatCount(likes)}</span>
          )}  
        </button>  
  
        <button  
          onClick={(e) => {
            e.stopPropagation();
            handleMediaClick();
          }}  
          className="flex items-center gap-1 text-gray-500 font-medium"  
        >  
          <MessageCircle className="mr-2" />
          {post.comments_count > 0 && (
            <span>{formatCount(post.comments_count)}</span>
          )}
        </button>  
  
        <ShareButton
            post={post}
            onOpen={showShare}
        />

        <span className="flex items-center text-gray-500"> <ChartNoAxesColumn className="mr-2" />
          {post.views_count && post.views_count > 0 && (
            <span>{formatCount(post.views_count)}</span>
          )}
        </span>
  
      </div>

      {reportOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-200 dark:bg-gray-900 p-4 rounded-xl w-[90%] max-w-md">
            
            <h2 className="font-bold text-gray-800 dark:text-gray-200 mb-2">Report Post</h2>
      
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full border p-2 rounded-md text-gray-700 dark:text-gray-200 dark:bg-gray-800 mb-3 bg-gray-100"
            >
              <option value="">Select reason</option>
              <option value="spam">Spam</option>
              <option value="harassment">Harassment</option>
              <option value="hate_speech">Hate Speech</option>
              <option value="violence">Violence</option>
              <option value="nudity">Nudity</option>
              <option value="misinformation">Misinformation</option>
              <option value="copyright">Copyright</option>
              <option value="other">Other</option>
            </select>
            
            <textarea
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              className="w-full border p-2 rounded-md dark:bg-gray-800 text-gray-700 dark:text-gray-200"
              rows={4}
              placeholder="Additional details (optional)"
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
  
      <MediaViewer
        open={viewerOpen}
        post={post}
        startIndex={startIndex}
        liked={liked}
        likes={likes}
        onClose={() => {
          setViewerOpen(false);
      
          window.dispatchEvent(
            new CustomEvent("media-viewer-change", {
              detail: { open: false },
            })
          );
        }}
        onLike={handleLike}
        more={handleMediaClick}
        onComment={() => {
          setOpenCommentsPostId(post.id);
        }}
        onShare={() => showShare(post)}
        onRepost={() =>
          handlePostAction?.("repost_normal", post.id)
        }
        onMore={() => setMenuOpen(true)}
      />

      {openCommentsPostId && (
        <CommentsModal
          postId={openCommentsPostId}
          user={currentUser}
          onClose={() => setOpenCommentsPostId(null)}
        />
      )}
    </div>  
  )  
}  

interface MediaItemProps {
  media: {
    file_url: string;
    thumbnail_url?: string;
    media_type: "image" | "video";
  };
  index: number;
  videoRefs: React.MutableRefObject<(HTMLVideoElement | null)[]>;
  onOpen: (index: number) => void;
}

const MediaItem = ({
  media,
  index,
  videoRefs,
  onOpen,
}: MediaItemProps) => {
  const { ref, isVisible } = useInView();

  if (media.media_type === "image") {
    return (
      <img
        src={media.file_url}
        onClick={(e) => {
          e.stopPropagation();
          onOpen(index);
        }}
        fetchPriority={index < 2 ? "high" : "auto"}
        className="rounded-xl w-full aspect-square max-h-96 object-cover"
      />
    );
  }

  return (
    <div ref={ref}>
      {isVisible ? (
        <div
          onClick={(e) => {
            e.stopPropagation();
            onOpen(index);
          }}
          className="relative cursor-pointer"
        >
          <img
            src={media.thumbnail_url || media.file_url}
            className="rounded-xl w-full aspect-video max-h-96 object-cover"
          />

          <div className="absolute inset-0 flex items-center justify-center text-white text-4xl">
            ▶
          </div>
        </div>
      ) : (
        <div className="rounded-xl w-full aspect-video max-h-96 bg-gray-300 dark:bg-gray-700 animate-pulse" />
      )}
    </div>
  );
};

export default React.memo(PostCard);