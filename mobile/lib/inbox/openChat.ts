import { apiRequest } from "@/utils/api";

export async function openChat(userId: number) {
  return await apiRequest(
    "api/chats/get-or-create/",
    {
      method: "POST",
      data: {
        user_id: userId,
      },
    }
  );
}

export async function openCommunityChat(communityId: number) {

  try {
    const result = await apiRequest(
      "api/chats/community/get-or-create/",
      {
        method: "POST",
        data: {
          community_id: communityId,
        },
      }
    );

    return result;

  } catch (error) {
    console.error("🔴 openCommunityChat FAILED:", error);
    throw error;
  }
}