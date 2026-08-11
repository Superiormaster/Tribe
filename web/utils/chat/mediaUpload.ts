// utils/chat/mediaUpload.ts

import { uploadMediaResumable } from "@/utils/mediaUpload/uploadMediaResumable";
import type { MessageType } from "@/utils/chat/messageContract";

export async function uploadMediaFiles(
  files: any[],
  onProgress?: (
    percent: number,
    file: File
  ) => void
) {
  const uploaded: {
    url: string;
    type: "video" | "audio" | "image";
    thumbnail: string | null;
  }[] = [];

  for (const item of files || []) {
    const file =
      item instanceof File
        ? item
        : new File(
            [item.blob],
            item.name,
            {
              type: item.type,
            }
          );

    const response =
      await uploadMediaResumable({
        file,
        onProgress: (percent) => {
          onProgress?.(
            percent,
            file
          );
        },
      });

    if (!response?.original_url) {
      throw new Error(
        "Media upload completed but no original URL was returned."
      );
    }

    const url = response.original_url;

    const isVideo =
      file.type.startsWith("video/");

    const isImage =
      file.type.startsWith("image/");

    const isAudio =
      file.type.startsWith("audio/");

    uploaded.push({
      url,

      type: isVideo
        ? "video"
        : isAudio
        ? "audio"
        : "image",

      thumbnail:
        response.thumbnail_url ??
        (
          isVideo
            ? url.replace(
                "/upload/",
                "/upload/so_0,ar_4:5,c_fill,w_400,q_auto,f_auto/"
              )
            : isImage
            ? url.replace(
                "/upload/",
                "/upload/so_0,ar_4:5,c_fill,w_400,q_auto,f_auto,e_blur:500/"
              )
            : null
        ),
    });
  }

  const media_url =
    uploaded.map(
      (m) => m.url
    );

  const thumbnail =
    uploaded.map(
      (m) => m.thumbnail
    );

  const media_type: MessageType =
    uploaded.length > 1
      ? "gallery"
      : (uploaded[0]?.type as MessageType);

  return {
    media_type,
    media_url,
    thumbnail,
  };
}