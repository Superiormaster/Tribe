import CommentInput from './CommentInput'
import CommentList from './CommentList'
import { useState } from "react";

type User = {
  id: number;
  username: string;
  avatar?: string;
};

export default function CommentsModal({
  postId,
  onClose,
  user,
}: {
  postId: number;
  onClose: () => void;
  user?: User | null;
}) {
  const [comments, setComments] = useState<any[]>([]);
  const [replyTarget, setReplyTarget] = useState<{
    id: number | null;
    type: "comment" | "reply" | null;
    username?: string;
  }>({
    id: null,
    type: null,
  });
  
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex flex-col justify-end">

      {/* backdrop */}
      <div className="flex-1" onClick={onClose} />

      {/* panel */}
      <div className="bg-white dark:bg-gray-900 rounded-t-2xl max-h-[80%] flex flex-col">

        <div className="p-3 border-b text-center font-semibold">
          Comments
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <CommentList
            user={user ?? null}
            postId={postId}
            comments={comments}
            setComments={setComments}
            setReplyTarget={setReplyTarget}
          />
        </div>

        {/* ✅ INPUT ALWAYS FIXED AT BOTTOM */}
        <div className="border-t p-2">
          <CommentInput
            postId={postId}
            replyTarget={replyTarget}
            onNewComment={(comment) =>
              setComments((prev) => [...prev, comment])
            }
            onClearReply={() =>
              setReplyTarget({ id: null, type: null })
            }
          />
        </div>

      </div>
    </div>
  );
}