import { apiRequest } from "@/utils/api";

export async function markSeen(communityId: number) {
  return apiRequest(
    "api/chats/mark-seen/",
    {
      method: "POST",
      data: {
        communityId,
      },
    }
  );
}