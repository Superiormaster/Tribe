'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { apiRequest } from '@/utils/api';
import { useNetwork } from '@/components/networkConnection/NetworkContext';
import { sendChatMessage } from "@/utils/chat/sendChatMessage";
import { restoreFiles } from "@/utils/chat/restoreFiles";

import {
  saveMessages,
  getChatScroll,
  getLatestMessages,
  getMessagesWindow,
  deleteMessagesOutsideWindow,
  updateMessage,
  getPendingMessages,
} from '@/lib/messageDB';

import type { Message } from "@/utils/chat/messageContract";
import {
  mergeMessages,
  sortMessages
} from '@/utils/chat/messageMerger';

type Props = {
  chatId: number | null;
  currentUser: any;
  chatUser: any;
  input: string;
  setInput: (v: string) => void;
  replyingTo: any;
  setReplyingTo: (v: any) => void;
  clearDraft: () => Promise<void>;
  updateConversationStatus: (
    status: "sent" | "delivered" | "seen"
  ) => void;
};

type ChatMessage = {
  client_id: string;
  id?: number;
  chat: number;
  ownerId: number;
  sender: number;
  encrypted_text: string;
  status: "sending" | "sent" | "failed";
  created_at: string;
  reply_to?: {
    id: number;
    username: string;
    text?: string;
  } | null;
};

type Reaction = {
  emoji: string;
  userIds: number[];
};

export function useChatMessages({
  chatId,
  currentUser,
  chatUser,
  input,
  setInput,
  replyingTo,
  setReplyingTo,
  clearDraft,
  updateConversationStatus,
}: Props) {

  const [messages, setMessages] = useState<Message[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] =
    useState(false);
  const [hasNewer, setHasNewer] = useState(false);
  const [loadingNewer, setLoadingNewer] = useState(false);
  const socketRef = useRef<any>(null);
  const { canCommunicate } = useNetwork();
  
  const setSocketRef = useCallback((socket: any) => {
      socketRef.current = socket;
  }, []);

  // =========================
  // INIT LOAD
  // =========================
  useEffect(() => {
    if (!chatId) return;
  
    const init = async () => {
      const scroll = await getChatScroll(
        chatId,
        currentUser.id
      );
  
      let localWindow: Message[] = [];
  
      if (scroll?.messageId) {
        localWindow = await getMessagesWindow(
          chatId,
          currentUser.id,
          Number(scroll.messageId),
          25,
          25
        );
      } else {
        localWindow = await getLatestMessages(
          chatId,
          currentUser.id,
          50
        );
      }
  
      const pending = (await getPendingMessages(currentUser.id))
        .filter((m: any) => m.chat === chatId);
  
      localWindow = mergeMessages(localWindow, pending);
  
      const restored = localWindow.map(m => ({
        ...m,
        files: restoreFiles(m.files || []),
      }));
  
      if (restored.length) {
        setMessages(sortMessages(restored));
      }
  
      const url =
        scroll?.messageId
          ? `api/chats/${chatId}/messages/window/?anchor=${scroll.messageId}&before=25&after=25`
          : `api/chats/${chatId}/messages/window/?before=25&after=25`;
  
      const res = await apiRequest(url);
  
      const serverMessages: Message[] =
        Array.isArray(res?.messages)
          ? res.messages
          : [];
  
      await saveMessages(
        serverMessages,
        currentUser.id
      );
  
      if (serverMessages.length === 0) {
        setMessages(prev => sortMessages(prev));
        setHasMore(false);
        setHasNewer(false);
        return;
      }
      
      const anchorId =
        scroll?.messageId != null
          ? Number(scroll.messageId)
          : serverMessages.at(-1)?.id;
      
      if (anchorId == null) {
        return;
      }
      
      setMessages(prev =>
        deleteMessagesOutsideWindow(
          mergeMessages(prev, serverMessages),
          anchorId,
          40,
          40
        )
      );
  
      setHasMore(!!res.hasOlder);
      setHasNewer(!!res.hasNewer);
    };
  
    init();
  }, [chatId]);

  const loadNewer = async () => {
    if (
      !chatId ||
      !messages.length ||
      loadingNewer ||
      !hasNewer
    ) {
      return;
    }
  
    setLoadingNewer(true);
  
    try {
      const last = messages[messages.length - 1];

      const lastId = last?.id;
      
      if (lastId == null) {
        setLoadingNewer(false);
        return;
      }
  
      const res = await apiRequest(
        `api/chats/${chatId}/messages/after/?anchor=${lastId}&limit=25`
      );
  
      const newer: Message[] =
        Array.isArray(res?.messages)
          ? res.messages
          : [];
  
      await saveMessages(
        newer,
        currentUser.id
      );
  
      setMessages(prev =>
        deleteMessagesOutsideWindow(
          mergeMessages(
            prev,
            newer
          ),
          lastId,
          40,
          40
        )
      );
  
      setHasNewer(
        !!res.hasNewer
      );
    } finally {
      setLoadingNewer(false);
    }
  };

  // =========================
  // SEND MESSAGE
  // =========================
  const sendMessage = async (
    text?: string
  ) => {
    const messageText =
      text ?? input;
  
    if (
      !messageText.trim() ||
      !chatUser?.id
    ) {
      return;
    }
  
    const message: Message = {
      client_id: crypto.randomUUID(),
  
      chat: chatId!,
  
      sender: currentUser.id,
  
      encrypted_text: messageText,
      caption: "",
  
      media_type: "text",
      media_url: [],
  
      thumbnail: [],
      duration: [],
      waveform: [],
  
      reply_to: replyingTo?.id ?? null,
  
      status: "pending",
      upload_progress: 0,
  
      created_at: new Date().toISOString(),
  
      reactions: [],
      hidden_for: [],
      is_deleted: false,
  
      files: [],
    };

    await sendChatMessage({
      message,
      currentUser,
      socketRef,
      setMessages,
      canCommunicate,
    });
  
    updateConversationStatus(
      "sent"
    );
  
    setInput("");
    setReplyingTo(null);
  
    await clearDraft();
  };

  // =========================
  // LOAD MORE
  // =========================
  const loadMore = async () => {

    if (
      !chatId ||
      !messages.length ||
      loadingMore ||
      !hasMore
    ) {
      return;
    }
  
    setLoadingMore(true);
  
    try {
      const first = messages[0];

      const firstId = first?.id;
      
      if (firstId == null) {
        setLoadingMore(false);
        return;
      }
  
      const res = await apiRequest(
        `api/chats/${chatId}/messages/before/?anchor=${firstId}&limit=25`
      );
  
      const older: Message[] =
        Array.isArray(res?.messages)
          ? res.messages
          : [];
  
      await saveMessages(
        older,
        currentUser.id
      );
  
      setMessages(prev =>
        deleteMessagesOutsideWindow(
          mergeMessages(
            older,
            prev
          ),
          firstId,
          40,
          40
        )
      );
  
      setHasMore(
        !!res.hasOlder
      );
    } finally {
      setLoadingMore(false);
    }
  };

  // =========================
  // RESEND
  // =========================
  const resendPendingMessage = async (msg: any) => {
    await sendChatMessage({
      message: {
        ...msg,
        client_id: msg.client_id,
      },
  
      currentUser,
      socketRef,
      setMessages,
      canCommunicate,
    });
  };
  
  const retryFailedMessage = async (msg: any) => {
    await sendChatMessage({
      message: {
        ...msg,
        client_id: msg.client_id,
      },
  
      currentUser,
      socketRef,
      setMessages,
      canCommunicate,
    });
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
            String(msg.client_id) === String(messageId);
  
          if (!isTarget) return msg;
  
          let reactions = [...(msg.reactions || [])];
  
          const idx = reactions.findIndex(
            r => r.emoji === emoji
          );
  
          if (removed) {
            if (idx >= 0) {
              const users =
              ((reactions[idx].userIds || []) as number[])
                .filter((id: number) => id !== userId);
  
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

  const reactToMessage = async (
    messageId: number | string,
    emoji: string
  ) => {
    const userId = currentUser.id;
  
    let updatedReactions: Reaction[] = [];
  
    setMessages(prev =>
      prev.map(msg => {
        const isTarget =
          String(msg.id) === String(messageId) ||
          String(msg.client_id) === String(messageId);
  
        if (!isTarget) return msg;
  
        let reactions: Reaction[] = msg.reactions
        ? [...msg.reactions]
        : [];
  
        const idx = reactions.findIndex(r => r.emoji === emoji);
  
        if (idx >= 0) {
          const existing = reactions[idx];
  
          let userIds = existing.userIds ? [...existing.userIds] : [];
  
          if (userIds.includes(userId)) {
            userIds = userIds.filter(
              (id: number) => id !== userId
            );
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
          reactions: [...reactions],
        };
      })
    );
  
    // send API AFTER UI update
    updateMessage(String(messageId), userId, {
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
    resendPendingMessage,
    retryFailedMessage,
    loadMore,
    loadNewer,
    hasMore,
    hasNewer,
    reactToMessage,
    setSocketRef,
  };
}