import { apiRequest } from "@/utils/api";

export async function openCommunityChat(chatId: number) {
  const res = await apiRequest(
    `api/chats/${chatId}/retrieve-community-chat/`,
    {
      method: "POST",
      data: {
        chat_id: chatId,
      },
    }
  );

  return res.chat_id;
}