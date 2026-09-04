'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { apiRequest } from '@/utils/api';
import { useNetwork } from '@/components/networkConnection/NetworkContext';
import { sendChatMessage } from "@/utils/chat/sendChatMessage";
import { restoreFiles } from "@/utils/chat/restoreFiles";
import { getPendingOutbox } from "@/utils/chat/outbox";
import { prepareMessages } from "@/utils/chat/prepareMessages";
import { isRenderableMessage } from "@/utils/chat/isRenderableMessage";

import {
  saveMessages,
  getChatScroll,
  getLatestMessages,
  getMessagesWindow,
  deleteMessagesOutsideWindow,
  updateMessage,
  getPendingMessages,
  debugGetExactMessage,
} from '@/lib/messageDB';

import type { Message, MediaSource } from "@/utils/chat/messageContract";
import { createReplySnapshot } from "@/utils/chat/replySnapshot";
import {
  mergeMessages,
  sortMessages,
  getMessageKey
} from '@/utils/chat/messageMerger';

type Props = {
  chatId: number | null;
  currentUser: any;
  chatUser: any;
  input: string;
  socketRef: React.MutableRefObject<any>;
  socketReady: boolean;
  setInput: (v: string) => void;
  replyingTo: any;
  setReplyingTo: (v: any) => void;
  clearDraft: () => Promise<void>;
  updateConversationStatus: (
    status: "sent" | "delivered" | "seen"
  ) => void;
};

type Reaction = {
  emoji: string;
  userIds: number[];
};

type SendMessageInput = {
  encrypted_text: string;
  mention_user_ids?: number[];
  mention_all?: boolean;
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
  socketRef,
  socketReady,
  updateConversationStatus,
}: Props) {

  const [messages, setMessages] = useState<Message[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const [loadingMore, setLoadingMore] =
    useState(false);
  const [hasNewer, setHasNewer] = useState(false);
  const latestMessageIdRef = useRef<number | null>(null);
  const [loadingNewer, setLoadingNewer] = useState(false);
  const {
    canCommunicate,
    networkStatus,
    connectionType,
  } = useNetwork();

  // =========================
  // INIT LOAD
  // =========================
  useEffect(() => {
    if (!chatId || !currentUser?.id) return;
  
    let cancelled = false;
  
    const init = async () => {
      try {
  
        const scroll = await getChatScroll(
          chatId,
          currentUser.id
        );
  
        if (cancelled) return;
  
        let cachedMessages: Message[] = [];
  
        if (scroll?.messageId != null) {
          cachedMessages =
            await getMessagesWindow(
              chatId,
              currentUser.id,
              Number(scroll.messageId),
              25,
              25
            );
        } else {
  
          cachedMessages =
            await getLatestMessages(
              chatId,
              currentUser.id,
              50
            );
        }
  
        if (cancelled) return;
  
        if (cachedMessages.length > 0) {
          const sorted = prepareMessages(
            cachedMessages,
            currentUser.id
          );
          
          setMessages(sorted);
  
          setInitializing(false);
        } else {
  
          setInitializing(true);
        }
  
        const url =
          scroll?.messageId != null
            ? `api/chats/${chatId}/messages/window/?anchor=${scroll.messageId}&before=25&after=25`
            : `api/chats/${chatId}/messages/window/?before=25&after=25`;
  
        const res =
          await apiRequest(url);
  
        if (cancelled) return;
  
        const serverMessages: Message[] =
          Array.isArray(res?.messages)
            ? res.messages
            : [];
  
        console.log(
          "🔵 [INIT] SERVER REPLY DATA BACKEND:",
          serverMessages.map((m: any) => ({
            id: m.id,
            client_id: m.client_id,
            text: m.encrypted_text,
            reply_to: m.reply_to,
            reply_to_id: m.reply_to_id,
          }))
        );
  
        if (serverMessages.length > 0) {
          await saveMessages(
            serverMessages,
            currentUser.id
          );
        }
  
        const replyMessage = serverMessages.find(
          (m: any) => m.id === 49
        );
        
        if (replyMessage) {
          console.log("🧪 [DIRECT TEST] Server message 49:", {
            id: replyMessage.id,
            client_id: replyMessage.client_id,
            reply_to: replyMessage.reply_to,
          });
        }
  
        await debugGetExactMessage(
          chatId,
          currentUser.id,
          "private",
          49
        );
  
        if (cancelled) return;
  
        let freshCachedMessages: Message[] = [];
  
        if (scroll?.messageId != null) {
          freshCachedMessages =
            await getMessagesWindow(
              chatId,
              currentUser.id,
              Number(scroll.messageId),
              40,
              40
            );
  
          await debugGetExactMessage(
            chatId,
            currentUser.id,
            "private",
            49
          );
        } else {
          freshCachedMessages =
            await getLatestMessages(
              chatId,
              currentUser.id,
              50
            );

          console.log(
            "🟢 [INIT] AFTER INDEXEDDB SAVE:",
            freshCachedMessages.map((m: any) => ({
              id: m.id,
              client_id: m.client_id,
              text: m.encrypted_text,
              reply_to: m.reply_to,
              reply_to_id: m.reply_to_id,
            }))
          );
        }
  
        if (
          freshCachedMessages.length === 0 &&
          serverMessages.length > 0
        ) {
          freshCachedMessages =
            serverMessages;
        }
 
        const pendingMessages =
          await getPendingMessages(
            currentUser.id
          );
  
        const outboxMessages =
          await getPendingOutbox(
            currentUser.id
          );
  
        const pendingForChat = [
          ...(Array.isArray(pendingMessages)
            ? pendingMessages
            : []),
  
          ...(Array.isArray(outboxMessages)
            ? outboxMessages
            : []),
        ].filter(
          (message: any) =>
            Number(message.chat) ===
            Number(chatId)
        );
  
        let combined =
          mergeMessages(
            freshCachedMessages,
            pendingForChat,
            currentUser.id
          );
        console.log(
          "🚨 [DUPLICATE DEBUG] BEFORE MERGE",
          {
            cached: freshCachedMessages.map((m: any) => ({
              id: m.id,
              server_id: m.server_id,
              client_id: m.client_id,
              status: m.status,
            })),
        
            pending: pendingForChat.map((m: any) => ({
              id: m.id,
              server_id: m.server_id,
              client_id: m.client_id,
              status: m.status,
            })),
          }
        );
        
        const debugAll = [
          ...freshCachedMessages,
          ...pendingForChat,
        ];
        
        const debugClientIds = new Map<string, any[]>();
        
        for (const message of debugAll) {
          if (!message.client_id) continue;
        
          const list =
            debugClientIds.get(message.client_id) ?? [];
        
          list.push(message);
          debugClientIds.set(
            message.client_id,
            list
          );
        }
        
        const duplicateClientIds =
          [...debugClientIds.entries()]
            .filter(([, list]) => list.length > 1);
        
        if (duplicateClientIds.length) {
          console.error(
            "🚨🚨 DUPLICATES BEFORE MERGE",
            duplicateClientIds.map(
              ([clientId, list]) => ({
                clientId,
                messages: list,
              })
            )
          );
        }
  
        let finalMessages = prepareMessages(
          combined,
          currentUser.id
        );
        const finalKeys = new Map<string, any[]>();

        for (const message of finalMessages) {
          const key = getMessageKey(message);
        
          if (!key) continue;
        
          const list =
            finalKeys.get(key) ?? [];
        
          list.push(message);
        
          finalKeys.set(key, list);
        }
        
        const duplicateFinalKeys =
          [...finalKeys.entries()]
            .filter(([, list]) => list.length > 1);
        
        if (duplicateFinalKeys.length) {
          console.error(
            "🚨🚨 DUPLICATES AFTER PREPARE",
            duplicateFinalKeys.map(
              ([key, list]) => ({
                key,
                messages: list.map((m: any) => ({
                  id: m.id,
                  server_id: m.server_id,
                  client_id: m.client_id,
                  status: m.status,
                })),
              })
            )
          );
        }
  
        const anchorId =
          scroll?.messageId != null
            ? Number(scroll.messageId)
            : serverMessages.at(-1)?.id;
  
        if (anchorId != null) {
          finalMessages =
            deleteMessagesOutsideWindow(
              finalMessages,
              anchorId,
              40,
              40
            );
        }
  
        if (cancelled) return;
  
        setMessages(finalMessages);
  
        setHasMore(
          serverMessages.length > 0
            ? !!res.hasOlder
            : false
        );
  
        setHasNewer(
          serverMessages.length > 0
            ? !!res.hasNewer
            : false
        );
  
      } catch (error) {
        console.error(
          "[useChatMessages] Failed to initialize chat:",
          error
        );
      } finally {
        if (!cancelled) {
          setInitializing(false);
        }
      }
    };
  
    init();
  
    return () => {
      cancelled = true;
    };
  }, [
    chatId,
    currentUser?.id,
  ]);
  
  const refreshNewerMessages = async (
    lastMessageId: number
  ) => {
    if (
      !chatId ||
      !currentUser?.id ||
      !lastMessageId
    ) {
      return false;
    }
  
    try {
      const res = await apiRequest(
        `api/chats/${chatId}/messages/after/?anchor=${lastMessageId}&limit=25`
      );
  
      const newer: Message[] =
        Array.isArray(res?.messages)
          ? res.messages
          : [];
  
      setHasNewer(
        !!res?.hasNewer
      );
  
      if (newer.length === 0) {
        return false;
      }
  
      /*
       * SAVE TO INDEXEDDB FIRST
       */
      await saveMessages(
        newer,
        currentUser.id
      );
  
      /*
       * UPDATE UI
       */
      setMessages(prev =>
        prepareMessages(
          mergeMessages(
            prev,
            newer,
            currentUser.id
          ),
          currentUser.id
        )
      );
  
      return true;
  
    } catch (error) {
      console.error(
        "[useChatMessages] Failed to refresh newer messages:",
        error
      );
  
      return false;
    }
  };
  
  useEffect(() => {
    if (!messages.length) {
      latestMessageIdRef.current = null;
      return;
    }
  
    const serverMessages =
      messages.filter(
        m => m.id != null
      );
  
    if (!serverMessages.length) {
      return;
    }
  
    const latest =
      serverMessages.reduce(
        (latest, message) =>
          Number(message.id) >
          Number(latest.id)
            ? message
            : latest
      );
  
    latestMessageIdRef.current =
      Number(latest.id);
  }, [messages]);
  
  useEffect(() => {
    if (
      !chatId ||
      !currentUser?.id
    ) {
      return;
    }
  
    const interval = setInterval(() => {
      if (!canCommunicate) {
        return;
      }
  
      const lastMessageId =
        latestMessageIdRef.current;
  
      if (lastMessageId == null) {
        return;
      }
  
      refreshNewerMessages(
        lastMessageId
      );
    }, 15000);
  
    return () => {
      clearInterval(interval);
    };
  }, [
    chatId,
    currentUser?.id,
    canCommunicate,
  ]);

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
        (Array.isArray(res?.messages)
          ? res.messages
          : []
        ).filter(isRenderableMessage);
  
      await saveMessages(
        newer,
        currentUser.id
      );
  
      setMessages(prev =>
        deleteMessagesOutsideWindow(
          prepareMessages(
            mergeMessages(
              prev,
              newer,
              currentUser.id
            ),
            currentUser.id
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
  
  const loadMessageWindow = async (
    messageId: number
  ) => {
    const response = await apiRequest(
      `api/chats/${chatId}/messages/window/?anchor=${messageId}&before=25&after=25`
    );
  
    const loadedMessages =
      Array.isArray(response?.messages)
        ? response.messages
        : [];
  
    setMessages(prev =>
      prepareMessages(
        mergeMessages(
          prev,
          loadedMessages,
          currentUser.id
        ),
        currentUser.id
      )
    );
  
    return loadedMessages;
  };

  // =========================
  // SEND MESSAGE
  // =========================
  const sendMessage = async (
    data?: SendMessageInput
  ) => {
  
    console.log("");
    console.log("========================================");
    console.log("🚀 [SEND 2] useChatMessages.sendMessage");
  
    const rawMessageText =
      data?.encrypted_text ?? input;
    
    const mentionUserIds =
      data?.mention_user_ids ?? [];
    
    const mentionAll =
      data?.mention_all ?? false;
  
    console.log(
      "🧪 [SEND 2] raw message text:",
      rawMessageText,
      "type:",
      typeof rawMessageText
    );
    
    if (
      rawMessageText != null &&
      typeof rawMessageText !== "string"
    ) {
      console.error(
        "🚨 [SEND 2] INVALID TEXT ARGUMENT",
        {
          value: rawMessageText,
          type: typeof rawMessageText,
          keys:
            typeof rawMessageText === "object"
              ? Object.keys(rawMessageText)
              : undefined,
        }
      );
    }
  
    const messageText =
      typeof rawMessageText === "string"
        ? rawMessageText
        : "";
  
    const clientCreatedAt =
      new Date().toISOString();
    
    const replySnapshot =
      createReplySnapshot(replyingTo);
    
    if (
      !messageText.trim() ||
      !chatUser?.id
    ) {
      console.error(
        "❌ [SEND 2] Message blocked before sendChatMessage",
        {
          messageText,
          rawMessageText,
          rawType: typeof rawMessageText,
          chatUserId: chatUser?.id,
        }
      );
    
      return;
    }
  
    console.log(
      "✅ [SEND 2] Validation passed"
    );
  
    const message: Message = {
      client_id: crypto.randomUUID(),
    
      client_sequence: Date.now(),
    
      chat: chatId!,
  
      sender: currentUser.id,
  
      encrypted_text: messageText,
      caption: "",
  
      mention_user_ids: mentionUserIds,
      mention_all: mentionAll,
      media_type: "text",
      media_url: [],
  
      thumbnail: [],
      duration: [],
      waveform: [],
      status: canCommunicate
        ? "sending"
        : "pending",
      
      media_status:
        "none",
  
      reply_to: replySnapshot,

      reply_to_id:
        replySnapshot?.id ?? null,
      
      reply_to_client_id:
        replySnapshot?.client_id ?? undefined,
  
      upload_progress: 0,
  
      client_created_at: clientCreatedAt,
      created_at:
        clientCreatedAt,
  
      reactions: [],
      hidden_for: [],
      is_deleted: false,
  
      files: [],
    };
  
    console.log(
      "📦 [SEND 2] Message object created:",
      message
    );
  
    try {
  
      console.log(
        "➡️ [SEND 2] Calling sendChatMessage..."
      );
  
      const result =
        await sendChatMessage({
          message,
          currentUser,
          socketRef,
          setMessages,
          canCommunicate,
          networkStatus,
          connectionType,
        });
  
      console.log(
        "⬅️ [SEND 2] sendChatMessage returned:",
        result
      );
  
    } catch (err) {
  
      console.error(
        "❌ [SEND 2] sendChatMessage THREW ERROR:",
        err
      );
  
      throw err;
    }
  
    console.log(
      "📊 [SEND 2] Updating conversation status"
    );
  
    updateConversationStatus?.("sent");
  
    setInput("");
    setReplyingTo(null);
  
    await clearDraft();
  
    console.log(
      "✅ [SEND 2] sendMessage COMPLETE"
    );
  };
  
  useEffect(() => {
    const socket = socketRef.current;
  
    if (!socket) {
      return;
    }
  
    const handleMessagesDeleted = async({
      chatId: eventChatId,
      messageIds,
      deletedByAdmin,
    }: any) => {
  
      if (
        Number(eventChatId) !==
        Number(chatId)
      ) {
        return;
      }
  
      if (
        !Array.isArray(messageIds) ||
        !messageIds.length
      ) {
        return;
      }
  
      const deletedSet = new Set(
        messageIds.map(Number)
      );
  
      setMessages(prev =>
        prev.map(message => {
  
          const messageId = Number(
            message.server_id ?? message.id
          );
  
          if (!deletedSet.has(messageId)) {
            return message;
          }
  
          return {
            ...message,
  
            is_deleted: true,
  
            deleted_by_admin:
              Boolean(deletedByAdmin),
  
            text:
              deletedByAdmin
                ? "Deleted by administrator"
                : "Deleted message",
  
            encrypted_text: "",
            caption: "",
  
            media_assets: [],
            media_url: [],
            thumbnail: [],
            duration: [],
            waveform: [],
  
            media_type: "text",
            media_source: undefined,
  
            preview: null,
            files: [],
          };
        })
      );

      for (const id of messageIds) {
        const message = messages.find(
          (m) =>
            Number(m.server_id ?? m.id) ===
            Number(id)
        );
      
        if (!message) {
          continue;
        }
      
        const clientId =
          message.client_id ??
          `server-${id}`;
      
        await updateMessage(
          String(clientId),
          currentUser.id,
          {
            is_deleted: true,
            deleted_by_admin:
              Boolean(deletedByAdmin),
            text:
              deletedByAdmin
                ? "Deleted by administrator"
                : "Deleted message",
            encrypted_text: "",
            caption: "",
            media_assets: [],
            media_url: [],
            thumbnail: [],
            duration: [],
            waveform: [],
            media_type: "text",
            media_source: null,
            preview: null,
            files: [],
          }
        );
      }
    };
  
    socket.on(
      "messages_deleted",
      handleMessagesDeleted
    );
  
    return () => {
      socket.off(
        "messages_deleted",
        handleMessagesDeleted
      );
    };
  
  }, [
    socketReady,
    chatId,
    socketRef,
  ]);

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
        (Array.isArray(res?.messages)
          ? res.messages
          : []
        ).filter(isRenderableMessage);
  
      await saveMessages(
        older,
        currentUser.id
      );
  
      setMessages(prev =>
        deleteMessagesOutsideWindow(
          prepareMessages(
            mergeMessages(
              older,
              prev,
              currentUser.id
            ),
            currentUser.id
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
      networkStatus,
      connectionType,
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
      networkStatus,
      connectionType,
    });
  };
  
  useEffect(() => {
    if (!chatId || !socketReady || !socketRef.current) {
      return;
    }
  
    socketRef.current.emit("mark_seen", {
      chatId,
    });
  }, [chatId, socketReady]);
  
  // =========================
  // REACTION
  // =========================
  useEffect(() => {
    if (!socketReady || !socketRef.current) {
      return;
    }
  
    const socket = socketRef.current;
  
    const handleReaction = (data: any) => {
      const {
        messageId,
        emoji,
        userId,
        removed,
      } = data;
  
      const reactionUserId = Number(userId);
  
      setMessages(prev =>
        prev.map(msg => {
          const isTarget =
            String(msg.id) === String(messageId) ||
            String(msg.server_id) === String(messageId) ||
            String(msg.client_id) === String(messageId);
  
          if (!isTarget) {
            return msg;
          }
  
          let reactions: Reaction[] =
            Array.isArray(msg.reactions)
              ? msg.reactions.map(r => ({
                  emoji: r.emoji,
                  userIds: Array.isArray(r.userIds)
                    ? [...r.userIds]
                    : [],
                }))
              : [];
  
          if (removed) {
            reactions = reactions
              .map(r => ({
                ...r,
                userIds: r.userIds.filter(
                  id =>
                    Number(id) !== reactionUserId
                ),
              }))
              .filter(
                r => r.userIds.length > 0
              );
  
            return {
              ...msg,
              reactions,
            };
          }
  
          reactions = reactions
            .map(r => ({
              ...r,
              userIds: r.userIds.filter(
                id =>
                  Number(id) !== reactionUserId
              ),
            }))
            .filter(
              r => r.userIds.length > 0
            );
  
          // Find requested emoji.
          const emojiIndex =
            reactions.findIndex(
              r => r.emoji === emoji
            );
  
          if (emojiIndex >= 0) {
            const alreadyExists =
              reactions[emojiIndex].userIds.some(
                id =>
                  Number(id) === reactionUserId
              );
  
            if (!alreadyExists) {
              reactions[emojiIndex] = {
                ...reactions[emojiIndex],
                userIds: [
                  ...reactions[emojiIndex].userIds,
                  reactionUserId,
                ],
              };
            }
          } else {
            reactions.push({
              emoji,
              userIds: [reactionUserId],
            });
          }
  
          return {
            ...msg,
            reactions,
          };
        })
      );
    };
  
    socket.on(
      "reaction",
      handleReaction
    );
  
    return () => {
      socket.off(
        "reaction",
        handleReaction
      );
    };
  }, [socketReady]);

  const reactToMessage = async (
    messageId: number | string,
    emoji: string
  ) => {
    const userId = Number(currentUser.id);
  
    // Resolve the actual message.
    const message = messages.find(msg =>
      String(msg.id) === String(messageId) ||
      String(msg.server_id) === String(messageId) ||
      String(msg.client_id) === String(messageId)
    );
  
    if (!message) {
      console.warn(
        "[Reaction] Cannot react: message not found",
        messageId
      );
      return;
    }
  
    // The reaction endpoint requires the real server message ID.
    const numericMessageId = Number(
      message.server_id ?? message.id
    );
  
    if (
      !Number.isInteger(numericMessageId) ||
      numericMessageId <= 0
    ) {
      console.warn(
        "[Reaction] Cannot react: message has no server ID",
        {
          messageId,
          id: message.id,
          server_id: message.server_id,
          client_id: message.client_id,
        }
      );
  
      return;
    }
  
    let updatedReactions: Reaction[] | null = null;
  
    setMessages(prev =>
      prev.map(msg => {
        const isTarget =
          String(msg.id) === String(messageId) ||
          String(msg.server_id) === String(messageId) ||
          String(msg.client_id) === String(messageId);
  
        if (!isTarget) {
          return msg;
        }
  
        let reactions: Reaction[] =
          Array.isArray(msg.reactions)
            ? msg.reactions.map(r => ({
                emoji: r.emoji,
                userIds: Array.isArray(r.userIds)
                  ? [...r.userIds]
                  : [],
              }))
            : [];
  
        // Find the emoji this user currently owns.
        const existingUserReactionIndex =
          reactions.findIndex(r =>
            r.userIds.some(
              id => Number(id) === userId
            )
          );
  
        const existingUserEmoji =
          existingUserReactionIndex >= 0
            ? reactions[existingUserReactionIndex].emoji
            : null;
  
        if (existingUserEmoji === emoji) {
          reactions = reactions
            .map(r => ({
              ...r,
              userIds: r.userIds.filter(
                id => Number(id) !== userId
              ),
            }))
            .filter(
              r => r.userIds.length > 0
            );
        }
  
        else {
          // Remove user's previous reaction first.
          reactions = reactions
            .map(r => ({
              ...r,
              userIds: r.userIds.filter(
                id => Number(id) !== userId
              ),
            }))
            .filter(
              r => r.userIds.length > 0
            );
  
          // Find the requested emoji group.
          const emojiIndex =
            reactions.findIndex(
              r => r.emoji === emoji
            );
  
          if (emojiIndex >= 0) {
            reactions[emojiIndex] = {
              ...reactions[emojiIndex],
              userIds: [
                ...reactions[emojiIndex].userIds,
                userId,
              ],
            };
          } else {
            reactions.push({
              emoji,
              userIds: [userId],
            });
          }
        }
  
        updatedReactions = reactions;
  
        return {
          ...msg,
          reactions,
        };
      })
    );
  
    if (!updatedReactions) {
      return;
    }
  
    try {
      // Persist optimistic state locally.
      await updateMessage(
        String(
          message.client_id ??
          message.id
        ),
        userId,
        {
          reactions: updatedReactions,
        }
      );
  
      // Tell server.
      socketRef.current?.emit(
        "reaction",
        {
          messageId: numericMessageId,
          emoji,
          chatId,
        }
      );
  
    } catch (error) {
      console.error(
        "[Reaction] Failed to persist reaction:",
        error
      );
    }
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
    initializing,
    loadMessageWindow,
    reactToMessage,
  };
}