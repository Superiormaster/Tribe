import { apiRequest } from "@/utils/api";
import {
  muteChat,
  unmuteChat,
} from "@/utils/chat/MessageClientApi";

type Props = {
  chatIdNum: number;
  chatUser: any;
  setChatUser: React.Dispatch<React.SetStateAction<any>>;
  setIsMuted: React.Dispatch<React.SetStateAction<boolean>>;
  setMutedUntil: React.Dispatch<
    React.SetStateAction<string | null>
  >;
  setShowMuteModal: React.Dispatch<
    React.SetStateAction<boolean>
  >;
  setShowChatOptions: React.Dispatch<
    React.SetStateAction<boolean>
  >;
};

export function useChatActions({
  chatIdNum,
  chatUser,
  setChatUser,
  setIsMuted,
  setMutedUntil,
  setShowMuteModal,
  setShowChatOptions,
}: Props) {
  const handleBlock = async () => {
    if (!chatUser) return;

    try {
      if (chatUser.is_message_blocked) {
        await apiRequest(
          `api/chats/message-unblock/${chatUser.id}/`,
          {
            method: "POST",
          }
        );

        setChatUser((prev: any) =>
          prev
            ? {
                ...prev,
                is_message_blocked: false,
              }
            : prev
        );
      } else {
        await apiRequest(
          `api/chats/message-block/${chatUser.id}/`,
          {
            method: "POST",
          }
        );

        setChatUser((prev: any) =>
          prev
            ? {
                ...prev,
                is_message_blocked: true,
              }
            : prev
        );
      }
    } finally {
      setShowChatOptions(false);
    }
  };

  const handleMute = async (
    duration: "8h" | "1w" | "forever"
  ) => {
    const res = await muteChat(
      chatIdNum,
      duration
    );

    setIsMuted(true);
    setMutedUntil(res.muted_until);

    setShowMuteModal(false);
    setShowChatOptions(false);
  };

  const handleUnmute = async () => {
    await unmuteChat(chatIdNum);

    setIsMuted(false);
    setMutedUntil(null);

    setShowChatOptions(false);
  };

  return {
    handleBlock,
    handleMute,
    handleUnmute,
  };
}