'use client';

import { useState, useEffect, useRef } from "react";
import { apiRequest } from "@/utils/api";
import Avatar from "@/components/Avatar";
import { timeAgo } from "@/utils/timeAgo";
import ReportCommentModal from "@/components/ReportCommentModal";
import { connectCommentsSocket } from "@/lib/comment-socket";
import { ThumbsUp } from 'lucide-react';  
type ReplyTarget = {
  id: number | null;
  type: "reply" | "comment" | null;
  username?: string;
};

type User = {
  id: number;
  username: string;
  avatar?: string;
};

type Comment = {
  id: number;
  text: string;
  created_at: string;
  user: User;
  replies?: Comment[];
  likes_count?: number;
  is_liked?: boolean;
};

interface CommentListProps {
  postId: number;
  user: User | null;
  replyTarget?: ReplyTarget | null;
  setReplyTarget: React.Dispatch<React.SetStateAction<ReplyTarget>>;
  comments: Comment[];
  setComments: React.Dispatch<React.SetStateAction<Comment[]>>;
}

export default function CommentList({
  postId,
  user,
  setReplyTarget,
  comments,
  setComments,
}: CommentListProps) {
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showReplies, setShowReplies] = useState<Record<number, boolean>>({});
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  
  const [editTarget, setEditTarget] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [reportTarget, setReportTarget] = useState<number | null>(null);
 
  const loaderRef = useRef<HTMLDivElement | null>(null);
  
  const toggleReplies = (commentId: number) => {
    setShowReplies(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
  };
  
  const handleReport = async () => {
    if (!reportTarget) return;
  
    if (!reportReason) {
      alert("Please select a reason");
      return;
    }
  
    try {
      const res = await apiRequest(
        `api/comments/${reportTarget}/report/`,
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
      setReportTarget(null);
      setReportReason("");
      setReportDetails("");
    } catch (err: any) {
      alert(
        err?.data?.message ||
        "Failed to submit report"
      );
    }
  };
  
  const handleCopyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied");
    } catch (err) {
      console.error("Failed to copy text", err);
    }
  };
  
  const handleEdit = async (commentId: number) => {
    if (!editText.trim()) return;
  
    try {
      const res = await apiRequest(`api/comments/${commentId}/edit/`, {
        method: "PATCH",
        data: {
          text: editText.trim(),
        },
      });
  
      setComments(prev =>
        updateCommentTree(prev, commentId, (c: any) => ({
          ...c,
          text: res.text,
        }))
      );
  
      setEditTarget(null);
      setEditText("");
    } catch (err) {
      console.error("Edit failed", err);
    }
  };
  
  // 🔥 Fetch comments
  const fetchComments = async (url?: string) => {
    try {
      const safePostId = Number(postId);

      if (!safePostId) return;
      const finalUrl = url || `api/comments/?post=${safePostId}`;

      const data = await apiRequest(finalUrl);
  
      const results = Array.isArray(data) ? data : data.results || [];

      setComments((prev) =>
        url ? [...prev, ...results] : results
      );
  
      setNextPage(data.next || null);
    } catch (err) {
      console.error("Failed to fetch comments", err);
    }
  };
  
  const handleLike = async (id: number) => {
    try {
      const res = await apiRequest(
        `api/comment-likes/${id}/toggle/`,
        { method: "POST" }
      );
    
      setComments(prev =>
        updateCommentTree(prev, id, (c: any) => ({
          ...c,
          likes_count: res.likes_count,
          is_liked: res.liked,
        }))
      );
    } catch (err) {
      console.error("Like failed", err);
    }
  };
  
  const handleDeleteComment = async (commentId: number) => {
    setComments(prev =>
      removeCommentFromTree(prev, commentId)
    );

    try {
      await apiRequest(`api/comments/${commentId}/`, {
        method: "DELETE",
      });
  
      setDeleteTarget(null);
    } catch (err) {
      console.error("Failed to delete comment", err);
    }
  };
  
  const updateCommentTree = (
    list: Comment[],
    id: number,
    updateFn: (comment: Comment) => Comment
  ): Comment[] => {
    return list.map((item) => {
      if (item.id === id) {
        return updateFn(item);
      }
  
      if (item.replies?.length) {
        return {
          ...item,
          replies: updateCommentTree(item.replies, id, updateFn),
        };
      }
  
      return item;
    });
  };
  
  const removeCommentFromTree = (
    list: Comment[],
    id: number
  ): Comment[] => {
    return list
      .filter(item => item.id !== id)
      .map(item => ({
        ...item,
        replies: item.replies
          ? removeCommentFromTree(item.replies, id)
          : []
      }));
  };
 
  const CommentItem = ({
    item,
    depth = 0,
  }: {
    item: Comment;
    depth?: number;
  }) => {
    const isOpen = showReplies[item.id] ?? false;
    const isLiked = item.is_liked ?? false;
    const likesCount = item.likes_count ?? 0;
    const isOwner = user?.id === item.user?.id;
    const replies = item.replies ?? [];
  
    return (
      <div className={`mt-2 ${depth > 0 ? "ml-6 border-l pl-3" : ""}`}>
        
        <div className="flex gap-2">
          <Avatar
            username={item.user?.username}
            avatarUrl={item.user?.avatar}
            size={depth > 0 ? 6 : 8}
          />
  
          <div className="w-full">
  
              <p className="text-sm text-gray-600 dark:text-gray-300 font-semibold">
                {item.user?.username}
              </p>
    
              {editTarget === item.id ? (
                <div className="mt-2">
                  <input
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full p-2 border rounded"
                  />
              
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleEdit(item.id)}
                      className="bg-green-600 text-white px-3 py-1 rounded"
                    >
                      Save
                    </button>
              
                    <button
                      onClick={() => setEditTarget(null)}
                      className="px-3 py-1"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs dark:text-gray-300 text-gray-600">{item.text}</p>
              )}
    
              {/* ACTIONS */}
              <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
    
                {/* 👍 LIKE */}
                <button
                  onClick={(e) => { 
                    e.stopPropagation();
                    handleLike(item.id);
                  }}
                  className={`flex items-center gap-1 ${isLiked ? "text-blue-600" : ""
                  }`}
                >
                  <ThumbsUp size={14} />
                  {likesCount > 0 && (
                    <span>{likesCount}</span>
                  )}
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
  
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(prev =>
                        prev === `reply-${item.id}-${depth}`
                          ? null
                          : `reply-${item.id}-${depth}`
                      );
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ⋮
                  </button>
                
                  {openMenuId === `reply-${item.id}-${depth}` && (
                    <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-800 shadow-lg rounded-lg z-50">
                      {isOwner ? (
                        <>
                          <button
                            onClick={() => {
                              handleDeleteComment(item.id);
                              setOpenMenuId(null);
                            }}
                            className="w-full text-left px-3 py-2 text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            Delete
                          </button>
                      
                          <button
                            onClick={() => {
                              setEditTarget(item.id);
                              setEditText(item.text);
                              setOpenMenuId(null);
                            }}
                            className="w-full text-left px-3 py-2"
                          >
                            Edit
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setReportTarget(item.id);
                              setReportOpen(true);
                              setOpenMenuId(null);
                            }}
                            className="w-full text-left px-3 py-2"
                          >
                            Report
                          </button>
                    
                          <button
                            onClick={() => {
                              handleCopyText(item.text);
                              setOpenMenuId(null);
                            }}
                            className="w-full text-left px-3 py-2"
                          >
                            Copy text
                          </button>
                        </>
                      )}
                
                      <button
                        onClick={() => setOpenMenuId(null)}
                        className="w-full text-left px-3 py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                
                    </div>
                  )}
                </div>
              </div>
    
              {/* 🔥 VIEW / HIDE TOGGLE */}
              {replies.length > 0 && (
                <button
                  onClick={() => toggleReplies(item.id)}
                  className="text-xs text-gray-500 mt-1"
                >
                  {isOpen
                    ? "Hide replies"
                    : `View replies (${replies.length})`}
                </button>
              )}
              
              {isOpen && replies.length > 0 && (
                <div className="mt-2">
                  {replies.map((child, index) => (
                    <CommentItem
                      key={`reply-${child.id}-${depth}-${index}`}
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
    let ws: WebSocket | null = null;
  
    const init = async () => {
      ws = await connectCommentsSocket(postId);
  
      if (!ws) return;
  
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
  
        if (data.type === "new_comment") {
          const newComment = data.comment;
  
          setComments(prev => {
            const addReply = (list: Comment[]): Comment[] =>
              list.map((c: Comment) => {
                if (c.id === newComment.root_parent_id) {
                  return {
                    ...c,
                    replies: [...(c.replies || []), newComment],
                  };
                }
            
                if (c.replies?.length) {
                  return {
                    ...c,
                    replies: addReply(c.replies),
                  };
                }
            
                return c;
              });
  
            return addReply(prev);
          });
        }
      };
    };
  
    init();
  
    return () => {
      if (ws) ws.close();
    };
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
          {comments?.length === 0 && (
            <p className="text-gray-500">No comments yet</p>
          )}
  
          {comments?.map((comment) => {
            const isLiked = comment.is_liked ?? false;
            const likesCount = comment.likes_count ?? 0;
            const isOwner = user?.id === comment.user?.id;
            const replies = comment.replies ?? [];

            return (
              <div key={`comment-${comment.id}`} className="flex gap-2">
                
                <Avatar
                  username={comment.user?.username}
                  avatarUrl={comment.user?.avatar}
                  size={8}
                />
            
                <div className="w-full">
            
                    {/* username */}
                    <p className="font-semibold text-gray-600 dark:text-gray-300 text-sm">
                      {comment.user?.username}
                    </p>
              
                    {/* text */}
                    {editTarget === comment.id ? (
                      <div className="mt-2">
                        <input
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full p-2 border rounded"
                        />
                    
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleEdit(comment.id)}
                            className="bg-green-600 text-white px-3 py-1 rounded"
                          >
                            Save
                          </button>
                    
                          <button
                            onClick={() => setEditTarget(null)}
                            className="px-3 py-1"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs dark:text-gray-300 text-gray-600">{comment.text}</p>
                    )}
              
                    {/* actions */}
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
              
                      {/* 👍 LIKE */}
                      <button
                      onClick={(e) =>{
                        e.stopPropagation();
                        handleLike(comment.id);
                      }}
                      className={`flex items-center font-medium gap-1 ${
                        isLiked ? "text-blue-600" : "text-gray-500"
                      }`}
                    >
                      <ThumbsUp size={14} className="mr-2" />

                      {likesCount > 0 && (
                        <span>{likesCount}</span>
                      )}
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
  
                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(prev =>
                      prev === `comment-${comment.id}`
                        ? null
                        : `comment-${comment.id}`
                    );
                          }}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          ⋮
                        </button>
                      
                        {openMenuId === `comment-${comment.id}` && (
                          <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-800 shadow-lg rounded-lg z-50">
                            {isOwner ? (
                              <>
                                <button
                                  onClick={() => {
                                    handleDeleteComment(comment.id);
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full text-left px-3 py-2 text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                  Delete
                                </button>
                            
                                <button
                                  onClick={() => {
                              setEditTarget(comment.id);
                              setEditText(comment.text);
                              setOpenMenuId(null);
                            }}
                                  className="w-full text-left px-3 py-2"
                                >
                                  Edit
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    setReportTarget(comment.id);
                                    setReportOpen(true);
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full text-left px-3 py-2"
                                >
                                  Report
                                </button>
            
                                <button
                                  onClick={() => {
                                    handleCopyText(comment.text);
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full text-left px-3 py-2"
                                >
                                  Copy text
                                </button>
                              </>
                            )}
                      
                            <button
                              onClick={() => setOpenMenuId(null)}
                              className="w-full text-left px-3 py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              Cancel
                            </button>
                      
                          </div>
                        )}
                      </div>
                    </div>
      
                    {/* 🔥 REPLIES */}
                    {replies.length > 0 && (
                      <div className="ml-6 mt-2">
                    
                        <button
                          onClick={() => toggleReplies(comment.id)}
                          className="text-xs text-gray-500"
                        >
                          {showReplies[comment.id]
                            ? "Hide replies"
                            : `View replies (${replies.length})`}
                        </button>
                    
                        {showReplies[comment.id] && (
                          <div className="mt-2">
                            {replies.map((reply, index) => (
                              <CommentItem
                                key={`reply-${reply.id}-${index}`}
                                item={reply}
                                depth={1}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                </div>
              </div>
            );
          })}
  
          {/* 🔥 Auto loader trigger */}
          {nextPage && (
            <div ref={loaderRef} className="h-10 flex items-center justify-center text-gray-400">
              {loadingMore ? "Loading..." : " "}
            </div>
          )}
        </div>

        <ReportCommentModal
          open={reportOpen}
          reason={reportReason}
          details={reportDetails}
          setReason={setReportReason}
          setDetails={setReportDetails}
          onClose={() => {
            setReportOpen(false);
            setReportReason("");
            setReportDetails("");
            setReportTarget(null);
          }}
          onSubmit={handleReport}
        />
      </div>
  );
}