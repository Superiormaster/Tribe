import { useEffect } from "react";
import { apiRequest } from "@/utils/api";

type ExistingVideo = {
url: string;
thumbnail?: string;
};

type NativeMediaFile = {
uri: string;
name?: string;
type?: string;
};

type MediaFile = NativeMediaFile | ExistingVideo | string;

interface Props {
isEdit: boolean;
postId: string | null;

setContent: (v: string) => void;
setSelectedCommunity: (id: number | null) => void;

setMode: (
mode: "global" | "community" | "reel"
) => void;

setVideo: (
video: MediaFile | null
) => void;

setVideoPreview: (url: string) => void;

setImageUrls: (
urls: string[]
) => void;

setImageFiles: (
files: MediaFile[]
) => void;

setUploadedMedia: (
media: any[]
) => void;
}

export function useEditPost({
isEdit,
postId,
setContent,
setSelectedCommunity,
setMode,
setVideo,
setVideoPreview,
setImageUrls,
setImageFiles,
setUploadedMedia,
}: Props) {
useEffect(() => {
if (!isEdit || !postId) return;

let cancelled = false;

async function fetchPost() {
  try {
    const data = await apiRequest(
      `api/post/${postId}/`
    );

    if (cancelled) return;

    setContent(data.caption || "");

    setSelectedCommunity(
      data.community ?? null
    );

    if (
      data.content_type ===
      "short_video"
    ) {
      setMode("reel");
    } else if (data.community) {
      setMode("community");
    } else {
      setMode("global");
    }

    const media =
      data.media_files || [];

    const images = media.filter(
      (m: any) =>
        m.media_type === "image"
    );

    const video =
      media.find(
        (m: any) =>
          m.media_type === "video"
      );

    if (images.length) {
      const urls = images.map(
        (m: any) => m.file_url
      );

      setImageUrls(urls);

      /*
       * React Native does not use browser File
       * objects. The existing server URLs can
       * still be used as media references when
       * editing an existing post.
       */
      setImageFiles(urls);

      setUploadedMedia(
        images.map((m: any) => ({
          url: m.file_url,
          thumbnail: m.file_url,
          type: "image",
        }))
      );
    }

    if (video) {
      const existingVideo: ExistingVideo = {
        url: video.file_url,
        thumbnail:
          video.thumbnail_url,
      };

      setVideo(existingVideo);

      setVideoPreview(
        existingVideo.url
      );

      setUploadedMedia([
        {
          url: existingVideo.url,
          thumbnail:
            existingVideo.thumbnail,
          type: "video",
        },
      ]);
    }
  } catch (err) {
    console.error(
      "Failed to load post",
      err
    );
  }
}

fetchPost();

return () => {
  cancelled = true;
};

}, [
isEdit,
postId,
setContent,
setSelectedCommunity,
setMode,
setVideo,
setVideoPreview,
setImageUrls,
setImageFiles,
setUploadedMedia,
]);
}