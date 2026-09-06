import { useState, useEffect } from "react";

import {
  getConnectedUsers,
  getJoinedCommunities,
} from "@/lib/api";

import { useNavigation } from "@/utils/useNavigation";

import { useNetwork } from "@/components/networkConnection/NetworkContext";

import { sendChatMessage } from "@/utils/chat/sendChatMessage";

import { sendCommunityMessage } from "@/utils/communityChatPage/sendCommunityMessage";

import { createReplySnapshot } from "@/utils/chat/replySnapshot";

import type { MediaSource } from "@/utils/chat/messageContract";

import type {
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";

type Props = {
  socketRef: any;
  chatUser?: any;
  currentUser: any;
  setMessages: any;
  clearSelection?: () => void;
};

export type ForwardDestination = {
  id: number;
  name: string;
  avatar?: string;

  type: "private" | "community";

  chatId?: number;
  communityId?: number;
};

export function useForwardMessages({
  socketRef,
  chatUser,
  currentUser,
  setMessages,
  clearSelection,
}: Props) {
  const {
    canCommunicate,
    networkStatus,
    connectionType,
  } = useNetwork();

  const { push } = useNavigation();

  const [forwardMode, setForwardMode] =
    useState(false);

  const [forwardCaption, setForwardCaption] =
    useState("");

  const [
    selectedDestinations,
    setSelectedDestinations,
  ] = useState<ForwardDestination[]>([]);

  const [connectedUsers, setConnectedUsers] =
    useState<any[]>([]);

  const [
    joinedCommunities,
    setJoinedCommunities,
  ] = useState<any[]>([]);

  const [forwardMessages, setForwardMessages] =
    useState<any[]>([]);

  const [userPage, setUserPage] =
    useState(1);

  const [communityPage, setCommunityPage] =
    useState(1);

  const [hasMoreUsers, setHasMoreUsers] =
    useState(true);

  const [
    hasMoreCommunities,
    setHasMoreCommunities,
  ] = useState(true);

  const fetchForwardDestinations =
    async () => {
      try {
        const usersRes =
          await getConnectedUsers(
            userPage
          );

        const communitiesRes =
          await getJoinedCommunities(
            communityPage
          );

        setConnectedUsers(prev => {
          const ids = new Set(
            prev.map(
              (u: any) => u.id
            )
          );

          return [
            ...prev,
            ...usersRes.results.filter(
              (u: any) =>
                !ids.has(u.id)
            ),
          ];
        });

        setJoinedCommunities(prev => {
          const ids = new Set(
            prev.map(
              (u: any) => u.id
            )
          );

          return [
            ...prev,
            ...communitiesRes.results.filter(
              (u: any) =>
                !ids.has(u.id)
            ),
          ];
        });

        setHasMoreUsers(
          !!usersRes.next
        );

        setHasMoreCommunities(
          !!communitiesRes.next
        );
      } catch (err) {
        console.error(err);
      }
    };

  useEffect(() => {
    fetchForwardDestinations();
  }, [
    userPage,
    communityPage,
  ]);

  const handleScroll = (
    e: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const {
      contentOffset,
      layoutMeasurement,
      contentSize,
    } = e.nativeEvent;

    const currentPosition =
      contentOffset.y +
      layoutMeasurement.height;

    const nearBottom =
      currentPosition >=
      contentSize.height - 100;

    if (!nearBottom) {
      return;
    }

    if (hasMoreUsers) {
      setUserPage(p => p + 1);
    }

    if (hasMoreCommunities) {
      setCommunityPage(
        p => p + 1
      );
    }
  };

  const openForward = async (
    messages: any[] | any
  ) => {
    try {
      const normalizedMessages =
        Array.isArray(messages)
          ? messages
          : messages
            ? [messages]
            : [];

      if (
        normalizedMessages.length === 0
      ) {
        console.warn(
          "[FORWARD] No messages supplied"
        );

        return;
      }

      setUserPage(1);
      setCommunityPage(1);

      setConnectedUsers([]);
      setJoinedCommunities([]);

      setForwardMessages(
        normalizedMessages
      );

      await fetchForwardDestinations();

      setForwardMode(true);
    } catch (err) {
      console.error(
        "[FORWARD] Open failed:",
        err
      );
    }
  };

  const closeForward = () => {
    setForwardMode(false);

    setSelectedDestinations([]);

    setForwardMessages([]);

    setForwardCaption("");

    clearSelection?.();
  };

  const privateCount =
    selectedDestinations.filter(
      d =>
        d.type === "private"
    ).length;

  const communityCount =
    selectedDestinations.filter(
      d =>
        d.type === "community"
    ).length;

  const total =
    selectedDestinations.length;

  const destinations:
    ForwardDestination[] = [
      ...connectedUsers.map(
        (
          user
        ): ForwardDestination => ({
          id: user.id,

          name: user.username,

          avatar: user.avatar,

          type: "private",

          chatId:
            user.chat_id,
        })
      ),

      ...joinedCommunities.map(
        (
          community
        ): ForwardDestination => ({
          id: community.id,

          name: community.name,

          avatar:
            community.cover_image,

          type: "community",

          communityId:
            community.id,
        })
      ),
    ];

  const createForwardPayload = (
    msg: any,
    chatId: number | undefined,
    communityId:
      | number
      | undefined,
    forwardCaption: string,
    currentUser: any
  ) => {
    const canUseCaption =
      msg.media_type ===
        "image" ||
      msg.media_type ===
        "video" ||
      msg.media_type ===
        "gallery";

    const originalCaption =
      msg.caption ??
      msg.text ??
      "";

    const newCaption =
      forwardCaption?.trim();

    const clientCreatedAt =
      new Date().toISOString();

    /*
     * crypto.randomUUID() is not
     * reliably available in every
     * Expo/RN environment.
     */
    const clientId =
      `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 11)}`;

    const payload = {
      client_id: clientId,

      sender:
        currentUser?.id,

      ...(chatId !== undefined && {
        chat: chatId,
      }),

      ...(communityId !== undefined && {
        community: communityId,
      }),

      caption: canUseCaption
        ? newCaption ||
          originalCaption
        : originalCaption,

      encrypted_text:
        canUseCaption
          ? newCaption ||
            originalCaption
          : msg.encrypted_text ??
            msg.text ??
            "",

      media_url:
        msg.media_url ?? [],

      media_type:
        msg.media_type ??
        "text",

      thumbnail:
        msg.thumbnail ?? [],

      media_source:
        "forward" as MediaSource,

      client_created_at:
        clientCreatedAt,

      created_at:
        clientCreatedAt,

      reply_to: null,

      files: [],
    };

    return payload;
  };

  const sendForward =
    async () => {
      const messagesToForward =
        [...forwardMessages];

      const caption =
        forwardCaption;

      if (
        messagesToForward.length ===
          0 ||
        selectedDestinations.length ===
          0
      ) {
        return;
      }

      try {
        for (
          const destination of
            selectedDestinations
        ) {
          for (
            const msg of
              messagesToForward
          ) {
            const payload =
              createForwardPayload(
                msg,

                destination.type ===
                  "private"
                  ? destination.chatId
                  : undefined,

                destination.type ===
                  "community"
                  ? destination.communityId
                  : undefined,

                caption,

                currentUser
              );

            if (
              destination.type ===
              "private"
            ) {
              await sendChatMessage({
                message: payload,

                currentUser,

                socketRef,

                setMessages,

                canCommunicate,

                networkStatus,

                connectionType,
              });
            } else {
              await sendCommunityMessage({
                message: payload,

                currentUser,

                socketRef,

                setMessages,

                canCommunicate,

                networkStatus,

                connectionType,
              });
            }
          }
        }

        if (total === 1) {
          const destination =
            selectedDestinations[0];

          if (
            destination.type ===
            "private"
          ) {
            push(
              `/main/messages/chat/${destination.chatId}`
            );
          } else {
            push(
              `/main/community/${destination.communityId}/chat`
            );
          }
        } else {
          push("/main/messages");
        }

        clearSelection?.();

        setSelectedDestinations([]);
        setForwardMessages([]);
        setForwardCaption("");
        setForwardMode(false);
      } catch (err) {
        console.error(err);
      }
    };

  return {
    forwardMode,
    selectedDestinations,
    setSelectedDestinations,
    forwardMessages,
    forwardCaption,
    setForwardCaption,
    destinations,
    handleScroll,
    openForward,
    closeForward,
    sendForward,
  };
}