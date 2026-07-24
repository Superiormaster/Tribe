import { apiRequest } from "@/utils/api";

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