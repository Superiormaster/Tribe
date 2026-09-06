import { pinChat } from "@/utils/chat/MessageClientApi";
import { sortInbox } from "@/utils/inbox/sorting";
import type { Chat } from "@/hooks/inbox/useRecentChats";
import type { Dispatch, SetStateAction } from "react";

export async function pinChats(
chatIds: number[],
setPinnedCount: Dispatch<SetStateAction<number>>,
setRecentChats: Dispatch<SetStateAction<Chat[]>>
) {
const responses = await Promise.all(
chatIds.map((id) => pinChat(id))
);

setRecentChats((prev) => {
const updated = prev.map((chat) => {
const res = responses.find(
(r) => r.chat_id === chat.chat_id
);

  if (!res) return chat;

  return {
    ...chat,
    pinned: res.pinned,
    pinned_at: res.pinned_at,
  };
});

return sortInbox(updated);

});

const latestCount =
responses[responses.length - 1]?.pinned_count;

if (latestCount !== undefined) {
setPinnedCount(latestCount);
}
}