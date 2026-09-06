import { apiRequest } from "@/utils/api";

export const getLivekitToken = async (roomId: string) => {
  return apiRequest(`api/chats/livekit/token/?room=${roomId}`);
};

export const startCall = async (roomId: string, type: "audio" | "video") => {
  // 1. create call first
  const call = await apiRequest("api/chats/calls/create/", {
    method: "POST",
    data: {
      room_id: roomId,
      type,
    },
  });

  return call;
};

export const endCall = async (callId: number) => {
  await apiRequest(`api/chats/calls/${callId}/end/`, {
    method: "POST",
  });
};