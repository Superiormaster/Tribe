import { apiRequest } from "@/utils/api";

export const pinChat = (chatId: number) =>
  apiRequest(`api/chats/${chatId}/pin/`, {
    method: "POST",
  });

export const archiveChat = (chatId: number) =>
  apiRequest(`api/chats/${chatId}/archive/`, {
    method: "POST",
  });

export const deleteChat = (chatId: number) =>
  apiRequest(`api/chats/${chatId}/delete-chat/`, {
    method: "POST",
  });

export const deleteChats = (chatIds: number[]) =>
  apiRequest(`api/chats/delete-chats/`, {
    method: "POST",
    data: {
      chat_ids: chatIds,
    },
  });

export const muteChat = (
  chatId: number,
  duration: number | string
) =>
  apiRequest(`api/chats/${chatId}/mute/`, {
    method: "POST",
    data: { duration },
  });

export const unmuteChat = (chatId: number) =>
  apiRequest(`api/chats/${chatId}/unmute/`, {
    method: "POST",
  });