'use client';

import { useState, useEffect, useRef } from "react";
import { apiRequest } from "@/utils/api";
import Avatar from "@/components/Avatar";
import { timeAgo } from "@/utils/timeAgo";
import { localSocket } from "@/lib/socket";
import { ThumbsUp } from 'lucide-react';  

export default function CommentList({ postId, user, setReplyTarget, }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showReplies, setShowReplies] = useState<Record<number, boolean>>({});
  const socket = new WebSocket("ws://192.168.43.12:8000/ws/comments/21/");

  socket.onopen = () => console.log("CONNECTED ✅");
  socket.onerror = (e) => console.log("ERROR ❌", e);

  const loaderRef = useRef<HTMLDivElement | null>(null);
  
  const toggleReplies = (commentId: number) => {
    setShowReplies(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
  };
  
  // 🔥 Fetch comments
  const fetchComments = async (url?: string) => {
    try {
      const safePostId = Number(postId);

      if (!safePostId) return;
      const finalUrl = url || `/api/comments/?post=${safePostId}`;

      const data = await apiRequest(finalUrl);
  
      const results = data.results || data;

      setComments((prev) =>
        url ? [...prev, ...results] : results
      );
  
      setNextPage(data.next || null);
    } catch (err) {
      console.error("Failed to fetch comments", err);
    }
  };
  
  const handleLike = async (id: number) => {
    const res = await apiRequest(
      `/api/comment-likes/${id}/toggle/`,
      { method: "POST" }
    );
  
    setComments(prev =>
      updateCommentTree(prev, id, (c: any) => ({
        ...c,
        likes_count: res.likes_count,
        is_liked: res.liked,
      }))
    );
  };
  
  const updateCommentTree = (list: any[], id: number, updateFn: Function) => {
    return list.map(item => {
      if (item.id === id) {
        return updateFn(item);
      }
  
      if (item.replies?.length) {
        return {
          ...item,
          replies: updateCommentTree(item.replies, id, updateFn)
        };
      }
  
      return item;
    });
  };
  
  const handleReply = async (commentId: number) => {
    const text = replyText[commentId];
  
    if (!text?.trim()) return;
  
    await apiRequest("/api/comments/", {
      method: "POST",
      data: {
        post: postId,
        text,
        parent: commentId,
      },
    });
  
    setReplyText(prev => ({
      ...prev,
      [commentId]: ""
    }));
  
    setReplyingTo(null);
  };
  
  const CommentItem = ({ item, depth = 0 }) => {
    const isOpen = showReplies[item.id] ?? false;
  
    return (
      <div className={`mt-2 ${depth > 0 ? "ml-6 border-l pl-3" : ""}`}>
        
        <div className="flex gap-2">
          <Avatar
            username={item.user?.username}
            avatarUrl={item.user?.avatar}
            size={depth > 0 ? 6 : 8}
          />
  
          <div className="w-full">
  
            <p className="text-sm font-semibold">
              {item.user?.username}
            </p>
  
            <p className="text-xs text-gray-600">
              {item.text}
            </p>
  
            {/* ACTIONS */}
            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
  
              {/* 👍 LIKE */}
              <button
                onClick={() => handleLike(item.id)}
                className={`flex items-center gap-1 ${
                  item.is_liked ? "text-blue-600" : "text-gray-500"
                }`}
              >
                <ThumbsUp size={14} />
                {item.likes_count || 0}
              </button>
  
              {/* 💬 REPLY */}
              <button
                onClick={() =>
                  setReplyTarget({
                    id: item.id,
                    type: "reply",
                    username: item.user.username,
                  })
                }
                className="hover:text-green-500"
              >
                Reply
              </button>
  
              <span>{timeAgo(item.created_at)}</span>
            </div>
  
            {/* 🔥 VIEW / HIDE TOGGLE */}
            {item.replies?.length > 0 && (
              <button
                onClick={() => toggleReplies(item.id)}
                className="text-xs text-gray-500 mt-1"
              >
                {isOpen
                  ? "Hide replies"
                  : `View replies (${item.replies.length})`}
              </button>
            )}
  
            {/* 🔥 REPLIES (RECURSIVE) */}
            {isOpen && item.replies?.length > 0 && (
              <div className="mt-2">
                {item.replies.map(child => (
                  <CommentItem
                    key={child.id}
                    item={child}
                    depth={depth + 1}
                  />
                ))}
              </div>
            )}
  
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    const socket = localSocket(postId);
  
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
    
      if (data.type === "new_comment") {
        const newComment = data.comment;
    
        setComments(prev => {
          const exists = prev.find(c => c.id === newComment.root_parent_id);
        
          if (!exists) {
            return prev;
          }
        
          return prev.map(comment => {
            if (comment.id === newComment.root_parent_id) {
              return {
                ...comment,
                replies: [...(comment.replies || []), newComment]
              };
            }
            return comment;
          });
        });
      }
    };

    return () => socket.close();
  }, [postId]);

  useEffect(() => {
    if (!postId) return;

    setComments([]);
    setNextPage(null);
    fetchComments();
  }, [postId]);

  // 🔥 Infinite scroll (auto load more)
  useEffect(() => {
    if (!loaderRef.current || !nextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore) {
          setLoadingMore(true);
          fetchComments(nextPage).finally(() => setLoadingMore(false));
        }
      },
      { threshold: 1 }
    );

    observer.observe(loaderRef.current);

    return () => observer.disconnect();
  }, [nextPage, loadingMore]);

  return (
    <div className="relative mt-6">

      {/* COMMENTS */}
      <div className="space-y-4 pb-24">
        {comments.length === 0 && (
          <p className="text-gray-500">No comments yet</p>
        )}

        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-2">
            
            <Avatar
              username={comment.user?.username}
              avatarUrl={comment.user?.avatar}
              size={8}
            />
        
            <div className="w-full">
        
              {/* username */}
              <p className="font-semibold text-sm">
                {comment.user?.username}
              </p>
        
              {/* text */}
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                {comment.text}
              </p>
        
              {/* actions */}
              <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
        
                {/* 👍 LIKE */}
                <button
                onClick={() => handleLike(comment.id)}
                className={`flex items-center font-medium gap-1 ${
                  comment.is_liked ? "text-blue-600" : "text-gray-500"
                }`}
              >
                <ThumbsUp size={14} mr-2/>
               {comment.likes_count || 0}
              </button>
        
                {/* 💬 REPLY BUTTON */}
                <button
                  onClick={() =>
                    setReplyTarget({
                      id: comment.id,
                      type: "comment",
                      username: comment.user.username,
                    })
                  }
                  className="hover:text-green-500"
                >
                  Reply
                </button>
        
                <span>{timeAgo(comment.created_at)}</span>
              </div>

              {/* 🔥 REPLIES */}
              {comment.replies?.length > 0 && (
                <div className="ml-6 mt-2">
              
                  {/* TOGGLE BUTTON */}
                  <button
                    onClick={() => toggleReplies(comment.id)}
                    className="text-xs text-gray-500 mb-2"
                  >
                    {showReplies[comment.id]
                      ? "Hide replies"
                      : `View replies (${comment.replies.length})`}
                  </button>
              
                  {/* ONLY SHOW WHEN OPEN */}
                  {showReplies[comment.id] &&
                    comment.replies.map(reply => (
                      <CommentItem key={reply.id} item={reply} />
                    ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* 🔥 Auto loader trigger */}
        {nextPage && (
          <div ref={loaderRef} className="h-10 flex items-center justify-center text-gray-400">
            {loadingMore ? "Loading..." : " "}
          </div>
        )}
      </div>
    </div>
  );
}