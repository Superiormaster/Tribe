'use client';

import { useCallback, useMemo } from "react";
import { apiRequest } from "@/utils/api";
import { getMessageKey } from "@/utils/chat/messageMerger";
import {
  updateCommunityMessage,
  deleteCommunityChatData,
} from "@/lib/communityMessageDB";

interface UseDeleteMessagesProps {
  communityId: number;
  messages: any[];
  setMessages: React.Dispatch<React.SetStateAction<any[]>>;
  selectedMessages: Set<string>;
  currentUser: {
    id: number;
  };
  clearSelection: () => void;
  closeDeleteModal: () => void;
  replace: (url: string) => void;
}

export function useDeleteCommunityMessages({
  communityId,
  messages,
  setMessages,
  selectedMessages,
  currentUser,
  clearSelection,
  closeDeleteModal,
  replace,
}: UseDeleteMessagesProps) {
  const getSelectedMessages = useCallback(() => {
    return messages.filter(m =>
      selectedMessages.has(getMessageKey(m))
    );
  }, [messages, selectedMessages]);
  
  const selected = useMemo(
    () => getSelectedMessages(),
    [getSelectedMessages]
  );
  
  const handleDeleteForMe = async () => {
    const selected = getSelectedMessages();
  
    try {
      await apiRequest(
        `api/chats/chats/${communityId}/messages/hide/`,
        {
          method: "POST",
          data: {
            message_ids: selected.map(
              m => Number(m.id)
            ),
          },
        }
      );
  
      for (const msg of selected) {
        const messageKey = msg.client_id ?? msg.id;

        if (messageKey == null) continue;
        
        await updateCommunityMessage(
          String(messageKey),
          currentUser.id,
          {
            hidden_for: [
              ...(msg.hidden_for || []),
              currentUser.id,
            ],
          }
        );
      }
  
      setMessages(prev =>
        prev.filter(
          m =>
            !selected.some(
              s => Number(s.id) === Number(m.id)
            )
        )
      );
  
      clearSelection();
      closeDeleteModal();
    
      const remainingMessages =
        messages.filter(
          m =>
            !selected.some(
              s =>
                getMessageKey(s) ===
                getMessageKey(m)
            )
        );

      const isLastMessage =
        remainingMessages.length === 0;
      
      setMessages(remainingMessages);
      
      clearSelection();
      closeDeleteModal();
      
      if (isLastMessage && communityId !== null) {
        await deleteCommunityChatData(
          communityId,
          currentUser.id
        );
      
        window.dispatchEvent(
          new CustomEvent("community-chat-deleted", {
            detail: { communityId: communityId},
          })
        );
      
        replace("/main/messages");
      }
  
    } catch (err) {
      console.error(err);
    }
  };
  
  const canDeleteForEveryone =
    selected.length > 0 &&
    selected.every(msg => {
      return (
        msg.sender === currentUser.id &&
        !msg.is_deleted
      );
    });
  
  const handleDeleteForEveryone = async () => {
    const selected = getSelectedMessages();

    if (
      !selected.every(
        m => m.sender === currentUser.id
      )
    ) {
      return;
    }
  
    try {
      await apiRequest(
        `api/chats/chats/${communityId}/messages/delete/`,
        {
          method: "POST",
          data: {
            message_ids: selected.map(
              m => Number(m.id)
            ),
          },
        }
      );
  
      for (const msg of selected) {
        const messageKey = msg.client_id ?? msg.id;
      
        if (messageKey == null) continue;
      
        await updateCommunityMessage(
          String(messageKey),
          currentUser.id,
          {
            is_deleted: true,
            text: "Deleted message",
            encrypted_text: "Deleted message",
            media_url: [],
            media_type: "text",
            thumbnail: [],
            duration: [],
            waveform: [],
            preview: null,
          }
        );
      }
  
      for (const message of messages) {
        const repliedToDeleted =
          selected.some(
            s =>
              Number(s.id) ===
              Number(message.reply_to)
          );
      
        if (!repliedToDeleted) continue;
      
        const messageKey = message.client_id ?? message.id;

        if (messageKey == null) continue;
  
        await updateCommunityMessage(
          String(messageKey),
          currentUser.id,
          {
            reply_to: {
              ...message.reply_to,
              text: "Deleted message",
              is_deleted: true,
            },
          }
        );
      }

      setMessages(prev =>
        prev.map(m => {
          const deleted =
            selected.some(
              s => Number(s.id) === Number(m.id)
            );
      
          const repliedToDeleted =
            selected.some(
              s =>
                Number(s.id) ===
                Number(m.reply_to)
            );
      
          if (deleted) {
            return {
              ...m,
              is_deleted: true,
              text: "Deleted message",
              encrypted_text: "Deleted message",
              media_url: [],
              media_type: "text",
              thumbnail: [],
              duration: [],
              waveform: [],
              preview: null,
            };
          }
      
          if (repliedToDeleted && m.reply_to) {
            return {
                ...m,
                reply_to: {
                    ...m.reply_to,
                    text: "Deleted message",
                    is_deleted: true,
                },
            };
          }
      
          return m;
        })
      );
  
      clearSelection();
      closeDeleteModal();
  
    } catch (err) {
      console.error(err);
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