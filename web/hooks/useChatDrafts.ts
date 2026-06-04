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
  const [drafts, setDrafts] = useState<
    Record<number, string>
  >({});

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

        if (draft?.text) {
          setInput(draft.text);

          setDrafts(prev => ({
            ...prev,
            [chatId]: draft.text,
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
  const saveDraftLocal = (
    text: string
  ) => {
    if (!chatId) return;

    setDrafts(prev => ({
      ...prev,
      [chatId]: text,
    }));

    if (draftTimeout.current) {
      clearTimeout(draftTimeout.current);
    }

    draftTimeout.current = setTimeout(
      async () => {
        try {
          if (!text.trim()) {
            await deleteDraft(chatId);
            return;
          }

          await saveDraft(chatId, text);
        } catch (err) {
          console.error(
            'Failed to save draft',
            err
          );
        }
      },
      400
    );
  };

  // =========================
  // CLEAR DRAFT
  // =========================
  const clearDraft = async () => {
    if (!chatId) return;

    setInput('');

    setDrafts(prev => ({
      ...prev,
      [chatId]: '',
    }));

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