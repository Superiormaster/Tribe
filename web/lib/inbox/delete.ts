import { apiRequest } from "@/utils/api";
import {
  deleteChat,
  deleteChats,
} from "@/utils/chat/MessageClientApi";
import { deleteChatData } from "@/lib/messageDB";

export async function deleteInboxChats(
  chatIds: number[],
  userId: number
) {
  await Promise.all(
    chatIds.map(async id => {
      await apiRequest(
        `api/chats/${id}/hide-all/`,
        {
          method: "POST",
        }
      );

      await deleteChatData(id, userId);
    })
  );

  if (chatIds.length === 1) {
    await deleteChat(chatIds[0]);
  } else {
    await deleteChats(chatIds);
  }

  chatIds.forEach(chatId => {
    window.dispatchEvent(
      new CustomEvent("chat-deleted", {
        detail: {
          chatId,
        },
      })
    );
  });
}