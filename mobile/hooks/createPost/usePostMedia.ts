import { useMemo, useState } from "react";

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

type UsePostMediaProps = {
  allowImages?: boolean;
  allowVideo?: boolean;
  maxImages?: number;
};

export function usePostMedia({
  allowImages = true,
  allowVideo = true,
  maxImages = 15,
}: UsePostMediaProps = {}) {
  const [imageFiles, setImageFiles] =
    useState<PostMediaFile[]>([]);

  const [imageUrls, setImageUrls] =
    useState<string[]>([]);

  const [video, setVideo] =
    useState<PostMediaFile | null>(null);

  const [videoPreview, setVideoPreview] =
    useState("");

  const handleImagesChange = (
    assets: NativeMediaFile[]
  ) => {
    if (!allowImages) {
      return;
    }

    if (!assets?.length) {
      return;
    }

    if (
      assets.length + imageFiles.length >
      maxImages
    ) {
      console.warn(
        `You can upload a maximum of ${maxImages} images`
      );

      return;
    }

    setImageFiles((prev) => [
      ...prev,
      ...assets,
    ]);

    setVideo(null);
    setVideoPreview("");
  };

  const handleVideoChange = (
    asset: NativeMediaFile | null
  ) => {
    if (!allowVideo) {
      return;
    }

    if (!asset) {
      return;
    }

    setVideo(asset);
    setVideoPreview(asset.uri);

    setImageFiles([]);
    setImageUrls([]);
  };

  const removeImage = (
    index: number
  ) => {
    setImageFiles((prev) =>
      prev.filter(
        (_, i) => i !== index
      )
    );
  };

  const removeVideo = () => {
    setVideo(null);
    setVideoPreview("");
  };

  const clearMedia = () => {
    setImageFiles([]);
    setImageUrls([]);

    setVideo(null);
    setVideoPreview("");
  };

  const previewImages = useMemo(
    () => [
      ...imageUrls,
      ...imageFiles,
    ],
    [
      imageUrls,
      imageFiles,
    ]
  );

  const hasImages =
    imageFiles.length > 0 ||
    imageUrls.length > 0;

  const hasVideo = !!video;

  return {
    imageFiles,
    imageUrls,

    video,
    videoPreview,

    previewImages,

    hasImages,
    hasVideo,

    setImageFiles,
    setImageUrls,

    setVideo,
    setVideoPreview,

    handleImagesChange,
    handleVideoChange,

    removeImage,
    removeVideo,

    clearMedia,
  };
}