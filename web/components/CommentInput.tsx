'use client';

import { useState, useRef } from "react";
import { apiRequest } from "@/utils/api";
import { Send } from "lucide-react";

type ReplyTarget = {
  id: number | null;
  username?: string;
  type?: "reply" | "comment" | null;
};

interface CommentInputProps {
  postId: number;
  user: any;
  replyTarget?: ReplyTarget | null;
  onNewComment: (comment: any) => void;
  onReplaceComment?: (tempId: string, comment: any) => void;
  onRemoveComment?: (tempId: string) => void;
  onClearReply?: () => void;
  onCommentsCountChange?: (count:number)=>void;
}

export default function CommentInput({
  postId,
  user,
  replyTarget,
  onNewComment,
  onReplaceComment,
  onRemoveComment,
  onClearReply,
  onCommentsCountChange,
}: CommentInputProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [sending, setSending] = useState(false);

  const resize = () => {
    const el = textareaRef.current;
    if (!el) return;

    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  const handleSend = async () => {
    const message = text.trim();
  
    if (!message || sending) return;
  
    setSending(true);
  
    const clientId = crypto.randomUUID();
 
    const optimisticComment = {
      id: clientId,
      client_id: clientId,
      text: message,
      created_at: new Date().toISOString(),
      user,
      replies: [],
      likes_count: 0,
      is_liked: false,
      pending: true,
      parent: replyTarget?.id || null,
      root_parent_id: replyTarget?.id || null,
  
      reply_to_user: replyTarget?.username
          ? {
              username: replyTarget.username,
          }
          : null,
    };
  
    // Clear UI immediately
    setText("");
    onClearReply?.();
  
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  
    // Show immediately
    onNewComment(optimisticComment);
  
    try {
      const res = await apiRequest("api/comments/", {
        method: "POST",
        data: {
          post: Number(postId),
          text: message,
          parent: replyTarget?.id || null,
          client_id: clientId,
        },
      });
      console.log("comment input", res);
  
    } catch (err) {
      console.error(err);
  
      // Remove temp comment if request failed
      onRemoveComment?.(clientId);
  
      alert("Failed to send comment.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="w-full z-50">
      {replyTarget?.id && (
        <div className="text-xs text-gray-500 mb-1">
          Replying to {replyTarget.username}
          <button
            className="ml-2 text-red-500"
            onClick={onClearReply}
          >
            cancel
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <textarea
          ref={textareaRef}
          value={text}
          rows={1}
          onChange={(e) => {
              setText(e.target.value);
              resize();
          }}
          placeholder={
              replyTarget?.id
                  ? "Write a reply..."
                  : "Write a comment..."
          }
          className="flex-1 resize-none overflow-hidden rounded px-3 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 outline-none"
        />

        <button
          disabled={sending}
          onClick={handleSend}
          className="bg-indigo-600 text-white px-3 rounded"
        >
          <Send />
        </button>
      </div>
    </div>
  );
}