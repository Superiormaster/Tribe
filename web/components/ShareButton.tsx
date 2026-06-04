// components/ShareButton.tsx

import { Share2 } from "lucide-react";
import { useShare } from "@/lib/useShare";

type Props = {
  post: any;
  vertical?: boolean;
  dark?: boolean;
};

export default function ShareButton({
  post,
  vertical = false,
  dark = false,
}: Props) {
  const { sharePost, openShareSheet } = useShare();

  const handleShare = async (e: any) => {
    e.stopPropagation();

    const url = `${window.location.origin}/post/${post.id}`;

    await sharePost(post.id);

    openShareSheet(url, post.caption);
  };

  return (
    <button
      onClick={handleShare}
      className={`font-medium ${
        vertical
          ? "flex flex-col items-center gap-1"
          : "flex items-center gap-1"
      } ${
        dark ? "text-white" : "text-gray-500"
      }`}
    >
      <Share2 className={vertical ? "w-7 h-7" : "mr-2"} />

      {post.shares_count > 0 && (
        <span className={vertical ? "text-xs" : ""}>
          {post.shares_count}
        </span>
      )}
    </button>
  );
}