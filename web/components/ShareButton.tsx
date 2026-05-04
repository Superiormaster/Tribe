// components/ShareButton.tsx

import { Share2 } from "lucide-react";
import { useShare } from "@/lib/useShare";

export default function ShareButton({ post }: any) {
  const { sharePost, openShareSheet } = useShare();

  const handleShare = async (e: any) => {
    e.stopPropagation();

    const url = `${window.location.origin}/post/${post.id}`;

    // 🔥 track share
    await sharePost(post.id);

    // 🔥 open share UI
    openShareSheet(url, post.caption);
  };

  return (
    <button onClick={handleShare} className="flex items-center gap-1 text-gray-500 font-medium">
      <Share2 className="mr-2" />
      <span>{post.shares_count || 0}</span>
    </button>
  );
}