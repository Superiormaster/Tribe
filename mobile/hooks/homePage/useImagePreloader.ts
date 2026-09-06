import { useEffect, useRef } from "react";
import { Image } from "expo-image";

interface MediaFile {
  thumbnail_url?: string;
  file_url?: string;
}

interface UseImagePreloaderProps {
  posts: any[];
  reels: any[];
}

export default function useImagePreloader({
  posts,
  reels,
}: UseImagePreloaderProps) {
  const preloaded =
    useRef<Set<string>>(new Set());

  /**
   * Preload reel thumbnails.
   */
  useEffect(() => {
    let cancelled = false;

    const preloadReelThumbnails =
      async () => {
        const urls =
          reels
            .slice(0, 3)
            .map(
              (reel) =>
                reel.media_files?.[0]
                  ?.thumbnail_url
            )
            .filter(
              (url): url is string =>
                Boolean(url)
            );

        await Promise.all(
          urls.map(
            async (url) => {
              if (
                cancelled ||
                preloaded.current.has(
                  url
                )
              ) {
                return;
              }

              preloaded.current.add(
                url
              );

              try {
                await Image.prefetch(
                  url,
                  "memory-disk"
                );
              } catch (err) {
                console.warn(
                  "Failed to preload reel thumbnail:",
                  url,
                  err
                );

                /**
                 * Remove it so a later render can
                 * try again.
                 */
                preloaded.current.delete(
                  url
                );
              }
            }
          )
        );
      };

    void preloadReelThumbnails();

    return () => {
      cancelled = true;
    };
  }, [reels]);

  /**
   * Preload avatars + post media.
   */
  useEffect(() => {
    let cancelled = false;

    const preloadPosts =
      async () => {
        const urls =
          new Set<string>();

        posts
          .slice(0, 10)
          .forEach(
            (post) => {
              /**
               * Avatar
               */
              const avatar =
                post.user?.avatar;

              if (avatar) {
                urls.add(
                  avatar
                );
              }

              /**
               * Post media
               */
              post.media_files?.forEach(
                (
                  file: MediaFile
                ) => {
                  const url =
                    file.thumbnail_url ??
                    file.file_url;

                  if (url) {
                    urls.add(
                      url
                    );
                  }
                }
              );
            }
          );

        await Promise.all(
          Array.from(
            urls
          ).map(
            async (url) => {
              if (
                cancelled ||
                preloaded.current.has(
                  url
                )
              ) {
                return;
              }

              preloaded.current.add(
                url
              );

              try {
                await Image.prefetch(
                  url,
                  "memory-disk"
                );
              } catch (err) {
                console.warn(
                  "Failed to preload image:",
                  url,
                  err
                );

                preloaded.current.delete(
                  url
                );
              }
            }
          )
        );
      };

    void preloadPosts();

    return () => {
      cancelled = true;
    };
  }, [posts]);

  return {
    preloaded,
  };
}