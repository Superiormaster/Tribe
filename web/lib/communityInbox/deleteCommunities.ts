import { apiRequest } from "@/utils/api";
import {
  communityDeleteChat,
  communityDeleteChats,
} from "@/utils/chat/MessageClientApi";
import { deleteCommunityChatData } from "@/lib/communityMessageDB";

export async function deleteCommunityInboxChats(
  chatIds: number[],
  userId: number
) {
  await Promise.all(
    chatIds.map(async (id) => {
      await apiRequest(
        `api/chats/${id}/community-hide-all/`,
        {
          method: "POST",
        }
      );

      await deleteCommunityChatData(
        id,
        userId
      );
    })
  );

  if (chatIds.length === 1) {
    await communityDeleteChat(chatIds[0]);
  } else {
    await communityDeleteChats(chatIds);
  }

  chatIds.forEach((chatId) => {
    window.dispatchEvent(
      new CustomEvent("community-chat-deleted", {
        detail: {
          chatId,
        },
      })
    );
  });
}