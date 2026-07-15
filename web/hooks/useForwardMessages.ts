'use client';

import { useState, useRef } from 'react';
import { apiRequest } from '@/utils/api';
import { getConnectedUsers } from '@/lib/api';
import { useNavigation } from "@/utils/useNavigation"
import { saveMessage } from '@/lib/messageDB';
import { useNetwork } from "@/components/networkConnection/NetworkContext";
import { sendChatMessage } from "@/utils/chat/sendChatMessage";
import type { MediaSource } from "@/utils/chat/messageContract";

type Props = {
  socketRef: any;
  chatUser?: any;
  currentUser: any;
  setMessages: any;
  clearSelection?: () => void;
};

export function useForwardMessages({
  socketRef,
  chatUser,
  currentUser,
  setMessages,
  clearSelection,
}: Props) {
  const { canCommunicate } = useNetwork();
  const { push } = useNavigation()
  const [forwardMode, setForwardMode] = useState(false);
  const [forwardCaption, setForwardCaption] =
    useState("");

  const [selectedForwardUsers, setSelectedForwardUsers] =
    useState<Set<number>>(new Set());

  const [connectedUsers, setConnectedUsers] =
    useState<any[]>([]);

  const [forwardMessages, setForwardMessages] =
    useState<any[]>([]);

  const fetchConnectedUsers = async () => {
    try {
      const res = await getConnectedUsers();
      setConnectedUsers(res.results || []);
    } catch (err) {
      console.error('Failed to load users', err);
    }
  };

  const openForward = async (messages: any[]) => {
    try {
      setForwardMessages(messages);

      await fetchConnectedUsers();

      setForwardMode(true);
    } catch (err) {
      console.error('Forward open failed', err);
    }
  };

  const closeForward = () => {
    setForwardMode(false);
    setSelectedForwardUsers(new Set());
    setForwardMessages([]);
    setForwardCaption("");
  };

  const createForwardPayload = (
    msg: any,
    chatId: number,
    forwardCaption: string,
    currentUser: any
  ) => {
    const canUseCaption =
      msg.media_type === "image" ||
      msg.media_type === "video" ||
      msg.media_type === "gallery";
  
    const originalCaption =
      msg.caption ??
      msg.text ??
      "";
  
    const newCaption =
      forwardCaption?.trim();
  
    return {
      client_id: crypto.randomUUID(),
    
      sender: currentUser?.id,
    
      chat: chatId,
    
      caption:
        canUseCaption
          ? (
              newCaption ||
              originalCaption
            )
          : originalCaption,
    
      encrypted_text:
        canUseCaption
          ? (
              newCaption ||
              originalCaption
            )
          : (
              msg.encrypted_text ??
              msg.text ??
              ""
            ),
    
      media_url: msg.media_url ?? [],
      media_type: msg.media_type ?? "text",
      thumbnail: msg.thumbnail ?? [],
    
      media_source: "forward" as MediaSource,
    
      reply_to: null,
    
      files: [],
    };
  };

  const sendForward = async () => {
    const messagesToForward = [...forwardMessages];
    const caption = forwardCaption;
  
    if (
      forwardMessages.length === 0 ||
      selectedForwardUsers.size === 0
    ) {
      return;
    }
  
    try {
      // SINGLE USER
      if (selectedForwardUsers.size === 1) {
        const userId = [...selectedForwardUsers][0];
  
        const chat = await apiRequest(
          "api/chats/get-or-create/",
          {
            method: "POST",
            data: {
              user_id: userId,
            },
          }
        );
  
        closeForward();
        clearSelection?.();
  
        push(`/main/messages/chat/${chat.chat_id}`);
  
        for (const msg of messagesToForward) {
          const payload =
            createForwardPayload(
              msg,
              chat.chat_id,
              caption,
              currentUser
            );
        
          await sendChatMessage({
            message: payload,
            currentUser,
            socketRef,
            setMessages,
            canCommunicate,
          });
        }
  
        return;
      }
  
      // MULTIPLE USERS
      for (const userId of selectedForwardUsers) {
        const chat = await apiRequest(
          "api/chats/get-or-create/",
          {
            method: "POST",
            data: {
              user_id: userId,
            },
          }
        );
      
        for (const msg of messagesToForward) {
          const payload =
            createForwardPayload(
              msg,
              chat.chat_id,
              caption,
              currentUser
            );
      
          await sendChatMessage({
            message: payload,
            currentUser,
            socketRef,
            setMessages,
            canCommunicate,
          });
        }
      }
  
      closeForward();
      clearSelection?.();
  
      push("/main/messages");
  
    } catch (err) {
      console.error(err);
    }
  };
  
  const filteredUsers = Array.isArray(
    connectedUsers
  )
    ? connectedUsers.filter(
        u => u.id !== chatUser?.id
      )
    : [];

  return {
    forwardMode,
    selectedForwardUsers,
    setSelectedForwardUsers,

    forwardMessages,
    forwardCaption,
    setForwardCaption,

    users: filteredUsers,

    openForward,
    closeForward,
    sendForward,
  };
}