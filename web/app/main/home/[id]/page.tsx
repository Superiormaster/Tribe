'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation';
import Skeleton from '@/components/Skeleton';
import Avatar from '@/components/Avatar';
import { Share2, AlarmClock, ThumbsUp, ChartNoAxesColumn, MessageCircle } from 'lucide-react';
import CommentList from '@/components/CommentList'
import CommentInput from '@/components/CommentInput'
import ShareButton from '@/components/ShareButton'
import { apiRequest } from '@/utils/api'
import { timeAgo } from '@/utils/timeAgo'

type User = {
  id: number
  username: string
  avatar?: string
}

type MediaFile = {
  file_url: string
  thumbnail_url?: string
  media_type: "image" | "video"
}

type Post = {
  id: number
  user: User
  caption?: string
  content_file?: string
  media_files: MediaFile[]
  community_name?: string
  created_at: string
  updated_at?: string
  is_edited?: boolean
  likes_count: number
  comments_count: number
  liked_by_user: boolean
  views_count?: number
}

export default function PostPage() {
  const params = useParams()
  const searchParams = useSearchParams();
  const startTime = Number(searchParams.get("t")) || 0;
  const postId = Number(params.id)
  const [post, setPost] = useState<Post | null>(null)
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState<any[]>([]);
  const [openCommentsPostId, setOpenCommentsPostId] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [liked, setLiked] = useState(false)
  const [likes, setLikes] = useState(0)

  const [replyTarget, setReplyTarget] = useState<{
    id: number | null;
    type: "comment" | "reply" | null;
    username?: string;
  }>({
    id: null,
    type: null,
  });
  
  const fetchCurrentUser = async () => {
    try {
      const user = await apiRequest('api/users/me/')
      setCurrentUser(user)
    } catch {
      setCurrentUser(null)
    }
  }
  
  useEffect(() => {
    if (!post?.id) return;
  
    const recordView = async () => {
      await apiRequest(`api/post/${post.id}/view/`, {
        method: "POST",
      });
    };

    setPost(prev => prev ? {
      ...prev,
      views_count: (prev.views_count || 0) + 1
    } : prev)
  
    recordView();
  }, [post?.id]);

  const fetchPost = async () => {
    try {
      const data = await apiRequest(`api/post/${postId}/`)
  
      setPost(data)
  
      setLikes(data.likes_count)
      setLiked(data.liked_by_user)
  
    } catch (err) {
      console.error(err)
    }
  }

  const handleLike = async () => {
    if (!post) return;

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
  
  useEffect(() => {
    fetchPost()
    fetchCurrentUser()
  }, [])
  
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && startTime > 0) {
      videoRef.current.currentTime = startTime;
      videoRef.current.play();
    }
  }, [post]);

  const PostHeader = () => {
    if (!post) return null;
  
    return (
      <div className="flex items-center gap-3 mb-6 mt-4">
        <Avatar username={post.user.username} avatarUrl={post.user.avatar} size={12} />
    
        <div className="flex flex-col">
          <span className="font-bold text-gray-700 dark:text-gray-100">{post.user.username}</span>
    
          {post.community_name && (
            <span className="text-sm text-gray-500">
              in {post.community_name}
            </span>
          )}
        </div>
    
        <span className="ml-auto flex items-center text-gray-600 dark:text-gray-400 text-sm">
          <AlarmClock className="mr-1" />
           {post.is_edited ? (
              <>
                Edited • {timeAgo(post.updated_at ?? post.created_at)}
              </>
            ) : (
              timeAgo(post.created_at)
            )}
        </span>
      </div>
    );
  };
  
  const PostMedia = () => {
    if (!post) return null;
    if (!post.media_files?.length) return null;
  
    return (
      <div className="flex flex-col gap-4">
        {post.media_files.map((media, index) => (
          <div
            key={index}
            className="w-full bg-gray-200 dark:bg-gray-700 rounded-xl overflow-hidden"
          >
            {media.media_type === "image" ? (
              <img
                src={media.file_url}
                alt="Post media"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <video
                src={media.file_url}
                poster={media.thumbnail_url}
                ref={videoRef}
                controls
                autoPlay
                className="w-full aspect-video object-cover"
                preload="metadata"
              />
            )}
          </div>
        ))}
      </div>
    );
  };
  
  const PostActions = () => {
    if (!post) return null;
  
    return (
      <div className="flex items-center gap-6 my-6">
        
        <button
          onClick={handleLike}
          className={`flex items-center gap-1 text-gray-500 font-medium ${
            liked ? "text-blue-600" : ""
          }`}
        >
          <ThumbsUp className="inline mr-2" />
          {likes > 0 && (
            <span>{likes}</span>
          )}
        </button>
    
        <button className="flex items-center gap-1 text-gray-500 font-medium">
          <MessageCircle className="mr-2" />
          {post.comments_count > 0 && (
            <span>{post.comments_count}</span>
          )}
        </button>
        <ShareButton post={post} />
    
        {post.views_count !== undefined && (
          <span className="text-gray-400 ml-auto flex items-center">
            <ChartNoAxesColumn className="mr-2" />
            {post.views_count > 0 && (
              <span>{post.views_count} </span>
            )}
          </span>
        )}
    
      </div>
    );
  };

  if (!post) return <Skeleton />

  return (
    <div className="relative">
  
      <div className="px-4 pb-28 max-w-3xl mx-auto w-full">
  
        <PostHeader />
  
        {post.caption && (
          <p className="mb-2 whitespace-pre-line text-gray-600 dark:text-gray-300">
            {post.caption}
          </p>
        )}
  
        <PostMedia />
  
        <PostActions />
  
        <CommentList 
          user={currentUser}
          postId={postId}
          setReplyTarget={setReplyTarget}
          comments={comments}
          setComments={setComments}
        />
  
      </div>
  
      {/* FIXED INPUT */}
      <div className="fixed bottom-0 left-0 w-full border-t bg-white dark:bg-gray-900 z-50">
        <div className="max-w-3xl mx-auto flex gap-2 p-3">
          <CommentInput
            postId={postId}
            replyTarget={replyTarget}
            onClearReply={() =>
              setReplyTarget({ id: null, type: null })
            }
            onNewComment={(newComment: any) =>
              setComments((prev) => [newComment, ...prev])
            }
          />
        </div>
      </div>
  
    </div>
  );
}