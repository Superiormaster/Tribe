import { apiRequest } from "@/utils/api";
import { updateFeedPost } from "@/lib/feedDb";

export const useShare = () => {
  const recordShare = async (
    postId: number,
    platform: string
  ) => {
    try {
      const res = await apiRequest(
        `api/post/${postId}/share/`,
        {
          method: "POST",
          data: {
            platform,
          },
        }
      );

      if (typeof res.shares_count === "number") {
        await updateFeedPost(postId, {
          shares_count: res.shares_count,
        });
      }
  
      return res;
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  return {
    recordShare,
  };
};