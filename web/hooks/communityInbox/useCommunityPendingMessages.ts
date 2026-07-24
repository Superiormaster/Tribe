'use client';

import { useCallback, useEffect, useState } from "react";
import type {
  Message,
  UserSummary,
} from "@/utils/chat/messageContract";

import type { ChatMeta } from "@/hooks/inbox/usePendingMessages";
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

export function useCommunityPendingMessages(
  userId?: number
) {
  const [drafts, setDrafts] =
    useState<Record<number, Draft>>({});

  const [pendingMap, setPendingMap] =
    useState<Record<number, PendingMessage>>({});

  const [chatMeta, setChatMeta] =
    useState<Record<number, ChatMeta>>({});

  const [loaded, setLoaded] =
    useState(false);

  const loadPendingData = useCallback(async () => {
    if (!userId) return;

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

      const draftMap: Record<number, Draft> = {};
      const pending: Record<
        number,
        PendingMessage
      > = {};
      const meta: Record<number, ChatMeta> = {};

      draftsData.forEach((d: any) => {
        draftMap[d.chatId] = d;
      });

      pendingData.forEach((m: any) => {
        const chatId =
          m.chat ?? m.chatId;

        const existing = pending[chatId];

        if (
          !existing ||
          new Date(m.created_at).getTime() >
            new Date(
              existing.created_at
            ).getTime()
        ) {
          pending[chatId] = m;
        }
      });

      metaData.forEach((m: any) => {
        meta[m.chatId] = m;
      });

      setDrafts(draftMap);
      setPendingMap(pending);
      setChatMeta(meta);
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

  useEffect(() => {
    const handler = (e: any) => {
      const {
        chatId,
        text,
        updated_at,
      } = e.detail;

      setDrafts(prev => {
        const next = { ...prev };

        if (!text?.trim()) {
          delete next[chatId];
        } else {
          next[chatId] = {
            chatId,
            text,
            updated_at,
          };
        }

        return next;
      });
    };

    window.addEventListener(
      "community-draft-updated",
      handler
    );

    return () =>
      window.removeEventListener(
        "community-draft-updated",
        handler
      );
  }, []);

  useEffect(() => {
    const handler = (e: any) => {
      const { chatId } = e.detail;

      setPendingMap(prev => {
        const next = { ...prev };
        delete next[chatId];
        return next;
      });

      setDrafts(prev => {
        const next = { ...prev };
        delete next[chatId];
        return next;
      });
    };

    window.addEventListener(
      "community-message-synced",
      handler
    );

    return () =>
      window.removeEventListener(
        "community-message-synced",
        handler
      );
  }, []);

  useEffect(() => {
    const handler = (e: any) => {
      const {
        chatId,
        messageIds,
      } = e.detail;

      setPendingMap(prev => {
        const next = { ...prev };

        if (
          next[chatId] &&
          messageIds.includes(
            next[chatId].id!
          )
        ) {
          next[chatId] = {
            ...next[chatId],
            status: "delivered",
          };
        }

        return next;
      });
    };

    window.addEventListener(
      "community-message-delivered",
      handler
    );

    return () =>
      window.removeEventListener(
        "community-message-delivered",
        handler
      );
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