import { apiRequest } from "@/utils/api";
import type { Message } from "@/utils/chat/messageContract";

export async function resolveServerChat(
  message: Message,
  chatType: "private" | "community"
) {
  if (message.chat) {
    return message.chat;
  }

  if (chatType === "private") {
    const recipientId = (message as any).recipient_id;

    if (!recipientId) {
      throw new Error(
        "Private pending message has no recipient_id"
      );
    }

    console.log(
      "🔄 Resolving private chat:",
      message.client_id
    );

    const res = await apiRequest(
      "api/chats/get-or-create/",
      {
        method: "POST",
        data: {
          user_id: recipientId,
        },
      }
    );

    const chatId = res.chat?.id;

    if (!chatId) {
      throw new Error(
        "Server did not return private chat ID"
      );
    }

    console.log(
      "✅ Private chat resolved:",
      chatId
    );

    return chatId;
  }

  if (chatType === "community") {
    const communityId =
      message.community ??
      message.communityId;

    if (!communityId) {
      throw new Error(
        "Community pending message has no community ID"
      );
    }

    console.log(
      "🔄 Resolving community chat:",
      message.client_id
    );

    const res = await apiRequest(
      "api/chats/community/get-or-create/",
      {
        method: "POST",
        data: {
          community_id: communityId,
        },
      }
    );

    const chatId = res.chat?.id;

    if (!chatId) {
      throw new Error(
        "Server did not return community chat ID"
      );
    }

    console.log(
      "✅ Community chat resolved:",
      chatId
    );

    return chatId;
  }

  throw new Error(
    `Pending message has unknown chat type: ${chatType}`
  );
}