'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '@/utils/api';
import { useNetworkStatus } from '@/utils/useNetworkStatus';
import { emitMessage } from "@/utils/chat/emitMessage";

import {
  saveMessage,
  saveMessages,
  getMessagesByChat,
  replaceOptimisticMessage,
  updateMessage,
  savePendingMessage,
} from '@/lib/messageDB';

import { normalizeMessage } from '@/utils/chat/messageNormalizer';
import {
  mergeMessages as mergeUtil,
  sortMessages,
  normalizeMessages as normalizeApi,
} from '@/utils/chat/messageMerger';

type Props = {
  chatId: number | null;
  currentUser: any;
  chatUser: any;
  socketRef: any;
  input: string;
  setInput: (v: string) => void;
  replyingTo: any;
  setReplyingTo: (v: any) => void;
  clearDraft: () => Promise<void>;
};

type ChatMessage = {
  localId: string;
  id?: number;
  chatId: number;
  ownerId: number;

  senderId: number;

  encrypted_text: string;

  status: "sending" | "sent" | "failed";

  created_at: string;

  reply_to?: {
    id: number;
    username: string;
    text?: string;
  } | null;
};

export function useChatMessages({
  chatId,
  currentUser,
  chatUser,
  socketRef,
  input,
  setInput,
  replyingTo,
  setReplyingTo,
  clearDraft,
}: Props) {

  const [messages, setMessages] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const dispatchMessage = async (msg: any) => {
    const socket = socketRef.current;
  
    const canSend = navigator.onLine && socket?.connected;
  
    if (!canSend) {
      await savePendingMessage({
        ...msg,
        status: "pending",
      });
  
      return;
    }
  
    return emitMessage(
      socket,
      msg,
      currentUser.id,
      setMessages
    );
  };

  // =========================
  // INIT LOAD
  // =========================
  useEffect(() => {
    if (!chatId) return;

    const init = async () => {
      const local = await getMessagesByChat(chatId, currentUser.id);

      const normalizedLocal =
        (local ?? []).map((m) =>
          normalizeMessage(
            {
              ...m,
              text: m.encrypted_text,
            },
            currentUser.id
          )
        );

      const res = await apiRequest(
        `api/chats/chats/${chatId}/messages/?page=1`
      );

      const serverRaw = normalizeApi(res);

      // convert server → DB RAW format ONLY
      const rawMessages = serverRaw.map((m: any) => ({
        localId: m.id?.toString() || crypto.randomUUID(),
        id: m.id,
        chatId,
        ownerId: currentUser.id,
        senderId:
          m.sender?.id ||
          m.senderId ||
          null,
        encrypted_text: m.encrypted_text,
        status: "sent",
        created_at: m.created_at,
        reply_to: m.reply_to || null,
      }));

      await saveMessages(rawMessages, currentUser.id);

      const normalizedServer =
        serverRaw.map((m: any) =>
          normalizeMessage(
            {
              ...m,
              text: m.encrypted_text,
            },
            currentUser.id
          )
        );

      setMessages(
        mergeUtil(
          normalizedLocal,
          normalizedServer
        )
      );

      setHasMore(!!res.next);
    };

    init();
  }, [chatId]);
  
  useEffect(() => {
    if (!socketRef.current) return;
  
    const socket = socketRef.current;
  
    const handler = (msg: any) => {
      console.log("RECEIVED MESSAGE:", msg);
  
      const normalized = normalizeMessage(
        {
          ...msg,
          text: msg.encrypted_text,
        },
        currentUser.id
      );
  
      setMessages(prev => {
        const exists = prev.some(m =>
          (m.id && m.id === normalized.id) ||
          (m.localId && m.localId === normalized.localId) ||
          (m.clientId && m.clientId === normalized.clientId)
          );
  
        if (exists) return prev;
  
        return sortMessages([...prev, normalized]);
      });
    };
  
    socket.on("receive_message", handler);
  
    return () => {
      socket.off("receive_message", handler);
    };
  }, [currentUser.id]);

  // =========================
  // SEND MESSAGE
  // =========================
  const sendMessage = async () => {
    if (!input.trim() || !chatUser?.id) return;

    const localId = crypto.randomUUID();

    const encrypted =  input

    const optimistic = normalizeMessage({
      localId,
      chatId,
      ownerId: currentUser.id,
      senderId: currentUser.id,
    
      text: input,
      encrypted_text: encrypted,
    
      status: navigator.onLine
        ? "sending"
        : "pending",
      created_at: new Date().toISOString(),
      reply_to: replyingTo
        ? {
            id: replyingTo.id,
            username: replyingTo.username,
            text:
              replyingTo.text ||
              replyingTo.encrypted_text,
          }
        : null
    },
      currentUser.id
    );

    await saveMessage(optimistic, currentUser.id);

    setMessages((prev) =>
      sortMessages(
        [...prev, optimistic].map((m) =>
          normalizeMessage(m, currentUser.id)
        )
      )
    );

    setInput('');
    setReplyingTo(null);
    console.log(
      "OPTIMISTIC REPLY:",
      JSON.stringify(
        optimistic.reply_to,
        null,
        2
      )
    );

    await dispatchMessage(optimistic);

    await clearDraft();
  };

  // =========================
  // LOAD MORE
  // =========================
  const loadMore = async () => {
    if (!chatId || !hasMore) return;

    const nextPage = page + 1;

    const res = await apiRequest(
      `api/chats/chats/${chatId}/messages/?page=${nextPage}`
    );

    const serverRaw = normalizeApi(res);

    const incoming =
      serverRaw.map((m: any) =>
        normalizeMessage(
          {
            ...m,
            text: m.encrypted_text,
          },
          currentUser.id
        )
      );

    await saveMessages(incoming, currentUser.id);
    console.log(
      "PREV",
      prev.map(m => ({
        id: m.id,
        localId: m.localId,
        clientId: m.clientId,
      }))
    );
    
    console.log(
      "INCOMING",
      incoming.map(m => ({
        id: m.id,
        localId: m.localId,
        clientId: m.clientId,
      }))
    );

    setMessages((prev) =>
      mergeUtil(incoming, prev.map(normalize))
    );

    setPage(nextPage);
    setHasMore(!!res.next);
  };

  // =========================
  // RESEND
  // =========================
  const resendMessage = async (msg: any) => {
    if (!chatId || !socketRef.current) return;

    const socket = socketRef.current;
    if (!socket.connected) socket.connect();

    await updateMessage(msg.localId, currentUser.id, {
      status: "sending",
    });

    await dispatchMessage(msg);
  };

  // =========================
  // MARK SEEN
  // =========================
  useEffect(() => {
    if (!chatId) return;

    socketRef.current?.emit('mark_seen', {
      chatId,
    });
  }, [chatId]);
  
  // =========================
  // REACTION
  // =========================
  useEffect(() => {
    if (!socketRef.current) return;
  
    const socket = socketRef.current;
  
    const handleReaction = (data: any) => {
      const {
        messageId,
        emoji,
        userId,
        removed,
      } = data;
  
      setMessages(prev =>
        prev.map(msg => {
          const isTarget =
            String(msg.id) === String(messageId) ||
            String(msg.localId) === String(messageId);
  
          if (!isTarget) return msg;
  
          let reactions = [...(msg.reactions || [])];
  
          const idx = reactions.findIndex(
            r => r.emoji === emoji
          );
  
          if (removed) {
            if (idx >= 0) {
              const users =
                (reactions[idx].userIds || [])
                .filter(id => id !== userId);
  
              if (users.length === 0) {
                reactions.splice(idx, 1);
              } else {
                reactions[idx] = {
                  ...reactions[idx],
                  userIds: users,
                };
              }
            }
          } else {
            if (idx >= 0) {
              const users = new Set([
                ...(reactions[idx].userIds || []),
                userId,
              ]);
  
              reactions[idx] = {
                ...reactions[idx],
                userIds: [...users],
              };
            } else {
              reactions.push({
                emoji,
                userIds: [userId],
              });
            }
          }
  
          return {
            ...msg,
            reactions,
          };
        })
      );
    };
  
    socket.on("reaction", handleReaction);
  
    return () => {
      socket.off("reaction", handleReaction);
    };
  }, []);

  const reactToMessage = async (messageId, emoji) => {
    const userId = currentUser.id;
  
    let updatedReactions = [];
  
    setMessages(prev =>
      prev.map(msg => {
        const isTarget =
          String(msg.id) === String(messageId) ||
          String(msg.localId) === String(messageId);
  
        if (!isTarget) return msg;
  
        let reactions = msg.reactions ? [...msg.reactions] : [];
  
        const idx = reactions.findIndex(r => r.emoji === emoji);
  
        if (idx >= 0) {
          const existing = reactions[idx];
  
          let userIds = existing.userIds ? [...existing.userIds] : [];
  
          if (userIds.includes(userId)) {
            userIds = userIds.filter(id => id !== userId);
          } else {
            userIds.push(userId);
          }
  
          if (userIds.length === 0) {
            reactions = reactions.filter(r => r.emoji !== emoji);
          } else {
            reactions[idx] = {
              ...existing,
              userIds,
            };
          }
        } else {
          reactions = [
            ...reactions,
            {
              emoji,
              userIds: [userId],
            },
          ];
        }
  
        updatedReactions = reactions;
  
        return {
          ...msg,
          reactions: [...reactions], // FORCE NEW reference
        };
      })
    );
  
    // send API AFTER UI update
    updateMessage(messageId, userId, {
      reactions: updatedReactions,
    });
  
    socketRef.current?.emit("reaction", {
      messageId,
      emoji,
      chatId,
    });
  };
  
  return {
    messages,
    setMessages,
    sendMessage,
    resendMessage,
    loadMore,
    hasMore,
    reactToMessage,
  };
}