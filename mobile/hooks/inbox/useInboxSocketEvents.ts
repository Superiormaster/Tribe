import {
useCallback,
useEffect,
} from "react";

import {
DeviceEventEmitter,
} from "react-native";

import {
updateStatus,
} from "@/utils/inbox/status";

import type {
Chat,
} from "@/hooks/inbox/useRecentChats";

import type {
CommunityChat,
} from "@/hooks/communityInbox/useRecentCommunities";

interface UseInboxSocketEventsProps {
userId: number;

setRecentChats:
React.Dispatch<
React.SetStateAction<Chat[]>
>;

setCommunityChats:
React.Dispatch<
React.SetStateAction<CommunityChat[]>
>;
}

export function useInboxSocketEvents({
userId,
setRecentChats,
setCommunityChats,
}: UseInboxSocketEventsProps) {

const handleDelivered =
useCallback(
(event: any) => {
const data = event;

    const {
      chatId,
    } = data ?? {};

    if (!chatId) {
      return;
    }

    const normalizedChatId =
      Number(chatId);

    setRecentChats(
      prev =>
        prev.map(
          (chat: any) =>
            Number(chat.chat_id) !==
            normalizedChatId
              ? chat
              : {
                  ...chat,

                  status:
                    updateStatus(
                      chat.status ??
                        "sending",

                      "delivered"
                    ),
                }
        )
    );
  },
  [
    setRecentChats,
  ]
);

const handleSeen =
useCallback(
(event: any) => {
const data = event;

    const {
      chatId,
      userId:
        senderId,
    } = data ?? {};

    if (
      !chatId ||
      Number(senderId) ===
        Number(userId)
    ) {
      return;
    }

    const normalizedChatId =
      Number(chatId);

    setRecentChats(
      prev =>
        prev.map(
          (chat: any) =>
            Number(chat.chat_id) !==
            normalizedChatId
              ? chat
              : {
                  ...chat,

                  status:
                    updateStatus(
                      chat.status ??
                        "sending",

                      "seen"
                    ),
                }
        )
    );
  },
  [
    userId,
    setRecentChats,
  ]
);

const handleCommunityDelivered =
useCallback(
(event: any) => {
const data = event;

    const communityId =
      data?.communityId ??
      data?.community_id;

    if (!communityId) {
      return;
    }

    const normalizedCommunityId =
      Number(communityId);

    setCommunityChats(
      prev =>
        prev.map(
          (chat: any) =>
            Number(
              chat.community_id
            ) !==
            normalizedCommunityId
              ? chat
              : {
                  ...chat,

                  status:
                    updateStatus(
                      chat.status ??
                        "sending",

                      "delivered"
                    ),
                }
        )
    );
  },
  [
    setCommunityChats,
  ]
);

const handleCommunitySeen =
useCallback(
(event: any) => {
const data = event;

    const communityId =
      data?.communityId ??
      data?.community_id;

    const senderId =
      data?.userId ??
      data?.senderId ??
      data?.sender_id;

    if (
      !communityId ||
      Number(senderId) ===
        Number(userId)
    ) {
      return;
    }

    const normalizedCommunityId =
      Number(communityId);

    setCommunityChats(
      prev =>
        prev.map(
          (chat: any) =>
            Number(
              chat.community_id
            ) !==
            normalizedCommunityId
              ? chat
              : {
                  ...chat,

                  status:
                    updateStatus(
                      chat.status ??
                        "sending",

                      "seen"
                    ),
                }
        )
    );
  },
  [
    userId,
    setCommunityChats,
  ]
);

useEffect(() => {

const deliveredSubscription =
  DeviceEventEmitter.addListener(
    "message-delivered",
    handleDelivered
  );

const seenSubscription =
  DeviceEventEmitter.addListener(
    "message-seen",
    handleSeen
  );

const communityDeliveredSubscription =
  DeviceEventEmitter.addListener(
    "community-message-delivered",
    handleCommunityDelivered
  );

const communitySeenSubscription =
  DeviceEventEmitter.addListener(
    "community-message-seen",
    handleCommunitySeen
  );

return () => {

  deliveredSubscription.remove();

  seenSubscription.remove();

  communityDeliveredSubscription.remove();

  communitySeenSubscription.remove();

};

}, [
handleDelivered,
handleSeen,
handleCommunityDelivered,
handleCommunitySeen,
]);

return {
onDelivered:
handleDelivered,

onSeen:
  handleSeen,

onCommunityDelivered:
  handleCommunityDelivered,

onCommunitySeen:
  handleCommunitySeen,

};
}