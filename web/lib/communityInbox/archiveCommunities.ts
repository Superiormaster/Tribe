// utils/community/archiveChats.ts
import { communityArchiveChat } from "@/utils/chat/MessageClientApi";
import { communityArchiveChats } from "@/utils/chat/MessageClientApi";

export async function archiveCommunityChat(
  chatIds: number[]
) {
  await Promise.all(
    chatIds.map(id => communityArchiveChat(id))
  );
}

export async function archiveCommunityChats(
  chatIds: number[]
) {
  return communityArchiveChats(chatIds);
}