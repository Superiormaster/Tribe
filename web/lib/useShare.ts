// lib/useShare.ts
import { apiRequest } from "@/utils/api";

export const useShare = () => {
  const sharePost = async (postId: number) => {
    try {
      await apiRequest(`api/post/${postId}/share/`, {
        method: "POST",
        data: { platform: "whatsapp" }
      });
    } catch (err) {
      console.error("Share failed", err);
    }
  };

  const openShareSheet = (url: string, text?: string) => {
    if (navigator.share) {
      navigator.share({
        title: "Check this out",
        text,
        url,
      });
    } else {
      navigator.clipboard.writeText(url);
      alert("Link copied!");
    }
  };

  return { sharePost, openShareSheet };
};