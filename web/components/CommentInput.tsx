'use client';

import { useState } from "react";
import { apiRequest } from "@/utils/api";
import { Send } from "lucide-react";

type ReplyTarget = {
  id: number | null;
  username?: string;
  type?: "reply" | "comment" | null;
};

interface CommentInputProps {
  postId: number;
  replyTarget?: ReplyTarget | null;
  onNewComment: (comment: any) => void;
  onClearReply?: () => void;
}

export default function CommentInput({
  postId,
  replyTarget,
  onNewComment,
  onClearReply,
}: CommentInputProps) {
  const [text, setText] = useState("");

  const handleSend = async () => {
    if (!text.trim()) return;

    const res = await apiRequest("api/comments/", {
      method: "POST",
      data: {
        post: Number(postId),
        text: text.trim(),
        parent: replyTarget?.id || null,
      },
    });

    setText("");
    onNewComment(res);
    onClearReply?.();
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
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            replyTarget?.id
              ? "Write a reply..."
              : "Write a comment..."
          }
          className="flex-1 px-3 py-2 rounded outline-none text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800"
        />

        <button
          onClick={handleSend}
          className="bg-indigo-600 text-white px-3 rounded"
        >
          <Send />
        </button>
      </div>
    </div>
  );
}