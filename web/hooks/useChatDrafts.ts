'use client';

import { useEffect, useRef, useState } from 'react';
import {
  saveDraft,
  deleteDraft,
  getDraft,
} from '@/lib/messageDB';

export function useChatDrafts(
  chatId: number | null
) {
  const [input, setInput] = useState('');
  const [drafts, setDrafts] =
    useState<Record<number, any>>({});

  const draftTimeout = useRef<NodeJS.Timeout | null>(
    null
  );

  // =========================
  // LOAD DRAFT
  // =========================
  useEffect(() => {
    if (!chatId) return;

    const loadDraft = async () => {
      try {
        const draft = await getDraft(chatId);

        if (draft) {
          setInput(draft.text || "");
        
          setDrafts(prev => ({
            ...prev,
            [chatId]: draft.text || "",
          }));
        }
      } catch (err) {
        console.error(
          'Failed to load draft',
          err
        );
      }
    };

    loadDraft();
  }, [chatId]);

  // =========================
  // SAVE DRAFT
  // =========================
  const saveDraftLocal = (text: string) => {
    if (chatId == null) return;
  
    const currentChatId = chatId;
  
    setDrafts(prev => ({
      ...prev,
      [currentChatId]: text,
    }));
  
    window.dispatchEvent(
      new CustomEvent("draft-updated", {
        detail: {
          chatId: currentChatId,
          text,
          updated_at: new Date().toISOString(),
        },
      })
    );
  
    if (draftTimeout.current) {
      clearTimeout(draftTimeout.current);
    }
  
    draftTimeout.current = setTimeout(async () => {
      try {
        if (!text.trim()) {
          await deleteDraft(currentChatId);
          return;
        }
  
        await saveDraft({
          chatId: currentChatId,
          text,
          updated_at:
            new Date().toISOString(),
        });
      } catch (err) {
        console.error(
          "Failed to save draft",
          err
        );
      }
    }, 400);
  };

  // =========================
  // CLEAR DRAFT
  // =========================
  const clearDraft = async () => {
    if (!chatId) return;
  
    setInput("");
  
    setDrafts(prev => {
      const next = { ...prev };
      delete next[chatId];
      return next;
    });
  
    window.dispatchEvent(
      new CustomEvent("draft-updated", {
        detail: {
          chatId,
          text: "",
        },
      })
    );
  
    await deleteDraft(chatId);
  };

  return {
    input,
    setInput,
    drafts,
    saveDraftLocal,
    clearDraft,
  };
}