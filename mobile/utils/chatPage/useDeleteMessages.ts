'use client';

import { useCallback, useMemo } from "react";
import { apiRequest } from "@/utils/api";
import { getMessageKey } from "@/utils/chat/messageMerger";

import {
  updateMessage,
  deleteMessage,
  deleteChatDataByType,
  getMessagesByChatType,
} from "@/lib/messageDB";

import {
  updateCommunityMessage,
} from "@/lib/communityMessageDB";

import {
  removeFromOutbox,
  getOutboxMessages,
  deleteOutboxMessagesForChat,
} from "@/utils/chat/outbox";

interface UseDeleteMessagesProps {
  chatId?: number;
  communityId?: number;
  chatType: "private" | "community";
  messages: any[];
  setMessages: React.Dispatch<React.SetStateAction<any[]>>;
  selectedMessages: Set<string>;
  currentUser: {
    id: number;
  };
  socketRef: React.MutableRefObject<any>;
  clearSelection: () => void;
  closeDeleteModal: () => void;
  replace: (url: string) => void;
}

export function useDeleteMessages({
  chatId,
  chatType,
  communityId,
  messages,
  setMessages,
  socketRef,
  selectedMessages,
  currentUser,
  clearSelection,
  closeDeleteModal,
  replace,
}: UseDeleteMessagesProps) {

  const getSelectedMessages = useCallback(() => {
    return messages.filter((message) => {
      const key = getMessageKey(message);
  
      return (
        key !== null &&
        selectedMessages.has(key)
      );
    });
  }, [messages, selectedMessages]);

  const selected = useMemo(
    () => getSelectedMessages(),
    [getSelectedMessages]
  );

  const isPendingMessage = useCallback((msg: any) => {
    return (
      !msg?.server_id &&
      !msg?.id &&
      (
        msg?.pending === true ||
        msg?.is_pending === true ||
        msg?.local === true ||
        msg?.is_local === true ||
        msg?.status === "pending" ||
        msg?.status === "sending" ||
        msg?.status === "uploading" ||
        msg?.status === "failed" ||
        msg?.status === "queued"
      )
    );
  }, []);

  const isSyncedBackendMessage = useCallback((msg: any) => {
    return (
      !isPendingMessage(msg) &&
      (
        msg?.server_id != null ||
        (
          typeof msg?.id === "number" &&
          msg.id > 0
        )
      )
    );
  }, [isPendingMessage]);

  const isOwnMessage = useCallback(
    (msg: any) => {
      return (
        Number(msg?.sender) ===
        Number(currentUser.id)
      );
    },
    [currentUser.id]
  );

  const conversationId = useMemo(() => {
    return chatType === "community"
      ? communityId
      : chatId;
  }, [
    chatType,
    chatId,
    communityId,
  ]);

  const updateLocalMessage = useCallback(
    async (
      clientId: string,
      patch: any
    ) => {
      if (chatType === "community") {
        await updateCommunityMessage(
          clientId,
          currentUser.id,
          patch
        );
      } else {
        await updateMessage(
          clientId,
          currentUser.id,
          patch
        );
      }
    },
    [
      chatType,
      currentUser.id,
    ]
  );

  const canDeleteForEveryone =
    selected.length > 0 &&
    selected.every((msg) =>
      isOwnMessage(msg) &&
      isSyncedBackendMessage(msg) &&
      !msg.is_deleted
    );

  const handleDeleteForMe = async () => {

    console.log("");
    console.log("========================================");
    console.log("🗑️ [DELETE FOR ME] START");
    console.log("========================================");
  
    console.log("🗑️ chatType:", chatType);
    console.log("🗑️ chatId:", chatId);
    console.log("🗑️ communityId:", communityId);
    console.log("🗑️ conversationId:", conversationId);
    console.log("🗑️ currentUser:", currentUser);
  
    const selectedMessages =
      getSelectedMessages();
      
      console.log(
      "🗑️ selectedMessages Set:",
      selectedMessages
    );
  
    console.log(
      "🗑️ selectedMessages count:",
      selectedMessages.length
    );
  
    console.log(
      "🗑️ SELECTED MESSAGE OBJECTS:",
      selectedMessages
    );
  
    console.log(
      "🗑️ SELECTED MESSAGE DETAILS:",
      selectedMessages.map((msg: any) => ({
        id: msg?.id,
        server_id: msg?.server_id,
        client_id: msg?.client_id,
        sender: msg?.sender,
        currentUser: currentUser.id,
        status: msg?.status,
        pending: msg?.pending,
        is_pending: msg?.is_pending,
        local: msg?.local,
        is_local: msg?.is_local,
        hidden_for: msg?.hidden_for,
        is_deleted: msg?.is_deleted,
        messageKey: getMessageKey(msg),
  
        isOwn:
          Number(msg?.sender) ===
          Number(currentUser.id),
  
        isPending:
          isPendingMessage(msg),
  
        isSynced:
          isSyncedBackendMessage(msg),
      }))
    );
  
    if (!selectedMessages.length) {
      console.warn(
        "⚠️ [DELETE FOR ME] STOP: No selected messages"
      );
      return;
    }
  
    try {
  
      const pendingMessages =
        selectedMessages.filter(
          isPendingMessage
        );
  
      const backendMessages =
        selectedMessages.filter(
          isSyncedBackendMessage
        );
  
      console.log(
        "📦 [DELETE FOR ME] PENDING MESSAGES:",
        pendingMessages
      );
  
      console.log(
        "📦 [DELETE FOR ME] BACKEND MESSAGES:",
        backendMessages
      );
  
      console.log(
        "📊 [DELETE FOR ME] COUNTS:",
        {
          selected: selectedMessages.length,
          pending: pendingMessages.length,
          backend: backendMessages.length,
        }
      );
  
      // ==================================================
      // 2. DELETE PENDING FROM INDEXEDDB + OUTBOX
      // ==================================================
  
      for (const msg of pendingMessages) {
  
        console.log(
          "⏳ [DELETE FOR ME] PROCESSING PENDING MESSAGE:",
          {
            client_id: msg?.client_id,
            id: msg?.id,
            server_id: msg?.server_id,
            status: msg?.status,
          }
        );
  
        if (!msg.client_id) {
  
          console.warn(
            "⚠️ [DELETE FOR ME] Pending message has NO client_id:",
            msg
          );
  
          continue;
        }
  
        console.log(
          "🗑️ [DELETE FOR ME] deleteMessage() START:",
          msg.client_id
        );
  
        await deleteMessage(
          String(msg.client_id),
          currentUser.id
        );
  
        console.log(
          "✅ [DELETE FOR ME] deleteMessage() COMPLETE:",
          msg.client_id
        );
  
        console.log(
          "📤 [DELETE FOR ME] removeFromOutbox() START:",
          msg.client_id
        );
  
        await removeFromOutbox(
          String(msg.client_id)
        );
  
        console.log(
          "✅ [DELETE FOR ME] removeFromOutbox() COMPLETE:",
          msg.client_id
        );
      }
  
      // ==================================================
      // 3. EXTRACT BACKEND IDS
      // ==================================================
  
      const backendIds =
        backendMessages
          .map((msg: any) =>
            Number(
              msg.server_id ??
              msg.id
            )
          )
          .filter(Number.isFinite);
  
      console.log(
        "🆔 [DELETE FOR ME] BACKEND IDS:",
        backendIds
      );
  
      // ==================================================
      // 4. HIDE BACKEND MESSAGES ON SERVER
      // ==================================================
  
      if (backendIds.length) {
  
        console.log(
          "📡 [DELETE FOR ME] API HIDE REQUEST START",
          {
            url: "api/chats/hide/",
            method: "POST",
            message_ids: backendIds,
          }
        );
  
        const hideResponse =
          await apiRequest(
            `api/chats/hide/`,
            {
              method: "POST",
              data: {
                message_ids: backendIds,
              },
            }
          );
  
        console.log(
          "📥 [DELETE FOR ME] API HIDE RESPONSE:",
          hideResponse
        );
  
        console.log(
          "✅ [DELETE FOR ME] SERVER HIDE COMPLETE"
        );
  
      } else {
  
        console.log(
          "ℹ️ [DELETE FOR ME] No backend messages to hide"
        );
      }
  
      // ==================================================
      // 5. UPDATE INDEXEDDB FOR BACKEND MESSAGES
      // ==================================================
  
      for (const msg of backendMessages) {
  
        console.log(
          "💾 [DELETE FOR ME] INDEXEDDB BACKEND MESSAGE:",
          {
            id: msg?.id,
            server_id: msg?.server_id,
            client_id: msg?.client_id,
          }
        );
  
        const clientId =
          msg.client_id ??
          `server-${msg.server_id ?? msg.id}`;
  
        console.log(
          "💾 [DELETE FOR ME] RESOLVED CLIENT ID:",
          clientId
        );
  
        const hiddenFor =
          Array.isArray(msg.hidden_for)
            ? [...msg.hidden_for]
            : [];
  
        console.log(
          "👤 [DELETE FOR ME] hidden_for BEFORE:",
          hiddenFor
        );
  
        if (
          !hiddenFor.some(
            (id: any) =>
              Number(id) ===
              Number(currentUser.id)
          )
        ) {
          hiddenFor.push(
            currentUser.id
          );
        }
  
        console.log(
          "👤 [DELETE FOR ME] hidden_for AFTER:",
          hiddenFor
        );
  
        console.log(
          "💾 [DELETE FOR ME] updateLocalMessage START:",
          {
            clientId,
            patch: {
              hidden_for: hiddenFor,
            },
          }
        );
  
        await updateLocalMessage(
          String(clientId),
          {
            hidden_for: hiddenFor,
          }
        );
  
        console.log(
          "✅ [DELETE FOR ME] updateLocalMessage COMPLETE:",
          clientId
        );
      }
  
      // ==================================================
      // 6. REMOVE FROM CURRENT UI
      // ==================================================
  
      const selectedKeys =
        new Set(
          selectedMessages
            .map(getMessageKey)
            .filter(
              (key): key is string =>
                key !== null
            )
        );
  
      console.log(
        "🔑 [DELETE FOR ME] SELECTED KEYS:",
        [...selectedKeys]
      );
  
      console.log(
        "🖥️ [DELETE FOR ME] UI MESSAGE COUNT BEFORE:",
        messages.length
      );
  
      setMessages((prev) => {
  
        console.log(
          "🖥️ [DELETE FOR ME] setMessages PREVIOUS COUNT:",
          prev.length
        );
  
        const next =
          prev.filter(
            (message) => {
  
              const key =
                getMessageKey(message);
              
              const shouldRemove =
                key !== null &&
                selectedKeys.has(key);
  
              console.log(
                "🖥️ [DELETE FOR ME] UI CHECK:",
                {
                  key,
                  shouldRemove,
                  client_id:
                    message?.client_id,
                  id:
                    message?.id,
                  server_id:
                    message?.server_id,
                }
              );
  
              return !shouldRemove;
            }
          );
  
        console.log(
          "🖥️ [DELETE FOR ME] UI MESSAGE COUNT AFTER:",
          next.length
        );
  
        return next;
      });
  
      console.log(
        "🧹 [DELETE FOR ME] CLEARING SELECTION"
      );
  
      clearSelection();
  
      console.log(
        "❎ [DELETE FOR ME] CLOSING DELETE MODAL"
      );
  
      closeDeleteModal();
  
      // ==================================================
      // 7. CONVERSATION ID CHECK
      // ==================================================
  
      if (conversationId == null) {
  
        console.warn(
          "⚠️ [DELETE FOR ME] conversationId is NULL"
        );
  
        console.log(
          "========================================"
        );
  
        return;
      }
  
      console.log(
        "💬 [DELETE FOR ME] conversationId:",
        conversationId
      );
  
      // ==================================================
      // 8. READ REMAINING INDEXEDDB MESSAGES
      // ==================================================
  
      console.log(
        "📖 [DELETE FOR ME] getMessagesByChatType START",
        {
          conversationId,
          ownerId: currentUser.id,
          chatType,
        }
      );
  
      const remainingMessages =
        await getMessagesByChatType(
          Number(conversationId),
          currentUser.id,
          chatType
        );
  
      console.log(
        "📖 [DELETE FOR ME] REMAINING INDEXEDDB MESSAGES:",
        remainingMessages
      );
  
      console.log(
        "📊 [DELETE FOR ME] REMAINING MESSAGE COUNT:",
        remainingMessages.length
      );
  
      // ==================================================
      // 9. READ OUTBOX
      // ==================================================
  
      console.log(
        "📤 [DELETE FOR ME] getOutboxMessages START"
      );
  
      const remainingOutbox =
        await getOutboxMessages(
          currentUser.id
        );
  
      console.log(
        "📤 [DELETE FOR ME] ALL REMAINING OUTBOX:",
        remainingOutbox
      );
  
      // ==================================================
      // 10. FILTER OUTBOX FOR CURRENT CHAT
      // ==================================================
  
      const remainingPendingForChat =
        remainingOutbox.filter(
          (item: any) => {
  
            console.log(
              "🔎 [DELETE FOR ME] OUTBOX CHECK:",
              {
                item,
                chatType,
                chatId,
                communityId,
              }
            );
  
            if (
              item.chat_type !==
              chatType
            ) {
              return false;
            }
  
            if (
              chatType ===
              "community"
            ) {
  
              return (
                Number(
                  item.community_id
                ) ===
                Number(communityId)
              );
            }
  
            return (
              Number(item.chat_id) ===
              Number(chatId)
            );
          }
        );
  
      console.log(
        "📤 [DELETE FOR ME] REMAINING PENDING FOR CHAT:",
        remainingPendingForChat
      );
  
      console.log(
        "📊 [DELETE FOR ME] PENDING COUNT FOR CHAT:",
        remainingPendingForChat.length
      );
  
      // ==================================================
      // 11. CHECK IF CHAT IS NOW EMPTY
      // ==================================================
  
      const chatIsEmpty =
        remainingMessages.length === 0 &&
        remainingPendingForChat.length === 0;
  
      console.log(
        "🧮 [DELETE FOR ME] CHAT EMPTY CHECK:",
        {
          remainingMessages:
            remainingMessages.length,
  
          remainingPendingForChat:
            remainingPendingForChat.length,
  
          chatIsEmpty,
        }
      );
  
      if (chatIsEmpty) {
  
        console.log(
          "🧹 [DELETE FOR ME] CHAT IS EMPTY"
        );
  
        console.log(
          "🧹 [DELETE FOR ME] deleteChatDataByType START"
        );
  
        await deleteChatDataByType(
          Number(conversationId),
          currentUser.id,
          chatType
        );
  
        console.log(
          "✅ [DELETE FOR ME] deleteChatDataByType COMPLETE"
        );
  
        console.log(
          "🧹 [DELETE FOR ME] deleteOutboxMessagesForChat START"
        );
  
        await deleteOutboxMessagesForChat(
          Number(conversationId),
          currentUser.id,
          chatType
        );
  
        console.log(
          "✅ [DELETE FOR ME] deleteOutboxMessagesForChat COMPLETE"
        );
  
        console.log(
          "📢 [DELETE FOR ME] DISPATCHING chat-deleted EVENT",
          {
            conversationId:
              Number(conversationId),
  
            chatType,
          }
        );
  
        window.dispatchEvent(
          new CustomEvent(
            "chat-deleted",
            {
              detail: {
                conversationId:
                  Number(conversationId),
  
                chatType,
              },
            }
          )
        );
  
        console.log(
          "🚀 [DELETE FOR ME] REDIRECTING TO /main/messages"
        );
  
        replace(
          "/main/messages"
        );
  
      } else {
  
        console.log(
          "ℹ️ [DELETE FOR ME] CHAT STILL HAS DATA — NO REDIRECT"
        );
      }
  
      console.log("");
      console.log("========================================");
      console.log("✅ [DELETE FOR ME] COMPLETE");
      console.log("========================================");
  
    } catch (err) {
  
      console.error("");
      console.error(
        "❌❌❌ [DELETE FOR ME] FAILED"
      );
  
      console.error(
        "❌ ERROR:",
        err
      );
  
      console.error(
        "❌ ERROR MESSAGE:",
        err instanceof Error
          ? err.message
          : err
      );
  
      console.error(
        "❌ ERROR STACK:",
        err instanceof Error
          ? err.stack
          : undefined
      );
  
      console.error(
        "❌ STATE AT FAILURE:",
        {
          chatType,
          chatId,
          communityId,
          conversationId,
          currentUser:
            currentUser.id,
  
          selectedCount:
            selectedMessages.length,
  
          selectedMessages,
        }
      );
  
      console.log(
        "========================================"
      );
    }
  };

  const handleDeleteForEveryone =
    async () => {
  
      console.log("");
      console.log("========================================");
      console.log("🗑️ [DELETE EVERYONE] START");
      console.log("========================================");
  
      console.log("🗑️ chatType:", chatType);
      console.log("🗑️ chatId:", chatId);
      console.log("🗑️ communityId:", communityId);
      console.log("🗑️ currentUser:", currentUser);
  
      const selectedMessages =
        getSelectedMessages();
  
      console.log(
        "🗑️ SELECTED MESSAGE OBJECTS:",
        selectedMessages
      );
  
      console.log(
        "🗑️ SELECTED MESSAGE DETAILS:",
        selectedMessages.map((msg: any) => ({
          id: msg?.id,
          server_id: msg?.server_id,
          client_id: msg?.client_id,
          sender: msg?.sender,
          currentUser: currentUser.id,
          status: msg?.status,
          pending: msg?.pending,
          is_deleted: msg?.is_deleted,
          isOwn:
            Number(msg?.sender) ===
            Number(currentUser.id),
          isSynced:
            isSyncedBackendMessage(msg),
          messageKey:
            getMessageKey(msg),
        }))
      );
  
      if (!selectedMessages.length) {
        console.warn(
          "⚠️ [DELETE EVERYONE] STOP: No selected messages"
        );
        return;
      }

      // Absolute safety check
      const canDeleteSelected =
        selectedMessages.every((msg: any) => {
      
          const own =
            isOwnMessage(msg);
      
          const synced =
            isSyncedBackendMessage(msg);
      
          const notDeleted =
            !msg.is_deleted;
      
          console.log(
            "🔍 [DELETE CHECK]",
            {
              client_id: msg?.client_id,
              id: msg?.id,
              server_id: msg?.server_id,
      
              own,
              synced,
              notDeleted,
      
              sender: msg?.sender,
              currentUser: currentUser.id,
      
              status: msg?.status,
              pending: msg?.pending,
              is_deleted: msg?.is_deleted,
            }
          );
      
          return (
            own &&
            synced &&
            notDeleted
          );
        });
      
      console.log(
        "🔍 [DELETE CHECK] FINAL:",
        canDeleteSelected
      );
      
      if (!canDeleteSelected) {
        console.warn(
          "⚠️ [DELETE EVERYONE] STOP: Safety check failed",
          selectedMessages.map((msg: any) => ({
            id: msg?.id,
            server_id: msg?.server_id,
            client_id: msg?.client_id,
            sender: msg?.sender,
            currentUser: currentUser.id,
            status: msg?.status,
            is_deleted: msg?.is_deleted,
            own: isOwnMessage(msg),
            synced: isSyncedBackendMessage(msg),
          }))
        );

        return;
      }

      const messageIds =
        selectedMessages
          .map((msg) =>
            Number(
              msg.server_id ??
              msg.id
            )
          )
          .filter(Number.isFinite);

      console.log(
        "🆔 [DELETE EVERYONE] MESSAGE IDS:",
        messageIds
      );
      
      if (!messageIds.length) {
        console.error(
          "❌ [DELETE EVERYONE] STOP: No valid backend message IDs"
        );
        return;
      }

      try {

        console.log(
          "🗑️ [DELETE EVERYONE] Sending:",
          messageIds
        );
  
        console.log(
          "🆔 [DELETE EVERYONE] ID MAPPING:",
          selectedMessages.map((msg: any) => ({
            client_id: msg?.client_id,
            id: msg?.id,
            server_id: msg?.server_id,
            chosen:
              msg?.server_id ??
              msg?.id,
          }))
        );

        console.log(
          "📡 [DELETE EVERYONE] API REQUEST",
          {
            url: "api/chats/delete/",
            method: "POST",
            data: {
              message_ids: messageIds,
            },
          }
        );
        
        const response =
          await apiRequest(
            `api/chats/delete/`,
            {
              method: "POST",
              data: {
                message_ids: messageIds,
              },
            }
          );
        
        console.log(
          "📥 [DELETE EVERYONE] API RESPONSE:",
          response
        );

        const deleted =
          response.data?.deleted ?? [];

        const deletedId = deleted
          .map((item: any) => Number(item.id))
          .filter(Number.isFinite);
        
        console.log(
          "🗑️ [DELETE EVERYONE] response.data:",
          response?.data
        );
        
        console.log(
          "🗑️ [DELETE EVERYONE] deleted:",
          deleted
        );
        
        console.log(
          "🗑️ [DELETE EVERYONE] deletedId:",
          deletedId
        );
        
        if (!deletedId.length) {
          console.error(
            "❌ [DELETE EVERYONE] STOP: Backend returned no deleted IDs"
          );
        
          return;
        }
  
        if (!deletedId.length) {
          return;
        }
  
        console.log(
          "📡 [DELETE EVERYONE] ABOUT TO EMIT SOCKET DELETE",
          {
            chatType,
            chatId,
            communityId,
            deletedId,
            socketExists:
              !!socketRef.current,
            socketConnected:
              socketRef.current?.connected,
          }
        );
  
        if (chatType === "community") {

          console.log(
            "🏘️ [DELETE EVERYONE] EMIT community_delete",
            {
              communityId,
              messageIds: deletedId,
              deletedByAdmin: false,
            }
          );
        
          socketRef.current?.emit(
            "community_delete",
            {
              communityId,
              messageIds: deletedId,
              deletedByAdmin: false,
            }
          );
        
        } else {
        
          console.log(
            "💬 [DELETE EVERYONE] EMIT delete_messages",
            {
              chatId,
              messageIds: deletedId,
              deletedByAdmin: false,
            }
          );
        
          socketRef.current?.emit(
            "delete_messages",
            {
              chatId,
              messageIds: deletedId,
              deletedByAdmin: false,
            }
          );
        }
  
        console.log(
          "✅ [DELETE EVERYONE] Backend:",
          response
        );

        for (const msg of selectedMessages) {
          console.log(
            "💾 [DELETE EVERYONE] LOCAL UPDATE START",
            {
              id: msg?.id,
              server_id: msg?.server_id,
              client_id: msg?.client_id,
            }
          );

          const clientId =
            msg.client_id ??
            `server-${msg.server_id ?? msg.id}`;

          const deletedPatch = {
            is_deleted: true,

            deleted_by_admin:
              Boolean(
                msg.deleted_by_admin
              ),

            text:
              msg.deleted_by_admin
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
          };

          console.log(
            "💾 [DELETE EVERYONE] updateLocalMessage",
            {
              clientId,
              deletedPatch,
            }
          );
          await updateLocalMessage(
            String(clientId),
            deletedPatch
          );

          console.log(
            "✅ [DELETE EVERYONE] LOCAL UPDATE COMPLETE",
            {
              clientId,
            }
          );
        }

        const deletedIds =
          new Set(
            selectedMessages.map(
              (msg) =>
                Number(
                  msg.server_id ??
                  msg.id
                )
            )
          );

        console.log(
          "🖥️ [DELETE EVERYONE] UPDATING UI STATE",
          {
            deletedIds: [...deletedIds],
            currentMessages: messages.map((m: any) => ({
              id: m?.id,
              server_id: m?.server_id,
              client_id: m?.client_id,
            })),
          }
        );
        setMessages((prev) =>
          prev.map((message) => {
        
            const messageId =
              Number(
                message.server_id ??
                message.id
              );
        
            const shouldDelete =
              deletedIds.has(messageId);
        
            console.log(
              "🖥️ [DELETE EVERYONE] UI MESSAGE CHECK",
              {
                messageId,
                client_id: message?.client_id,
                shouldDelete,
              }
            );
        
            if (!shouldDelete) {
              return message;
            }
        
            console.log(
              "🗑️ [DELETE EVERYONE] UI MARKING DELETED:",
              message
            );
        
            return {
              ...message,
              is_deleted: true,
              text: "Deleted message",
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
            };
          })
        );

        const deletedServerIds =
          new Set(
            selectedMessages
              .map((msg) =>
                Number(
                  msg.server_id ??
                  msg.id
                )
              )
              .filter(Number.isFinite)
          );

        const deletedClientIds =
          new Set(
            selectedMessages
              .map(
                (msg) =>
                  msg.client_id
              )
              .filter(Boolean)
          );

        for (const message of messages) {

          const replyToId =
            message.reply_to_id ??
            (
              typeof message.reply_to ===
              "number"
                ? message.reply_to
                : message.reply_to?.id
            );

          const replyToClientId =
            message.reply_to_client_id ??
            (
              typeof message.reply_to ===
              "string"
                ? message.reply_to
                : message.reply_to?.client_id
            );

          const repliedToDeleted =
            (
              replyToId != null &&
              deletedServerIds.has(
                Number(replyToId)
              )
            ) ||
            (
              replyToClientId != null &&
              deletedClientIds.has(
                String(
                  replyToClientId
                )
              )
            );

          if (!repliedToDeleted) {
            continue;
          }

          const messageClientId =
            message.client_id ??
            (
              message.id != null
                ? `server-${message.id}`
                : null
            );

          if (!messageClientId) {
            continue;
          }

          await updateLocalMessage(
            String(messageClientId),
            {
              reply_to: {
                ...(typeof message.reply_to ===
                "object"
                  ? message.reply_to
                  : {}),
                text:
                  "Deleted message",
                is_deleted: true,
              },
            }
          );
        }

        console.log(
          "🧹 [DELETE EVERYONE] CLEARING SELECTION"
        );
        
        clearSelection();
        
        console.log(
          "❎ [DELETE EVERYONE] CLOSING DELETE MODAL"
        );
        
        closeDeleteModal();
        
        console.log("");
        console.log("========================================");
        console.log("✅ [DELETE EVERYONE] COMPLETE");
        console.log("========================================");

      } catch (err) {

        console.error(
          "❌ [DELETE EVERYONE] FAILED:",
          err
        );
      }
    };

  return {
    selected,
    getSelectedMessages,
    canDeleteForEveryone,
    handleDeleteForMe,
    handleDeleteForEveryone,
  };
}