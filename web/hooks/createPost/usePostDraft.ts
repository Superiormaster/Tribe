'use client';

import { useEffect, useState } from "react";
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

  useEffect(() => {
    const loadCount = async () => {
      const drafts =
        await getAllPostDrafts();

      setDraftCount(drafts.length);
    };

    loadCount();
  }, []);

  // Auto save
  useEffect(() => {
    if (isEdit || draftId) return;

    const timer = setTimeout(async () => {
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
                thumbnail:
                  video.thumbnail,
              }
          : null,

        selectedCommunity,

        communityName:
          communityData?.name || "",
      });
    }, 1000);

    return () =>
      clearTimeout(timer);
  }, [
    isEdit,
    draftId,
    content,
    imageFiles,
    imageUrls,
    video,
    selectedCommunity,
    communityData,
  ]);

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
    async () => {
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
    };

  const saveAutoDraft = async () => {
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
  };

  return {
    draftCount,
    saveDraft,
    setDraftCount,
    saveAutoDraft,
  };
}