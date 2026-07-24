import { pinChat } from "@/utils/chat/MessageClientApi";
import { sortInbox } from "@/utils/inbox/sorting";
import type{ Chat } from "@/hooks/inbox/useRecentChats";

export async function pinChats(
  chatIds: number[],
  selectedItems: Chat[],
  setPinnedCount: React.Dispatch<React.SetStateAction<number>>,
  setRecentChats: React.Dispatch<React.SetStateAction<Chat[]>>
) {
  const responses = await Promise.all(
    chatIds.map(id => pinChat(id))
  );
  
  console.log(responses);
  
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