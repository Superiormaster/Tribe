// hooks/post/usePostMedia.ts
'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';

type ExistingVideo = {
  url: string;
  thumbnail?: string;
};

type UsePostMediaProps = {
  allowImages?: boolean;
  allowVideo?: boolean;
  maxImages?: number;
};

export function usePostMedia({
  allowImages = true,
  allowVideo = true,
  maxImages = 5,
}: UsePostMediaProps = {}) {
  const [imageFiles, setImageFiles] = useState<(File | string)[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  const [video, setVideo] = useState<
    File | ExistingVideo | null
  >(null);

  const [videoPreview, setVideoPreview] = useState("");

  const handleImagesChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!allowImages) return;

    if (!e.target.files) return;

    const files = Array.from(e.target.files);

    if (files.length + imageFiles.length > maxImages) {
      toast.error(
        `You can upload a maximum of ${maxImages} images`
      );
      return;
    }

    setImageFiles(prev => [...prev, ...files]);

    // Images and video are mutually exclusive
    setVideo(null);
    setVideoPreview("");
  };

  const handleVideoChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!allowVideo) return;

    if (!e.target.files?.[0]) return;

    const file = e.target.files[0];

    const preview = URL.createObjectURL(file);

    setVideo(file);
    setVideoPreview(preview);

    // Video and images are mutually exclusive
    setImageFiles([]);
    setImageUrls([]);
  };

  const removeImage = (index: number) => {
    setImageFiles(prev =>
      prev.filter((_, i) => i !== index)
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
    () => [...imageUrls, ...imageFiles],
    [imageUrls, imageFiles]
  );

  const hasImages =
    imageFiles.length > 0 || imageUrls.length > 0;

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