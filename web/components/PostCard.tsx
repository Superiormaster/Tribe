'use client'  
  
import { useState, useRef, useEffect } from 'react'  
import { useRouter } from 'next/navigation'  
import Link from 'next/link'  
import { apiRequest } from '@/utils/api';  
import { starCreator } from '@/lib/api'
import { Share2, ThumbsUp, AlarmClock, MessageCircle, MoreHorizontal } from 'lucide-react';  
import { timeAgo } from '@/utils/timeAgo'  
import ShareButton from '@/components/ShareButton'
import { usePostView } from '@/lib/UsePostView'
import { useContext } from 'react'  
import { UserContext } from '@/components/UserContext'
import { useInView } from '@/components/UseInView'
  
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
    created_at: string  
    is_starred_by_user: boolean
  }  
}  
  
export default function PostCard({ post, user, onViewed, community }: PostCardProps) {
  const [liked, setLiked] = useState(post.is_liked)
  const [likes, setLikes] = useState(post.likes_count)
  const [isStarred, setIsStarred] = useState(post.is_starred_by_user)
  const [page, setPage] = useState(1)
  const [menuOpen, setMenuOpen] = useState(false);
  const { user: currentUser } = useContext(UserContext)  
  const router = useRouter()
  const menuRef = useRef<HTMLDivElement>(null);
  const { ref, isVisible } = useInView();
  const isOwner = user?.id === community?.owner?.id;
  const isAdmin = community?.my_role === "admin";
  const canManage = isOwner || isAdmin;
  const hasValidCommunity =
    post?.community_id !== undefined &&
    post?.community_id !== null &&
    post?.community_id !== "undefined" &&
    post?.community_name;

  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const handlePlay = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    videoRefs.current[index]?.play();
  };
  
  usePostView(post.id, onViewed);
  
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
  
    router.push(`/main/home/${post.id}?t=${Math.floor(currentTime)}`);
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
      const result = await apiRequest(`api/post/likes/${post.id}/toggle/`, {  
        method: "POST"  
      });  
  
      setLiked(result.liked)  
      setLikes(result.likes_count)  
  
    } catch (error) {  
      console.error("Failed to toggle like:", error);  
    }  
  };
  
  const handleReport = async () => {
    const reason = prompt("Why are you reporting this post?");
    if (!reason) return;

    try {
      await apiRequest(`/api/posts/${post.id}/report/`, { reason });
      alert("Reported successfully");
    } catch (err) {
      console.error(err);
    }
  };
  
  useEffect(() => {  
    const handleScroll = () => {  
      if (  
        window.innerHeight + window.scrollY  
        >= document.body.offsetHeight - 500  
      ) {  
        setPage(prev => prev + 1)  
      }  
    }  
    window.addEventListener("scroll", handleScroll)  
    return () => window.removeEventListener("scroll", handleScroll)  
  }, [])
  
  const handleMediaClick = () => {
    router.push(`/main/home/${post.id}`);
  };
  
  return (  
    <div id={`post-${post.id}`} className="bg-white dark:bg-gray-900 p-4 border-gray-600 border-b-4 space-y-4 shadow-sm transition-colors">  
        
      {/* User info */}  
      <div className="flex items-center gap-3 mb-3">  
        <Link href={`/main/profile/${post.user.username}`} className="flex-shrink-0">  
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
        </Link>  
  
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <Link
              href={`/main/profile/${post.user.username}`}
              className="font-bold text-gray-900 dark:text-gray-100 hover:underline"
            >
              {post.user.username}
            </Link>
          
            {/* STAR BUTTON */}
            {!isStarred ? (
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
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!post?.user?.id) return;
                  handleStar();
                }}
                className="text-xs px-2 py-1 text-white rounded-md hover:bg-yellow-600"
              >
                ⭐
              </button>
            )}
          </div>
          <Link href={`/main/community/${post.community_id}`}>
          {post.community_name && (  
            <span className="text-gray-500 dark:text-gray-400 text-sm">  
              in {post.community_name}  
            </span>  
          )}  
          </Link>
        </div>

        <span className="ml-2 flex flex-1 items-center text-gray-500 text-sm">  
          <AlarmClock className="text-sm mr-1" /> {timeAgo(post.created_at)}  
        </span>

      <div className="flex items-center gap-2 relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800"
        >
          <MoreHorizontal className="w-5 text-gray-700 dark:text-gray-300 h-5" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-2 w-40 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg z-50 flex flex-col">
            <button
              onClick={handleReport}
              className="text-left px-3 py-2 text-gray-700 dark:text-gray-400 hover:bg-gray-100 hover:rounded-lg dark:hover:bg-gray-700"
            >
              Report
            </button>
            {canManage && (
              <button
                onClick={async () => {
                  await apiRequest(`api/post/${post.id}/toggle_pin/`, "POST");
                  window.location.reload(); // or update state properly
                }}
                className="text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {post.is_pinned ? "Unpin Post" : "Pin Post"}
              </button>
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
            {post.media_files.map((media, index) => {
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
        
              const { ref, isVisible } = useInView();
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
            })}
          </div>
        )}
      </div>  
  
      {/* Actions */}  
      <div className="flex items-center gap-6 mt-2">  
        <button  
          onClick={handleLike}  
          className={`flex items-center gap-1 font-medium ${  
            liked ? "text-blue-600" : "text-gray-500"  
          }`}  
        >  
          <ThumbsUp className="mr-2" />  
          {likes}  
        </button>  
  
        <button  
          onClick={handleMediaClick}  
          className="flex items-center gap-1 text-gray-500 font-medium"  
        >  
          <MessageCircle className="mr-2" />{post.comments_count}  
        </button>  
  
        <ShareButton post={post} />
  
      </div>
    </div>  
  )  
}  