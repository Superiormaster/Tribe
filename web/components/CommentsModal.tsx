import CommentInput from './CommentInput'
import CommentList from './CommentList'
import { useState } from "react";
import { createPortal } from "react-dom";

type User = {
  id: number;
  username: string;
  avatar?: string;
};

export default function CommentsModal({
  postId,
  onClose,
  user,
  onCommentsCountChange,
}: {
  postId: number;
  onClose: () => void;
  user?: User | null;
  onCommentsCountChange?: (count: number) => void;
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
  
  return createPortal(
    <div className="fixed inset-0 z-[1001] bg-black/70 flex flex-col justify-end">

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
            onCommentsCountChange={onCommentsCountChange}
          />
        </div>

        {/* ✅ INPUT ALWAYS FIXED AT BOTTOM */}
        <div className="border-t p-2">
          <CommentInput
            user={user ?? null}
            onCommentsCountChange={onCommentsCountChange}
            postId={postId}
            replyTarget={replyTarget}
            onNewComment={(newComment) => {
              setComments(prev => {
                  if (!newComment.parent) {
                      return [newComment, ...prev];
                  }
          
                  const addReply = (list: any[]): any[] =>
                      list.map(c => {
                          if (c.id === newComment.root_parent_id) {
                              return {
                                  ...c,
                                  replies: [...(c.replies ?? []), newComment],
                              };
                          }
          
                          return {
                              ...c,
                              replies: c.replies ? addReply(c.replies) : [],
                          };
                      });
          
                  return addReply(prev);
              });
            }}
            onReplaceComment={onReplaceComment}
            onRemoveComment={onRemoveComment}
            onClearReply={() =>
              setReplyTarget({ id: null, type: null })
            }
          />
        </div>

      </div>
    </div>,
    document.body
  );
}