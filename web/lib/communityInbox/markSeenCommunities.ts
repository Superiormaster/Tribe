import { apiRequest } from "@/utils/api";

export async function markCommunitySeen(
  communityId: number
) {
  return apiRequest(
    "api/chats/mark-community-seen/",
    {
      method: "POST",
      data: {
        communityId,
      },
    }
  );
}