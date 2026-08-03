"use client";

import { useEffect, useState } from "react";
import { X, MoreHorizontal } from "lucide-react";
import MediaCarousel from "./MediaCarousel";
import MediaCaption from "./MediaCaption";
import MediaActions from "./MediaActions";
import { createPortal } from "react-dom";

interface Props {
  open: boolean;
  post: any;
  startIndex?: number;
  liked: boolean;
  likes: number;
  onClose: () => void;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onRepost: () => void;
  onMore: () => void;
  more: () => void;
}

export default function MediaViewer({
  open,
  post,
  startIndex = 0,
  liked,
  likes,
  onClose,
  onLike,
  onComment,
  onShare,
  onRepost,
  onMore,
  more,
}: Props) {
  const [index, setIndex] = useState(startIndex);

  useEffect(() => {
    setIndex(startIndex);
  }, [startIndex]);
  
  useEffect(() => {
    if (!open) return;

    window.dispatchEvent(
      new CustomEvent("media-viewer-change", {
        detail: { open: true },
      })
    );

    return () => {
      window.dispatchEvent(
        new CustomEvent("media-viewer-change", {
          detail: { open: false },
        })
      );
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open || !post) return null;

  return createPortal(
    <div className="fixed border-t dark:border-gray-800 border-gray-600 inset-0 z-[999] bg-gray-200 dark:bg-gray-900 flex flex-col">

      <div className="flex items-center justify-between p-3 text-gray-500">
        <button onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}>
          <X size={28}/>
        </button>

        {/*}<button onClick={onMore}>
          <MoreHorizontal size={24}/>
        </button>*/}
      </div>

      <MediaCarousel
        media={post.media_files}
        index={index}
        setIndex={setIndex}
      />

      <MediaCaption 
        caption={post.caption}
        more={more}
      />

      <MediaActions
        liked={liked}
        likes={likes}
        comments={post.comments_count}
        views={post.views_count}
        onLike={onLike}
        onComment={onComment}
        onShare={onShare}
        onRepost={onRepost}
      />

    </div>,
    document.body
  );
}