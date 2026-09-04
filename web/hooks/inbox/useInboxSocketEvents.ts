'use client';

import {
  useCallback,
  useEffect,
} from "react";

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
      (event: Event) => {
        const data =
          (event as CustomEvent).detail;

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
      (event: Event) => {
        const data =
          (event as CustomEvent).detail;

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
      (event: Event) => {
        const data =
          (event as CustomEvent).detail;

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
      (event: Event) => {
        const data =
          (event as CustomEvent).detail;

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

    window.addEventListener(
      "message-delivered",
      handleDelivered
    );

    window.addEventListener(
      "message-seen",
      handleSeen
    );

    window.addEventListener(
      "community-message-delivered",
      handleCommunityDelivered
    );

    window.addEventListener(
      "community-message-seen",
      handleCommunitySeen
    );

    return () => {

      window.removeEventListener(
        "message-delivered",
        handleDelivered
      );

      window.removeEventListener(
        "message-seen",
        handleSeen
      );

      window.removeEventListener(
        "community-message-delivered",
        handleCommunityDelivered
      );

      window.removeEventListener(
        "community-message-seen",
        handleCommunitySeen
      );

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