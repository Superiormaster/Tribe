import { apiRequest } from "@/utils/api";
import {
  deleteChat,
  deleteChats,
} from "@/utils/chat/MessageClientApi";
import { 
  hideChatMessages,
} from "@/lib/messageDB";

import {
  deleteOutboxMessagesForChat,
} from "@/utils/chat/outbox";

export async function deleteInboxChats(
  chatIds: number[],
  userId: number
) {
  if (!chatIds.length) {
    return;
  }

  if (chatIds.length === 1) {
    await deleteChat(chatIds[0]);
  } else {
    await deleteChats(chatIds);
  }

  // Remove the user's local copy.
  await Promise.all(
    chatIds.map((chatId) =>
      hideChatMessages(
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
        "private"
      )
    )
  );

  // Tell the rest of the frontend.
  chatIds.forEach((chatId) => {
    window.dispatchEvent(
      new CustomEvent(
        "chat-deleted",
        {
          detail: {
            chatId,
          },
        }
      )
    );
  });
}