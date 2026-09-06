import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  DeviceEventEmitter,
} from "react-native";

import {
  saveCommunityDraft,
  deleteCommunityDraft,
  getCommunityDraft,
} from "@/lib/communityMessageDB";

export function useCommunityDrafts(
  communityId: number | null
) {
  const [input, setInput] =
    useState("");

  const [drafts, setDrafts] =
    useState<Record<number, any>>({});

  const draftTimeout =
    useRef<ReturnType<typeof setTimeout> | null>(
      null
    );

  useEffect(() => {
    if (!communityId) {
      return;
    }

    const loadDraft = async () => {
      try {
        const draft =
          await getCommunityDraft(
            communityId
          );

        if (draft) {
          setInput(
            draft.text || ""
          );

          setDrafts(
            (prev) => ({
              ...prev,
              [communityId]:
                draft.text || "",
            })
          );
        }
      } catch (err) {
        console.error(
          "Failed to load draft",
          err
        );
      }
    };

    loadDraft();
  }, [communityId]);

  const saveCommunityDraftLocal = (
    text: string
  ) => {
    if (communityId == null) {
      return;
    }

    const currentChatId =
      communityId;

    setDrafts(
      (prev) => ({
        ...prev,
        [currentChatId]: text,
      })
    );

    DeviceEventEmitter.emit(
      "community-draft-updated",
      {
        communityId:
          currentChatId,

        chatId:
          currentChatId,

        text,

        updated_at:
          new Date().toISOString(),
      }
    );

    if (draftTimeout.current) {
      clearTimeout(
        draftTimeout.current
      );
    }

    draftTimeout.current =
      setTimeout(
        async () => {
          try {
            if (!text.trim()) {
              await deleteCommunityDraft(
                currentChatId
              );

              return;
            }

            await saveCommunityDraft({
              communityId:
                currentChatId,

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
        },
        400
      );
  };

  const clearDraft =
    async () => {
      if (!communityId) {
        return;
      }

      if (draftTimeout.current) {
        clearTimeout(
          draftTimeout.current
        );

        draftTimeout.current =
          null;
      }

      setInput("");

      setDrafts(
        (prev) => {
          const next = {
            ...prev,
          };

          delete next[
            communityId
          ];

          return next;
        }
      );

      DeviceEventEmitter.emit(
        "community-draft-updated",
        {
          communityId,

          chatId:
            communityId,

          text: "",

          updated_at:
            new Date().toISOString(),
        }
      );

      try {
        await deleteCommunityDraft(
          communityId
        );
      } catch (err) {
        console.error(
          "Failed to delete draft",
          err
        );
      }
    };

  useEffect(() => {
    return () => {
      if (draftTimeout.current) {
        clearTimeout(
          draftTimeout.current
        );

        draftTimeout.current =
          null;
      }
    };
  }, []);

  return {
    input,
    setInput,

    drafts,

    saveCommunityDraftLocal,

    clearDraft,
  };
}