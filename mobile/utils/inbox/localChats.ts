import { type CommunityChat } from "@/hooks/communityInbox/useRecentCommunities";
import { type Chat } from "@/hooks/inbox/useRecentChats";

export type InboxItem =
  | {
      type: "local-private";
      chatId: number;
      time: string | Date;
    }
  | {
      type: "private";
      chat: Chat;
      time: string | Date;
    }
  | {
      type: "local-community";
      chatId: number;
      time: string | Date;
    }
  | {
      type: "community";
      chat: CommunityChat;
      time: string | Date;
    };

export function getLocalChatIds(
  drafts: Record<number, any>,
  pendingMap: Record<number, any>,
  backendIds: Set<number>,
  recentLoaded: boolean
) {
  if (!recentLoaded) return [];

  return Object.keys({
    ...drafts,
    ...pendingMap,
  })
    .map(Number)
    .filter(chatId => {
      if (backendIds.has(chatId)) {
        return false;
      }

      return drafts[chatId] || pendingMap[chatId];
    });
}