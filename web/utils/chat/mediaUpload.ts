// utils/chat/mediaUpload.ts

import { uploadToCloudinary } from "@/utils/cloudinary";

export async function uploadMediaFiles(
  files: any[],
  onProgress?: (
    percent: number,
    file: File
  ) => void
) {
  const uploaded = [];

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

    const url =
      await uploadToCloudinary({
        file,
        folder: "Tribe/Chat",
        onProgress: percent => {
          onProgress?.(
            percent,
            file
          );
        },
      });

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

      thumbnail: isVideo
        ? url.replace(
            "/upload/",
            "/upload/so_0,ar_4:5,c_fill,w_400,q_auto,f_auto/"
          )
        : isImage
        ? url.replace(
            "/upload/",
            "/upload/so_0,ar_4:5,c_fill,w_400,q_auto,f_auto,e_blur:500/"
          )
        : null,
    });
  }

  const media_url = uploaded.map(m => m.url);

  const thumbnail = uploaded.map(m => m.thumbnail);
  
  const media_type =
    uploaded.length > 1
      ? "gallery"
      : uploaded[0]?.type;
  
  return {
    media_url,
    media_type,
    thumbnail,
  };
}