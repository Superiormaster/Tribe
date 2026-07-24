import { apiRequest } from "@/utils/api";

export async function markSeen(chatId: number) {
  return apiRequest(
    "api/chats/mark-seen/",
    {
      method: "POST",
      data: {
        chatId,
      },
    }
  );
}