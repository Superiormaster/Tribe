'use client';

import { useEffect, useRef, useState } from 'react';
import {
  saveCommunityDraft,
  deleteCommunityDraft,
  getCommunityDraft,
} from '@/lib/communityMessageDB';

export function useCommunityDrafts(
  communityId: number | null
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
    if (!communityId) return;

    const loadDraft = async () => {
      try {
        const draft = await getCommunityDraft(communityId);

        if (draft) {
          setInput(draft.text || "");
        
          setDrafts(prev => ({
            ...prev,
            [communityId]: draft.text || "",
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
  }, [communityId]);

  // =========================
  // SAVE DRAFT
  // =========================
  const saveCommunityDraftLocal = (text: string) => {
    if (communityId == null) return;
  
    const currentChatId = communityId;
  
    setDrafts(prev => ({
      ...prev,
      [currentChatId]: text,
    }));
  
    window.dispatchEvent(
      new CustomEvent("draft-updated", {
        detail: {
          communityId: currentChatId,
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
          await deleteCommunityDraft(currentChatId);
          return;
        }
  
        await saveCommunityDraft({
          communityId: currentChatId,
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
    if (!communityId) return;
  
    setInput("");
  
    setDrafts(prev => {
      const next = { ...prev };
      delete next[communityId];
      return next;
    });
  
    window.dispatchEvent(
      new CustomEvent("draft-updated", {
        detail: {
          communityId,
          text: "",
        },
      })
    );
  
    await deleteCommunityDraft(communityId);
  };

  return {
    input,
    setInput,
    drafts,
    saveCommunityDraftLocal,
    clearDraft,
  };
}