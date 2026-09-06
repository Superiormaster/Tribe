import {
useEffect,
useRef,
useState,
} from "react";

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

export type NativeMediaFile = {
uri: string;
name?: string;
type?: string;
size?: number;
};

export type PostMediaFile =
| NativeMediaFile
| ExistingVideo
| string;

interface UsePostDraftProps {
isEdit: boolean;
draftId: string | null;

content: string;
imageFiles: PostMediaFile[];
imageUrls: string[];
video: PostMediaFile | null;

selectedCommunity: number | null;
communityData: any;
isOnline: boolean;

setContent: (
value: string
) => void;

setImageFiles: (
value: PostMediaFile[]
) => void;

setImageUrls: (
value: string[]
) => void;

setVideo: (
value: PostMediaFile | null
) => void;

setVideoPreview: (
value: string
) => void;

setSelectedCommunity: (
value: number | null
) => void;
}

function isNativeMediaFile(
value: PostMediaFile
): value is NativeMediaFile {
return (
typeof value === "object" &&
value !== null &&
"uri" in value
);
}

function isExistingVideo(
value: PostMediaFile
): value is ExistingVideo {
return (
typeof value === "object" &&
value !== null &&
"url" in value
);
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

const [
draftCount,
setDraftCount,
] = useState(0);

const skipNextAutoSave =
useRef(false);

const previousOnlineRef =
useRef(isOnline);

const manualDraftSaving =
useRef(false);

const autoSaveTimerRef =
useRef<
ReturnType<typeof setTimeout> | null
>(null);

const saveVersionRef =
useRef(0);

/*

* Load draft count.
  */
  useEffect(() => {

let cancelled = false;

const loadCount =
  async () => {
    try {

      const drafts =
        await getAllPostDrafts();

      if (!cancelled) {
        setDraftCount(
          drafts.length
        );
      }

    } catch (error) {

      console.error(
        "Failed to load draft count:",
        error
      );
    }
  };

loadCount();

return () => {
  cancelled = true;
};

}, []);

/*

* Save the current post immediately
* when the connection is lost.
  */
  useEffect(() => {

const wasOnline =
  previousOnlineRef.current;

previousOnlineRef.current =
  isOnline;

/*
 * Only react to an online -> offline
 * transition.
 */
if (
  !wasOnline ||
  isOnline
) {
  return;
}

if (
  isEdit ||
  draftId
) {
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

const saveOfflineDraft =
  async () => {

    try {

      const version =
        ++saveVersionRef.current;

      await saveAutoPostDraft({
        draftId:
          selectedCommunity
            ? `auto-community-${selectedCommunity}`
            : "auto-global",

        title:
          selectedCommunity
            ? `${communityData?.tribe?.name} • ${communityData?.name}`
            : "Global Post",

        content,

        imageFiles,

        imageUrls,

        video:
          video
            ? isNativeMediaFile(video)
              ? video
              : isExistingVideo(video)
                ? {
                    url:
                      video.url,

                    thumbnail:
                      video.thumbnail,
                  }
                : video
            : null,

        selectedCommunity,

        communityName:
          communityData?.name ||
          "",
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

/*

* Continue auto-saving while offline.
* 
* This is the same one-second debounce
* used by the web implementation.
  */
  useEffect(() => {

if (
  isEdit ||
  draftId
) {
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

if (
  autoSaveTimerRef.current
) {
  clearTimeout(
    autoSaveTimerRef.current
  );
}

autoSaveTimerRef.current =
  setTimeout(
    async () => {

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
          draftId:
            selectedCommunity
              ? `auto-community-${selectedCommunity}`
              : "auto-global",

          title:
            selectedCommunity
              ? `${communityData?.tribe?.name} • ${communityData?.name}`
              : "Global Post",

          content,

          imageFiles,

          imageUrls,

          video:
            video
              ? isNativeMediaFile(video)
                ? video
                : isExistingVideo(video)
                  ? {
                      url:
                        video.url,

                      thumbnail:
                        video.thumbnail,
                    }
                  : video
              : null,

          selectedCommunity,

          communityName:
            communityData?.name ||
            "",
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

    },
    1000
  );

return () => {

  if (
    autoSaveTimerRef.current
  ) {

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

/*

* Prepare the hook for a manual

* "Save Draft" operation.
  */
  const prepareForManualDraft =
  () => {
  
  saveVersionRef.current++;
  
  skipNextAutoSave.current =
  true;
  
  if (
  autoSaveTimerRef.current
  ) {
  
  clearTimeout(
  autoSaveTimerRef.current
  );
  
  autoSaveTimerRef.current =
  null;
  }
  };

const finishManualDraftSave =
() => {

  manualDraftSaving.current =
    false;

  skipNextAutoSave.current =
    false;
};

/*

* Restore a draft.
  */
  useEffect(() => {

if (isEdit) {
  return;
}

let cancelled = false;

const loadDraft =
  async () => {

    try {

      const id =
        draftId ??
        (
          selectedCommunity
            ? `auto-community-${selectedCommunity}`
            : "auto-global"
        );

      const draft =
        await getPostDraft(id);

      if (
        cancelled ||
        !draft
      ) {
        return;
      }

      setContent(
        draft.content ||
          ""
      );

      setImageFiles(
        draft.imageFiles ||
          []
      );

      setImageUrls(
        draft.imageUrls ||
          []
      );

      if (draft.video) {

        setVideo(
          draft.video
        );

        /*
         * React Native does not have
         * URL.createObjectURL().
         *
         * A native media object already
         * contains its local URI, so use
         * that URI directly.
         */
        if (
          isNativeMediaFile(
            draft.video
          )
        ) {

          setVideoPreview(
            draft.video.uri
          );

        } else if (
          isExistingVideo(
            draft.video
          )
        ) {

          setVideoPreview(
            draft.video.url
          );

        } else if (
          typeof draft.video ===
          "string"
        ) {

          setVideoPreview(
            draft.video
          );
        }
      }

      setSelectedCommunity(
        draft.selectedCommunity ??
          null
      );

    } catch (error) {

      console.error(
        "Failed to restore post draft:",
        error
      );
    }
  };

loadDraft();

return () => {
  cancelled = true;
};

}, [
draftId,
isEdit,
selectedCommunity,
setContent,
setImageFiles,
setImageUrls,
setVideo,
setVideoPreview,
setSelectedCommunity,
]);

/*

* Manually save a post draft.
  */
  const saveDraft =
  async (): Promise<boolean> => {
  
  if (
  manualDraftSaving.current
  ) {
  return false;
  }
  
  manualDraftSaving.current =
  true;
  
  skipNextAutoSave.current =
  true;
  
  try {
  
  await saveManualPostDraft({
  title:
  selectedCommunity
  ? "${communityData?.tribe?.name} • ${communityData?.name}"
  : "Global Post",
  
   communityName:
   communityData?.name ||
   "",

 content,

 imageFiles,

 imageUrls,

 video:
   video
     ? isNativeMediaFile(video)
       ? video
       : isExistingVideo(video)
         ? {
             url:
               video.url,

             thumbnail:
               video.thumbnail,
           }
         : video
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
  
  console.error(
  "saveDraft failed:",
  error
  );
  
  throw error;
  
  } finally {
  
  finishManualDraftSave();
  }
  };

/*

* Explicit automatic draft save.
  */
  const saveAutoDraft =
  async () => {
  
  const version =
  ++saveVersionRef.current;
  
  await saveAutoPostDraft({
  draftId:
  selectedCommunity
  ? "auto-community-${selectedCommunity}"
  : "auto-global",
  
  title:
  selectedCommunity
  ? "${communityData?.tribe?.name} • ${communityData?.name}"
  : "Global Post",
  
  content,
  
  imageFiles,
  
  imageUrls,
  
  video:
  video
  ? isNativeMediaFile(video)
  ? video
  : isExistingVideo(video)
  ? {
  url:
  video.url,
  
             thumbnail:
             video.thumbnail,
         }
       : video
   : null,
  
  selectedCommunity,
  
  communityName:
  communityData?.name ||
  "",
  });
  
  if (
  version !==
  saveVersionRef.current
  ) {
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