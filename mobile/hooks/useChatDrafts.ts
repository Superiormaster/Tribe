import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  saveDraft,
  deleteDraft,
  getDraft,
} from "@/lib/messageDB";

import EventEmitter from "eventemitter3";

type ChatDraft = {
  chatId: number;
  text: string;
  updated_at: string;
};

type DraftUpdatedPayload = {
  chatId: number;
  text: string;
  updated_at?: string;
};

export const draftEmitter =
  new EventEmitter();

export const DRAFT_UPDATED_EVENT =
  "draft-updated";

export function useChatDrafts(
  chatId: number | null
) {
  const [input, setInput] =
    useState("");

  const [drafts, setDrafts] =
    useState<Record<number, any>>(
      {}
    );

  const draftTimeout =
    useRef<ReturnType<typeof setTimeout> | null>(
      null
    );

  useEffect(() => {
    if (chatId == null) return;

    let cancelled = false;

    const loadDraft =
      async () => {
        try {
          const draft =
            (await getDraft(
              chatId
            )) as
              | ChatDraft
              | undefined;

          if (
            cancelled ||
            !draft
          ) {
            return;
          }

          setInput(
            draft.text || ""
          );

          setDrafts(prev => ({
            ...prev,

            [chatId]:
              draft.text || "",
          }));
        } catch (err) {
          console.error(
            "Failed to load draft",
            err
          );
        }
      };

    loadDraft();

    return () => {
      cancelled = true;
    };
  }, [chatId]);

  useEffect(() => {
    return () => {
      if (
        draftTimeout.current
      ) {
        clearTimeout(
          draftTimeout.current
        );

        draftTimeout.current =
          null;
      }
    };
  }, []);

  const saveDraftLocal = (
    text: string
  ) => {
    if (chatId == null) return;

    const currentChatId =
      chatId;

    const updatedAt =
      new Date().toISOString();

    setDrafts(prev => ({
      ...prev,

      [currentChatId]: text,
    }));

    /*
     * React Native equivalent of:
     *
     * window.dispatchEvent(
     *   new CustomEvent(...)
     * )
     */
    const payload: DraftUpdatedPayload =
      {
        chatId:
          currentChatId,

        text,

        updated_at:
          updatedAt,
      };

    draftEmitter.emit(
      DRAFT_UPDATED_EVENT,
      payload
    );

    if (
      draftTimeout.current
    ) {
      clearTimeout(
        draftTimeout.current
      );
    }

    draftTimeout.current =
      setTimeout(
        async () => {
          try {
            if (!text.trim()) {
              await deleteDraft(
                currentChatId
              );

              return;
            }

            await saveDraft({
              chatId:
                currentChatId,

              text,

              updated_at:
                updatedAt,
            });
          } catch (err) {
            console.error(
              "Failed to save draft",
              err
            );
          }
        },
        400
      );
  };

  const clearDraft =
    async () => {
      if (chatId == null) {
        return;
      }

      setInput("");

      setDrafts(prev => {
        const next = {
          ...prev,
        };

        delete next[chatId];

        return next;
      });

      draftEmitter.emit(
        DRAFT_UPDATED_EVENT,
        {
          chatId,

          text: "",

          updated_at:
            new Date().toISOString(),
        }
      );

      if (
        draftTimeout.current
      ) {
        clearTimeout(
          draftTimeout.current
        );

        draftTimeout.current =
          null;
      }

      try {
        await deleteDraft(
          chatId
        );
      } catch (err) {
        console.error(
          "Failed to delete draft",
          err
        );
      }
    };

  return {
    input,

    setInput,

    drafts,

    saveDraftLocal,

    clearDraft,
  };
}