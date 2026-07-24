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