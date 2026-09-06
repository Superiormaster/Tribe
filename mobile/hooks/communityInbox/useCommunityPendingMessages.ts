import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { DeviceEventEmitter } from "react-native";

import type {
  Message,
  UserSummary,
} from "@/utils/chat/messageContract";

import {
  getAllCommunityDrafts,
  getCommunityPendingMessages,
  getAllCommunityMeta,
} from "@/lib/communityMessageDB";

interface PendingMessage {
  id?: number;

  chat?: number;
  chatId?: number;
  communityId?: number;

  username?: string;
  avatar?: string;

  text?: string;
  encrypted_text?: string;
  caption?: string;

  created_at: string;

  sender?: number;
  sender_info?: UserSummary;

  media_type?: string;

  status?: string;

  reply_to?: Message | null;

  is_pinned?: boolean;

  is_edited?: boolean;
  edited_at?: string;

  forwarded_from?: Message | null;

  mentions?: UserSummary;

  read_by?: number[];
}

interface Draft {
  chatId: number;
  text: string;
  updated_at: string;
}

export interface CommunityChatMeta {
  communityId: number;
  communityName?: string;
  cover_image_url?: string | null;
}

export function useCommunityPendingMessages(
  userId?: number
) {
  const [drafts, setDrafts] =
    useState<Record<number, Draft>>({});

  const [pendingMap, setPendingMap] =
    useState<Record<number, PendingMessage>>({});

  const [chatMeta, setChatMeta] =
    useState<
      Record<number, CommunityChatMeta>
    >({});

  const [loaded, setLoaded] =
    useState(false);

  const loadPendingData =
    useCallback(async () => {
      if (!userId) {
        return;
      }

      try {
        const [
          draftsData,
          pendingData,
          metaData,
        ] = await Promise.all([
          getAllCommunityDrafts(),
          getCommunityPendingMessages(userId),
          getAllCommunityMeta(),
        ]);

        const draftMap: Record<
          number,
          Draft
        > = {};

        const pending: Record<
          number,
          PendingMessage
        > = {};

        const meta: Record<
          number,
          CommunityChatMeta
        > = {};

        draftsData.forEach((d: any) => {
          const id =
            d.communityId;

          draftMap[id] = {
            ...d,
            chatId: id,
          };
        });

        console.log(
          "COMMUNITY PENDING RAW",
          pendingData
        );

        pendingData.forEach((m: any) => {
          console.log(
            "ONE MESSAGE",
            m
          );

          const chatId =
            m.communityId ??
            m.chat ??
            m.chatId;

          /*
           * Ignore malformed pending
           * messages that don't have a
           * community/chat ID.
           */
          if (
            chatId === undefined ||
            chatId === null
          ) {
            return;
          }

          const existing =
            pending[chatId];

          if (
            !existing ||
            new Date(
              m.created_at
            ).getTime() >
              new Date(
                existing.created_at
              ).getTime()
          ) {
            pending[chatId] = m;
          }
        });

        metaData.forEach((m: any) => {
          meta[m.communityId] = {
            communityId:
              m.communityId,

            communityName:
              m.name,

            cover_image_url:
              m.cover_image_url ??
              null,
          };
        });

        setDrafts(
          draftMap
        );

        setPendingMap(
          pending
        );

        setChatMeta(
          meta
        );

        setLoaded(true);
      } catch (err) {
        console.error(
          "Failed to load community pending messages",
          err
        );
      }
    }, [userId]);

  useEffect(() => {
    loadPendingData();
  }, [loadPendingData]);

  /*
   * Community draft updates
   */
  useEffect(() => {
    const handler = (
      data: {
        chatId?: number;
        text?: string;
        updated_at?: string;
      }
    ) => {
      const {
        chatId,
        text,
        updated_at,
      } = data;

      if (
        chatId === undefined ||
        chatId === null
      ) {
        return;
      }

      setDrafts((prev) => {
        const next = {
          ...prev,
        };

        if (!text?.trim()) {
          delete next[chatId];
        } else {
          next[chatId] = {
            chatId,
            text,
            updated_at:
              updated_at ??
              new Date().toISOString(),
          };
        }

        return next;
      });
    };

    const subscription =
      DeviceEventEmitter.addListener(
        "community-draft-updated",
        handler
      );

    return () => {
      subscription.remove();
    };
  }, []);

  /*
   * Community message synced
   */
  useEffect(() => {
    const handler = (
      data: {
        chatId?: number;
      }
    ) => {
      const {
        chatId,
      } = data;

      if (
        chatId === undefined ||
        chatId === null
      ) {
        return;
      }

      setPendingMap(
        (prev) => {
          const next = {
            ...prev,
          };

          delete next[chatId];

          return next;
        }
      );

      setDrafts(
        (prev) => {
          const next = {
            ...prev,
          };

          delete next[chatId];

          return next;
        }
      );
    };

    const subscription =
      DeviceEventEmitter.addListener(
        "community-message-synced",
        handler
      );

    return () => {
      subscription.remove();
    };
  }, []);

  /*
   * Community message delivered
   */
  useEffect(() => {
    const handler = (
      data: {
        chatId?: number;
        messageIds?: number[];
      }
    ) => {
      const {
        chatId,
        messageIds = [],
      } = data;

      if (
        chatId === undefined ||
        chatId === null
      ) {
        return;
      }

      setPendingMap(
        (prev) => {
          const next = {
            ...prev,
          };

          const message =
            next[chatId];

          if (
            message &&
            message.id !== undefined &&
            messageIds.includes(
              message.id
            )
          ) {
            next[chatId] = {
              ...message,
              status:
                "delivered",
            };
          }

          return next;
        }
      );
    };

    const subscription =
      DeviceEventEmitter.addListener(
        "community-message-delivered",
        handler
      );

    return () => {
      subscription.remove();
    };
  }, []);

  return {
    drafts,
    pendingMap,
    chatMeta,
    loaded,

    setDrafts,
    setPendingMap,
    setChatMeta,

    reloadPendingData:
      loadPendingData,
  };
}