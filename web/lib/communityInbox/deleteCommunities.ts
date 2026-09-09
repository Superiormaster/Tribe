import {
  communityDeleteChat,
  communityDeleteChats,
} from "@/utils/chat/MessageClientApi";
import { 
  hideCommunityChatMessages,
} from "@/lib/communityMessageDB";
import {
  deleteOutboxMessagesForChat,
} from "@/utils/chat/outbox";

export async function deleteCommunityInboxChats(
  chatIds: number[],
  userId: number
) {
  if (!chatIds.length) {
    return;
  }

  if (chatIds.length === 1) {
    await communityDeleteChat(
      chatIds[0]
    );
  } else {
    await communityDeleteChats(
      chatIds
    );
  }

  // Remove local copies.
  await Promise.all(
    chatIds.map((chatId) =>
      hideCommunityChatMessages(
        chatId,
        userId
      )
    )
  );
  
  await Promise.all(
    chatIds.map((chatId) =>
      deleteOutboxMessagesForChat(
        chatId,
        userId,
        "community"
      )
    )
  );

  chatIds.forEach((chatId) => {
    window.dispatchEvent(
      new CustomEvent(
        "community-chat-deleted",
        {
          detail: {
            chatId,
          },
        }
      )
    );
  });
}