'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { uploadFile } from '@/utils/mediaUpload/uploadFile';

import {
  getCompressedVideo,
  getCompressedVideoKey,
  saveCompressedVideo,
  deleteCompressedVideo,
} from "@/utils/mediaUpload/compressedVideoStore";

import {
  compressImage,
} from '@/utils/compressImage';

import {
  useNetwork,
} from '@/components/networkConnection/NetworkContext';

import {
  UploadNetworkError,
} from '@/utils/mediaUpload/errors';

import {
  buildUploadedMedia,
  type UploadedMedia,
} from '@/utils/media';

type ExistingVideo = {
  url: string;
  thumbnail?: string;
};

export type UploadStatus =
  | 'idle'
  | 'uploading'
  | 'success'
  | 'failed'
  | 'paused';

interface UseMediaUploadProps {
  content: string;
  imageFiles: (File | string)[];
  imageUrls: string[];
  video: File | ExistingVideo | null;
  selectedCommunity: number | null;
  isReel: boolean;
  isOnline: boolean;
}

export function getFileKey(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

export function useMediaUpload({
  imageFiles,
  video,
  isOnline,
}: UseMediaUploadProps) {

  const {
    networkStatus,
    connectionType,
  } = useNetwork();

  const [uploadedMedia, setUploadedMedia] =
    useState<UploadedMedia[]>([]);

  const [uploadStatus, setUploadStatus] =
    useState<UploadStatus>('idle');

  const [uploadError, setUploadError] =
    useState<Error | null>(null);

  const [fileProgress, setFileProgress] =
    useState<Record<string, number>>({});

  const abortControllersRef =
    useRef<Set<AbortController>>(new Set());

  const uploadGenerationRef =
    useRef(0);

  const uploadPromiseRef =
    useRef<Promise<UploadedMedia[]> | null>(null);
  const uploadingRef =
    useRef(false);

  const getFilesToUpload =
    useCallback((): File[] => {

      if (video instanceof File) {
        return [video];
      }

      return imageFiles.filter(
        (item): item is File =>
          item instanceof File
      );

    }, [
      video,
      imageFiles,
    ]);
  
  const getVideoQuality =
    useCallback(() => {

      if (
        networkStatus === 'poor' ||
        networkStatus === 'slow'
      ) {
        return '720p' as const;
      }

      return '1080p' as const;

    }, [
      networkStatus,
    ]);

  const uploadSingleFile =
    useCallback(
      async (
        originalFile: File,
        generation: number,
      ): Promise<UploadedMedia> => {

        if (
          !isOnline
        ) {
          throw new UploadNetworkError(
            'Network connection unavailable.'
          );
        }

        if (
          generation !==
          uploadGenerationRef.current
        ) {
          throw new DOMException(
            'Media upload was cancelled.',
            'AbortError'
          );
        }

        const controller =
          new AbortController();

        abortControllersRef.current.add(
          controller
        );

        const originalKey =
          getFileKey(originalFile);
        let compressedVideoKey:
          string | null = null;

        try {

          let fileToUpload =
            originalFile;

          if (
            originalFile.type.startsWith(
              'image/'
            )
          ) {

            setFileProgress(
              prev => ({
                ...prev,
                [originalKey]: 0,
              })
            );

            const compressedImage =
              await compressImage(
                originalFile,
                1.5
              );

            if (
              controller.signal.aborted
            ) {
              throw new DOMException(
                'Image compression cancelled.',
                'AbortError'
              );
            }

            fileToUpload =
              compressedImage;

            setFileProgress(
              prev => ({
                ...prev,
                [originalKey]: 20,
              })
            );
          }

          if (
            originalFile.type.startsWith(
              'video/'
            )
          ) {
            
            const targetQuality =
              getVideoQuality();
  
            compressedVideoKey =
              getCompressedVideoKey(
                originalFile,
                targetQuality
              );
  
            const cached =
              await getCompressedVideo(
                compressedVideoKey
              );
  
            if (cached) {
  
              console.log(
                "🎥 Using persisted compressed video:",
                {
                  name: cached.name,
                  size:
                    (
                      cached.size /
                      1024 /
                      1024
                    ).toFixed(2) + " MB",
                  quality:
                    targetQuality,
                }
              );
  
              fileToUpload =
                cached;
  
            } else {
  
              console.log(
                "🎥 Compressing video:",
                {
                  name:
                    originalFile.name,
                  size:
                    (
                      originalFile.size /
                      1024 /
                      1024
                    ).toFixed(2) + " MB",
                  quality:
                    targetQuality,
                }
              );
  
              setFileProgress(
                prev => ({
                  ...prev,
                  [originalKey]: 0,
                })
              );
  
              const { compressVideo } =
                await import("@/utils/mediaUpload/videoCompressor");

              const compressed =
                await compressVideo({
                  file:
                    originalFile,
                  networkStatus,
                  connectionType,
                  signal:
                    controller.signal,
  
                  onProgress:
                    percent => {
  
                      setFileProgress(
                        prev => ({
                          ...prev,
  
                          [originalKey]:
                            Math.round(
                              percent / 2
                            ),
                        })
                      );
                    },
                });
  
              setFileProgress(
                prev => ({
                  ...prev,
                  [originalKey]: 50,
                })
              );
    
              await saveCompressedVideo(
                compressedVideoKey,
                compressed,
                originalFile,
                targetQuality
              );
  
              console.log(
                "💾 Compressed video persisted:",
                compressed.name
              );
    
              fileToUpload =
                compressed;
            }
          }

          const uploaded =
            await uploadFile({
              file:
                fileToUpload,

              signal:
                controller.signal,

              onProgress:
                percent => {
                  const progress =
                    originalFile.type.startsWith(
                      'image/'
                    )
                      ? 50 +
                        Math.round(
                          percent / 2
                        )
                      : 50 +
                        Math.round(
                          percent / 2
                        );

                  setFileProgress(
                    prev => ({
                      ...prev,

                      [originalKey]:
                        Math.min(
                          progress, 100
                        ),
                    })
                  );
                },
            });

          if (
            generation !==
            uploadGenerationRef.current
          ) {
            throw new DOMException(
              'Media upload was cancelled.',
              'AbortError'
            );
          }

          if (
            !uploaded?.original_url ||
            uploaded?.media_id == null
          ) {
            throw new Error(
              'Media upload completed but required media information was not returned.'
            );
          }

          setFileProgress(
            prev => ({
              ...prev,
              [originalKey]: 100,
            })
          );

          if (
            compressedVideoKey &&
            originalFile.type.startsWith(
              'video/'
            )
          ) {

            await deleteCompressedVideo(
              compressedVideoKey
            );

            console.log(
              '🗑️ Persisted compressed video deleted after successful upload.'
            );
          }

          return buildUploadedMedia(
            Array.isArray(uploaded.original_url)
              ? uploaded.original_url[0]
              : uploaded.original_url,
            String(uploaded.media_id),
            originalFile,
            uploaded.thumbnail_url
          );

        } finally {

          abortControllersRef.current.delete(
            controller
          );
        }
      },
      [
        isOnline,
        networkStatus,
        connectionType,
        getVideoQuality,
      ]
    );

  const uploadSelectedMedia =
    useCallback(
      async (
        files: File[],
      ): Promise<UploadedMedia[]> => {

        const generation =
          ++uploadGenerationRef.current;

        if (!files.length) {
          return [];
        }

        if (!isOnline) {

          setUploadStatus(
            'paused'
          );

          return [];
        }

        setUploadStatus(
          'uploading'
        );

        setUploadError(
          null
        );

        /*
         * Clear old progress for
         * this upload operation.
         */
        setFileProgress({});

        const results:
          UploadedMedia[] = [];
        uploadingRef.current =
          true;

        try {

          for (
            let index = 0;
            index < files.length;
            index++
          ) {

            const file =
              files[index];
  
            if (
              !isOnline
            ) {
              throw new UploadNetworkError(
                'Network connection lost.'
              );
            }

            if (
              generation !==
              uploadGenerationRef.current
            ) {
              throw new DOMException(
                'Media upload was cancelled.',
                'AbortError'
              );
            }

            const uploaded =
              await uploadSingleFile(
                file,
                generation
              );

            results.push(
              uploaded
            );

            setUploadedMedia(
              [...results]
            );
          }

          if (
            generation !==
            uploadGenerationRef.current
          ) {
            return [];
          }

          setUploadStatus(
            'success'
          );

          setUploadError(
            null
          );

          return results;

        } catch (error) {

          if (
            error instanceof
            UploadNetworkError ||
            (
              error instanceof Error &&
              error.name ===
                'UploadNetworkError'
            )
          ) {

            setUploadStatus(
              'paused'
            );

            setUploadError(
              null
            );

            throw error;
          }

          if (
            error instanceof DOMException &&
            error.name ===
              'AbortError'
          ) {

            setUploadStatus(
              'paused'
            );

            throw error;
          }

          const normalizedError =
            error instanceof Error
              ? error
              : new Error(
                  'Media upload failed.'
                );

          setUploadError(
            normalizedError
          );

          setUploadStatus(
            'failed'
          );

          throw normalizedError;
        }
      },
      [
        isOnline,
        uploadSingleFile,
      ]
    );

  const resumeUpload =
    useCallback(
      async (): Promise<
        UploadedMedia[]
      > => {

        const files =
          getFilesToUpload();

        if (!files.length) {
          return uploadedMedia;
        }

        if (!isOnline) {

          setUploadStatus(
            'paused'
          );

          return uploadedMedia;
        }

        uploadGenerationRef.current++;
  
        setUploadStatus(
          'uploading'
        );

        setUploadError(
          null
        );

        const promise =
          uploadSelectedMedia(
            files
          );

        uploadPromiseRef.current =
          promise;

        try {

          const media =
            await promise;

          setUploadedMedia(
            media
          );

          setUploadStatus(
            'success'
          );

          return media;

        } catch (error) {

          if (
            error instanceof
            UploadNetworkError ||
            (
              error instanceof Error &&
              error.name ===
                'UploadNetworkError'
            )
          ) {

            setUploadStatus(
              'paused'
            );

            setUploadError(
              null
            );

            throw error;
          }

          setUploadStatus(
            'failed'
          );

          setUploadError(
            error instanceof Error
              ? error
              : new Error(
                  'Media upload failed.'
                )
          );

          throw error;

        } finally {

          if (
            uploadPromiseRef.current ===
            promise
          ) {
            uploadPromiseRef.current =
              null;
          }
        }
      },
      [
        getFilesToUpload,
        isOnline,
        uploadedMedia,
        uploadSelectedMedia,
      ]
    );

  useEffect(() => {
    if (
      !(video instanceof File)
    ) {
      if (
        !imageFiles.some(
          item =>
            item instanceof File
        )
      ) {
        setUploadStatus(
          'idle'
        );
      }
    
      return;
    }
    
    const videoFile = video;

    if (!isOnline) {
      setUploadStatus(
        'paused'
      );

      setUploadError(
        null
      );

      return;
    }

    if (
      uploadingRef.current
    ) {
      return;
    }

    let cancelled =
      false;

    async function uploadVideo() {
      setUploadedMedia([]);
      setFileProgress({});
      setUploadError(null);
      setUploadStatus(
        'uploading'
      );

      let promise:
        Promise<UploadedMedia[]> |
        null = null;

      try {
        promise =
          uploadSelectedMedia(
            [videoFile]
          );

        uploadPromiseRef.current =
          promise;

        const media =
          await promise;

        if (
          cancelled
        ) {
          return;
        }

        setUploadedMedia(
          media
        );

        setUploadStatus(
          'success'
        );

      } catch (error) {
        if (
          cancelled
        ) {
          return;
        }

        if (
          error instanceof
          UploadNetworkError ||
          (
            error instanceof Error &&
            error.name ===
              'UploadNetworkError'
          )
        ) {

          setUploadStatus(
            'paused'
          );

          return;
        }

        if (
          error instanceof DOMException &&
          error.name ===
            'AbortError'
        ) {

          setUploadStatus(
            'paused'
          );

          return;
        }

        console.error(
          'Video upload failed:',
          error
        );

        setUploadedMedia([]);

        setUploadError(
          error instanceof Error
            ? error
            : new Error(
                'Video upload failed.'
              )
        );

        setUploadStatus(
          'failed'
        );

      } finally {

        if (
          promise &&
          uploadPromiseRef.current ===
            promise
        ) {
          uploadPromiseRef.current =
            null;
        }
      }
    }

    uploadVideo();

    return () => {
      cancelled = true;

      uploadGenerationRef.current++;

      abortControllersRef.current.forEach(
        controller => {
          controller.abort();
        }
      );

      abortControllersRef.current.clear();
    };
  }, [
    video,
    isOnline,
    uploadSelectedMedia,
  ]);

  useEffect(() => {
    const files =
      imageFiles.filter(
        (item): item is File =>
          item instanceof File
      );

    if (!files.length) {
      if (
        !(video instanceof File)
      ) {
        setUploadStatus(
          'idle'
        );
      }

      return;
    }

    if (!isOnline) {
      setUploadStatus(
        'paused'
      );

      setUploadError(
        null
      );

      return;
    }

    if (
      uploadingRef.current
    ) {
      return;
    }
  
    let cancelled =
      false;

    async function uploadImages() {

      setUploadedMedia([]);
      setFileProgress({});
      setUploadError(null);
      setUploadStatus(
        'uploading'
      );

      let promise:
        Promise<UploadedMedia[]> |
        null = null;

      try {

        promise =
          uploadSelectedMedia(
            files
          );

        uploadPromiseRef.current =
          promise;

        const media =
          await promise;

        if (
          cancelled
        ) {
          return;
        }

        setUploadedMedia(
          media
        );

        setUploadStatus(
          'success'
        );

      } catch (error) {

        if (
          cancelled
        ) {
          return;
        }

        if (
          error instanceof
          UploadNetworkError ||
          (
            error instanceof Error &&
            error.name ===
              'UploadNetworkError'
          )
        ) {

          setUploadStatus(
            'paused'
          );

          setUploadError(
            null
          );

          return;
        }

        if (
          error instanceof DOMException &&
          error.name ===
            'AbortError'
        ) {

          setUploadStatus(
            'paused'
          );

          return;
        }

        console.error(
          'Image upload failed:',
          error
        );

        setUploadedMedia([]);

        setUploadError(
          error instanceof Error
            ? error
            : new Error(
                'Image upload failed.'
              )
        );

        setUploadStatus(
          'failed'
        );

      } finally {

        if (
          promise &&
          uploadPromiseRef.current ===
            promise
        ) {
          uploadPromiseRef.current =
            null;
        }
      }
    }

    uploadImages();

    return () => {

      cancelled = true;

      uploadGenerationRef.current++;

      abortControllersRef.current.forEach(
        controller => {
          controller.abort();
        }
      );

      abortControllersRef.current.clear();

    };

  }, [
    imageFiles,
    isOnline,
    uploadSelectedMedia,
    video,
  ]);

  return {
    uploadedMedia,
    uploadStatus,
    uploading:
      uploadStatus ===
      'uploading',
    uploadError,
    fileProgress,
    uploadPromiseRef,
    uploadSelectedMedia,
    setUploadedMedia,
    setFileProgress,
    setUploadError,
    resumeUpload,
    setUploadStatus,
  };
}