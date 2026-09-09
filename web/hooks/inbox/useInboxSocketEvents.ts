'use client';

import {
  useCallback,
  useEffect,
  useRef,
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

  refreshPrivate?: () => void | Promise<void>;

  refreshCommunity?: () => void | Promise<void>;
}

export function useInboxSocketEvents({
  userId,
  setRecentChats,
  setCommunityChats,
  refreshPrivate,
  refreshCommunity,
}: UseInboxSocketEventsProps) {

  const privateRefreshTimer =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const communityRefreshTimer =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const schedulePrivateRefresh =
    useCallback(() => {

      if (!refreshPrivate) {
        return;
      }

      if (privateRefreshTimer.current) {
        clearTimeout(
          privateRefreshTimer.current
        );
      }

      privateRefreshTimer.current =
        setTimeout(() => {

          privateRefreshTimer.current =
            null;

          void refreshPrivate();

        }, 300);

    }, [
      refreshPrivate,
    ]);

  const scheduleCommunityRefresh =
    useCallback(() => {

      if (!refreshCommunity) {
        return;
      }

      if (communityRefreshTimer.current) {
        clearTimeout(
          communityRefreshTimer.current
        );
      }

      communityRefreshTimer.current =
        setTimeout(() => {

          communityRefreshTimer.current =
            null;

          void refreshCommunity();

        }, 300);

    }, [
      refreshCommunity,
    ]);

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

        if (!Number.isFinite(normalizedChatId)) {
          return;
        }

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

        schedulePrivateRefresh();

      },
      [
        setRecentChats,
        schedulePrivateRefresh,
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

        if (!chatId) {
          return;
        }

        if (
          Number(senderId) ===
          Number(userId)
        ) {
          return;
        }

        const normalizedChatId =
          Number(chatId);

        if (!Number.isFinite(normalizedChatId)) {
          return;
        }

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

        schedulePrivateRefresh();

      },
      [
        userId,
        setRecentChats,
        schedulePrivateRefresh,
      ]
    );

  const handleSync =
    useCallback(
      (event: Event) => {

        const data =
          (event as CustomEvent).detail;

        const chatId =
          data?.chatId ??
          data?.chat_id ??
          data?.message?.chat ??
          data?.message?.chat_id;

        if (
          chatId !== undefined &&
          chatId !== null
        ) {
          const normalizedChatId =
            Number(chatId);

          if (
            !Number.isFinite(
              normalizedChatId
            )
          ) {
            return;
          }
        }

        schedulePrivateRefresh();

      },
      [
        schedulePrivateRefresh,
      ]
    );
  
  const handleCommunitySync =
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

        if (
          !Number.isFinite(
            normalizedCommunityId
          )
        ) {
          return;
        }

        scheduleCommunityRefresh();

      },
      [
        scheduleCommunityRefresh,
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

        if (
          !Number.isFinite(
            normalizedCommunityId
          )
        ) {
          return;
        }

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

        scheduleCommunityRefresh();

      },
      [
        setCommunityChats,
        scheduleCommunityRefresh,
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

        if (!communityId) {
          return;
        }

        if (
          Number(senderId) ===
          Number(userId)
        ) {
          return;
        }

        const normalizedCommunityId =
          Number(communityId);

        if (
          !Number.isFinite(
            normalizedCommunityId
          )
        ) {
          return;
        }

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

        scheduleCommunityRefresh();

      },
      [
        userId,
        setCommunityChats,
        scheduleCommunityRefresh,
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
      "message-synced",
      handleSync
    );
  
    window.addEventListener(
      "community-message-synced",
      handleCommunitySync
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
        "message-synced",
        handleSync
      );
  
      window.removeEventListener(
        "community-message-synced",
        handleCommunitySync
      );

      window.removeEventListener(
        "community-message-delivered",
        handleCommunityDelivered
      );

      window.removeEventListener(
        "community-message-seen",
        handleCommunitySeen
      );

      if (
        privateRefreshTimer.current
      ) {
        clearTimeout(
          privateRefreshTimer.current
        );

        privateRefreshTimer.current =
          null;
      }

      if (
        communityRefreshTimer.current
      ) {
        clearTimeout(
          communityRefreshTimer.current
        );

        communityRefreshTimer.current =
          null;
      }

    };

  }, [
    handleDelivered,
    handleSeen,
    handleSync,
    handleCommunityDelivered,
    handleCommunitySeen,
  ]);

  return {
    onDelivered:
      handleDelivered,

    onSeen:
      handleSeen,

    onSync:
      handleSync,
  
    onCommunitySync:
      handleCommunitySync,

    onCommunityDelivered:
      handleCommunityDelivered,

    onCommunitySeen:
      handleCommunitySeen,
  };
}