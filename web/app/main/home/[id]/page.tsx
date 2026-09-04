'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation';
import Skeleton from '@/components/Skeleton';
import Avatar from '@/components/Avatar';
import Linkify from "linkify-react";
import { AlarmClock, ThumbsUp, ChartNoAxesColumn, Bookmark, MessageCircle } from 'lucide-react';
import CommentList from '@/components/CommentList'
import CommentInput from '@/components/CommentInput'
import ShareButton from '@/components/share/ShareButton'
import { useShareSheet } from '@/components/share/ShareContext'
import { usePostSocket } from '@/hooks/usePostSocket'
import toast from "react-hot-toast";
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
  shares_count?: number;
  comments_count: number
  liked_by_user: boolean
  views_count?: number
  is_bookmarked: boolean
  content_type: "post" | "short_video" | string
}

export default function PostPage() {
  const params = useParams()
  const searchParams = useSearchParams();
  const startTime = Number(searchParams.get("t")) || 0;
  const postId = Number(params.id)
  const [post, setPost] = useState<Post | null>(null)
  const [bookmarked, setBookmarked] = useState(false)
  const { showShare } = useShareSheet();
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState<any[]>([]);
  const [openCommentsPostId, setOpenCommentsPostId] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [liked, setLiked] = useState(false)
  const [posts, setPosts] = useState<Post[]>([]);
  const [likes, setLikes] = useState(0)

  const [replyTarget, setReplyTarget] = useState<{
    id: number | null;
    type: "comment" | "reply" | null;
    username?: string;
  }>({
    id: null,
    type: null,
  });
  
  const onReplaceComment = (clientId: string, comment: any) => {
    setComments(prev =>
      prev.map(c =>
        c?.client_id === clientId ? comment : c
      )
    );
  };
  
  const onRemoveComment = (clientId: string) => {
    setComments(prev =>
      prev.filter(c => c?.client_id !== clientId)
    );
  };
  
  const fetchCurrentUser = async () => {
    try {
      const user = await apiRequest('api/users/me/')
      setCurrentUser(user)
    } catch {
      setCurrentUser(null)
    }
  }
  
  usePostSocket({
    postId,
  
    onStats: (data) => {
      setPost(prev =>
        prev
          ? {
              ...prev,
              likes_count: data.likes_count,
              comments_count: data.comments_count,
              shares_count: data.shares_count,
              views_count: data.views_count,
            }
          : prev
      );
  
      setLikes(data.likes_count);
    },
  
    onNewComment: (data) => {
      setPost(prev =>
        prev
          ? {
              ...prev,
              comments_count: data.comments_count,
            }
          : prev
      );
  
      const newComment = data.comment;
  
      if (!newComment) return;
  
      setComments(prev => {
        // Prevent duplicates
        const alreadyExists = prev.some(
          comment =>
            Number(comment.id) === Number(newComment.id)
        );
  
        if (alreadyExists) {
          return prev;
        }
  
        // New top-level comment
        if (!newComment.parent) {
          return [newComment, ...prev];
        }
  
        // Reply
        const addReply = (list: any[]): any[] => {
          return list.map(comment => {
  
            if (
              Number(comment.id) ===
              Number(newComment.root_parent_id)
            ) {
              return {
                ...comment,
                replies: [
                  ...(comment.replies ?? []),
                  newComment,
                ],
              };
            }
  
            return {
              ...comment,
              replies: comment.replies
                ? addReply(comment.replies)
                : [],
            };
          });
        };
  
        return addReply(prev);
      });
    },
  
    onCommentDeleted: (data) => {
      setPost(prev =>
        prev
          ? {
              ...prev,
              comments_count: data.comments_count,
            }
          : prev
      );
  
      const deletedCommentId =
        Number(data.comment_id);
  
      if (!deletedCommentId) return;
  
      const removeComment = (list: any[]): any[] => {
        return list
          .filter(
            comment =>
              Number(comment.id) !== deletedCommentId
          )
          .map(comment => ({
            ...comment,
            replies: comment.replies
              ? removeComment(comment.replies)
              : [],
          }));
      };
  
      setComments(prev =>
        removeComment(prev)
      );
    },
  
    onCommentUpdated: (data) => {
      const updatedComment = data.comment;
  
      if (!updatedComment) return;
  
      const updateComment = (list: any[]): any[] => {
        return list.map(comment => {
  
          if (
            Number(comment.id) ===
            Number(updatedComment.id)
          ) {
            return {
              ...comment,
              ...updatedComment,
            };
          }
  
          return {
            ...comment,
            replies: comment.replies
              ? updateComment(comment.replies)
              : [],
          };
        });
      };
  
      setComments(prev =>
        updateComment(prev)
      );
    },
  });
  
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
      setBookmarked(data.is_bookmarked ?? false)
  
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
  
  const handleBookmark = async () => {
    if (!post) return;
  
    try {
      const result = await apiRequest(
        `api/bookmarks/toggle/`,
        {
          method: "POST",
          data: {
            type:
              post.content_type === "short_video"
                ? "reel"
                : "post",
            post_id: post.id,
          },
        }
      );
  
      setBookmarked(result.bookmarked);
  
      // Keep the post object in sync too
      setPost(prev =>
        prev
          ? {
              ...prev,
              is_bookmarked: result.bookmarked,
            }
          : prev
      );
  
    } catch (error) {
      console.error("Failed to toggle bookmark:", error);
      toast.error("Failed to update bookmark");
    }
  };
  
  useEffect(() => {
    fetchPost()
    fetchCurrentUser()
  }, [])
  
  const onCommentsCountChange = (count: number) => {
    setPost(prev =>
        prev ? {
            ...prev,
            comments_count: count,
        } : prev
    );
  };
  
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
      <div className="flex items-center gap-3 mt-24 mb-8">
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
          className={`flex items-center gap-1 text-xs text-gray-500 font-medium ${
            liked ? "text-blue-600" : ""
          }`}
        >
          <ThumbsUp className="w-4 h-4 inline mr-2" />
          {likes > 0 && (
            <span>{likes}</span>
          )}
        </button>
    
        <button className="flex items-center gap-1 text-xs text-gray-500 font-medium">
          <MessageCircle className="mr-2 w-4 h-4" />
          {post.comments_count > 0 && (
            <span>{post.comments_count}</span>
          )}
        </button>
        <ShareButton
          post={post}
          sharesCount={post.shares_count ?? 0}
          onOpen={(post) => showShare(post)}
        />
  
        <button
          onClick={handleBookmark}
          className={`flex text-xs items-center gap-1 font-medium transition ${
            bookmarked
              ? "text-blue-600"
              : ""
          }`}
          aria-label={
            bookmarked
              ? "Remove bookmark"
              : "Bookmark post"
          }
        >
          <Bookmark
            className={`mr-2 h-4 w-4 ${
              bookmarked ? "fill-current" : ""
            }`}
          />
        </button>
    
        {post.views_count !== undefined && (
          <span className="text-gray-400 ml-auto text-xs flex items-center">
            <ChartNoAxesColumn className="mr-2 w-4 h-4" />
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
            <p className="mb-2 whitespace-pre-line text-gray-600 dark:text-gray-300">
              {post.caption}
            </p>
          </Linkify>
        )}
  
        <PostMedia />
  
        <PostActions />
  
        <CommentList 
          user={currentUser}
          postId={postId}
          setReplyTarget={setReplyTarget}
          onCommentsCountChange={onCommentsCountChange}
          comments={comments}
          setComments={setComments}
        />
  
      </div>
  
      {/* FIXED INPUT */}
      <div className="fixed bottom-0 left-0 w-full border-t bg-white dark:bg-gray-900 z-50">
        <div className="max-w-3xl mx-auto flex gap-2 p-3">
          <CommentInput
            user={currentUser}
            postId={postId}
            replyTarget={replyTarget}
            onClearReply={() =>
              setReplyTarget({ id: null, type: null })
            }
            onCommentsCountChange={onCommentsCountChange}
            onReplaceComment={onReplaceComment}
            onRemoveComment={onRemoveComment}
            onNewComment={(newComment) => {
              setComments(prev => {
                const exists = prev.some(
                  comment =>
                    Number(comment.id) === Number(newComment.id)
                )
            
                if (exists) return prev
            
                if (!newComment.parent) {
                  return [newComment, ...prev]
                }
            
                const addReply = (list: any[]): any[] =>
                  list.map(comment => {
                    if (
                      Number(comment.id) ===
                      Number(newComment.root_parent_id)
                    ) {
                      return {
                        ...comment,
                        replies: [
                          ...(comment.replies ?? []),
                          newComment,
                        ],
                      }
                    }
            
                    return {
                      ...comment,
                      replies: comment.replies
                        ? addReply(comment.replies)
                        : [],
                    }
                  })
            
                return addReply(prev)
              })
            }}
          />
        </div>
      </div>
  
    </div>
  );
}