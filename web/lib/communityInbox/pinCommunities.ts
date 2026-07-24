// utils/community/pinChats.ts

import { communityPinChat } from "@/utils/chat/MessageClientApi";
import { sortInbox } from "@/utils/inbox/sorting";
import type { CommunityChat } from "@/hooks/communityInbox/useRecentCommunities";

export async function pinCommunityChats(
  chatIds: number[],
  chats: CommunityChat[],
  setPinnedCount: React.Dispatch<React.SetStateAction<number>>,
  setRecentChats: (
    updater:
      | CommunityChat[]
      | ((prev: CommunityChat[]) => CommunityChat[])
  ) => void
) {
  const responses = await Promise.all(
    chatIds.map(id => communityPinChat(id))
  );
  
  setRecentChats(prev =>
    sortInbox(
      prev.map(chat => {
        const res = responses.find(
          r => r.chat_id === chat.chat_id
        );
  
        if (!res) return chat;
  
        return {
          ...chat,
          pinned: res.pinned,
          pinned_at: res.pinned_at,
        };
      })
    )
  );
  
  setPinnedCount(
    responses[responses.length - 1].pinned_count
  );
}