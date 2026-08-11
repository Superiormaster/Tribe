'use client';

import { useEffect, useRef, useState } from "react";
import {
  saveAutoPostDraft,
  saveManualPostDraft,
  getPostDraft,
  getAllPostDrafts,
} from "@/lib/messageDB";

type ExistingVideo = {
  url: string;
  thumbnail?: string;
};

interface UsePostDraftProps {
  isEdit: boolean;
  draftId: string | null;

  content: string;
  imageFiles: (File | string)[];
  imageUrls: string[];
  video: File | ExistingVideo | null;

  selectedCommunity: number | null;
  communityData: any;
  isOnline: boolean;

  setContent: (value: string) => void;
  setImageFiles: (value: (File | string)[]) => void;
  setImageUrls: (value: string[]) => void;
  setVideo: (
    value: File | ExistingVideo | null
  ) => void;
  setVideoPreview: (value: string) => void;
  setSelectedCommunity: (
    value: number | null
  ) => void;
}

export function usePostDraft({
  isEdit,
  draftId,

  content,
  imageFiles,
  imageUrls,
  video,
  isOnline,

  selectedCommunity,
  communityData,

  setContent,
  setImageFiles,
  setImageUrls,
  setVideo,
  setVideoPreview,
  setSelectedCommunity,
}: UsePostDraftProps) {
  const [draftCount, setDraftCount] =
    useState(0);
  const skipNextAutoSave = useRef(false);
  const previousOnlineRef = useRef(isOnline);
  const manualDraftSaving = useRef(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveVersionRef = useRef(0);

  useEffect(() => {
    const loadCount = async () => {
      const drafts =
        await getAllPostDrafts();

      setDraftCount(drafts.length);
    };

    loadCount();
  }, []);

  useEffect(() => {
    const wasOnline = previousOnlineRef.current;
  
    previousOnlineRef.current = isOnline;
  
    if (!wasOnline || isOnline) {
      return;
    }
  
    if (isEdit || draftId) {
      return;
    }
  
    if (
      skipNextAutoSave.current ||
      manualDraftSaving.current
    ) {
      return;
    }
  
    if (
      !content.trim() &&
      imageFiles.length === 0 &&
      imageUrls.length === 0 &&
      !video
    ) {
      return;
    }
  
    const saveOfflineDraft = async () => {
      try {
        const version =
          ++saveVersionRef.current;
  
        await saveAutoPostDraft({
          draftId: selectedCommunity
            ? `auto-community-${selectedCommunity}`
            : "auto-global",
  
          title: selectedCommunity
            ? `${communityData?.tribe?.name} • ${communityData?.name}`
            : "Global Post",
  
          content,
          imageFiles,
          imageUrls,
  
          video: video
            ? video instanceof File
              ? video
              : {
                  url: video.url,
                  thumbnail: video.thumbnail,
                }
            : null,
  
          selectedCommunity,
  
          communityName:
            communityData?.name || "",
        });
  
        if (
          version !==
          saveVersionRef.current
        ) {
          return;
        }
  
        console.log(
          "Post automatically saved because connection was lost."
        );
  
      } catch (error) {
        console.error(
          "Failed to auto-save offline post:",
          error
        );
      }
    };
  
    saveOfflineDraft();
  
  }, [
    isOnline,
    isEdit,
    draftId,
    content,
    imageFiles,
    imageUrls,
    video,
    selectedCommunity,
    communityData,
  ]);
  
  useEffect(() => {
    if (isEdit || draftId) {
      return;
    }
  
    if (isOnline) {
      return;
    }
  
    if (
      skipNextAutoSave.current ||
      manualDraftSaving.current
    ) {
      return;
    }
  
    if (
      !content.trim() &&
      imageFiles.length === 0 &&
      imageUrls.length === 0 &&
      !video
    ) {
      return;
    }
  
    if (autoSaveTimerRef.current) {
      clearTimeout(
        autoSaveTimerRef.current
      );
    }
  
    autoSaveTimerRef.current =
      setTimeout(async () => {
  
        if (isOnline) {
          return;
        }
  
        if (
          skipNextAutoSave.current ||
          manualDraftSaving.current
        ) {
          return;
        }
  
        try {
          const version =
            ++saveVersionRef.current;
  
          await saveAutoPostDraft({
            draftId: selectedCommunity
              ? `auto-community-${selectedCommunity}`
              : "auto-global",
  
            title: selectedCommunity
              ? `${communityData?.tribe?.name} • ${communityData?.name}`
              : "Global Post",
  
            content,
            imageFiles,
            imageUrls,
  
            video: video
              ? video instanceof File
                ? video
                : {
                    url: video.url,
                    thumbnail: video.thumbnail,
                  }
              : null,
  
            selectedCommunity,
  
            communityName:
              communityData?.name || "",
          });
  
          if (
            version !==
            saveVersionRef.current
          ) {
            return;
          }
  
        } catch (error) {
          console.error(
            "Auto-save failed:",
            error
          );
        }
  
      }, 1000);
  
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(
          autoSaveTimerRef.current
        );
  
        autoSaveTimerRef.current =
          null;
      }
    };
  
  }, [
    isOnline,
    isEdit,
    draftId,
    content,
    imageFiles,
    imageUrls,
    video,
    selectedCommunity,
    communityData,
  ]);
  
  const prepareForManualDraft = () => {
    saveVersionRef.current++;
  
    skipNextAutoSave.current = true;
  
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
  };
  
  const finishManualDraftSave = () => {
    manualDraftSaving.current = false;
    skipNextAutoSave.current = false;
  };

  // Restore draft
  useEffect(() => {
    if (isEdit) return;

    const loadDraft = async () => {
      const id =
        draftId ??
        (selectedCommunity
          ? `auto-community-${selectedCommunity}`
          : "auto-global");

      const draft =
        await getPostDraft(id);

      if (!draft) return;

      setContent(
        draft.content || ""
      );

      setImageFiles(
        draft.imageFiles || []
      );

      setImageUrls(
        draft.imageUrls || []
      );

      if (draft.video) {
        setVideo(draft.video);

        if (
          draft.video instanceof File
        ) {
          setVideoPreview(
            URL.createObjectURL(
              draft.video
            )
          );
        } else {
          setVideoPreview(
            draft.video.url
          );
        }
      }

      setSelectedCommunity(
        draft.selectedCommunity ||
          null
      );
    };

    loadDraft();
  }, [
    draftId,
    isEdit,
  ]);

  const saveDraft = 
    async (): Promise<boolean> => {
  
      if (manualDraftSaving.current) {
        return;
      }

      manualDraftSaving.current = true;
      skipNextAutoSave.current = true;
  
      try {
        await saveManualPostDraft({
          title: selectedCommunity
            ? `${communityData?.tribe?.name} • ${communityData?.name}`
            : "Global Post",
  
          communityName:
            communityData?.name || "",
  
          content,
          imageFiles,
          imageUrls,
  
          video: video
            ? video instanceof File
              ? video
              : {
                  url: video.url,
                  thumbnail:
                    video.thumbnail,
                }
            : null,
  
          selectedCommunity,
        });
  
        const drafts =
          await getAllPostDrafts();
  
        setDraftCount(
          drafts.length
        );

        return true;
      } catch (error) {
        console.error("saveDraft failed:", error);
        throw error;
        console.error("saveDraft failed:", error);
        throw error;
      } finally {
        finishManualDraftSave();
      }
    };

  const saveAutoDraft = async () => {
    const version = ++saveVersionRef.current;

    await saveAutoPostDraft({
      draftId: selectedCommunity
        ? `auto-community-${selectedCommunity}`
        : "auto-global",
  
      title: selectedCommunity
        ? `${communityData?.tribe?.name} • ${communityData?.name}`
        : "Global Post",
  
      content,
      imageFiles,
      imageUrls,
  
      video: video
        ? video instanceof File
          ? video
          : {
              url: video.url,
              thumbnail: video.thumbnail,
            }
        : null,
  
      selectedCommunity,
  
      communityName: communityData?.name || "",
    });
  
    if (version !== saveVersionRef.current) {
      return;
    }
  };

  return {
    draftCount,
    saveDraft,
    setDraftCount,
    saveAutoDraft,
    prepareForManualDraft,
    finishManualDraftSave,
  };
}