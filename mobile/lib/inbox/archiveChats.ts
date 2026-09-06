import { archiveChat } from "@/utils/chat/MessageClientApi";

export async function archiveChats(chatIds: number[]) {
  await Promise.all(
    chatIds.map(id => archiveChat(id))
  );
}