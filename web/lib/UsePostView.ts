'use client';

import {
  useEffect,
  useRef,
  RefObject,
} from "react";

import { apiRequest } from "@/utils/api";
import { registerView } from "@/lib/useViewTracker";

type Props = {
  postId: number | null;
  ref: RefObject<HTMLElement | null>;
  onViewed?: (views: number) => void;
  enabled?: boolean;
};

export const usePostView = ({
  postId,
  onViewed,
  ref,
  enabled = true,
}: Props) => {

  useEffect(() => {

    if (!enabled || !postId) {
      return;
    }

    if (!ref || !ref.current) {
      return;
    }

    const element = ref.current;

    if (!element) {
      return;
    }

    let timer:
      ReturnType<typeof setTimeout> | null =
      null;

    const observer =
      new IntersectionObserver(
        ([entry]) => {

          if (
            entry.isIntersecting &&
            entry.intersectionRatio >= 0.6
          ) {

            // visible for 2 seconds
            timer = setTimeout(
              async () => {

                const canView =
                  registerView(postId);

                if (!canView) {
                  return;
                }

                try {

                  await apiRequest(
                    `api/post/${postId}/view/`,
                    {
                      method: "POST",
                    }
                  );

                  onViewed?.(1);

                } catch (err) {

                  console.error(err);

                }

              },
              2000
            );

          } else {

            if (timer) {
              clearTimeout(timer);
              timer = null;
            }

          }

        },
        {
          threshold: [0.6],
        }
      );

    observer.observe(element);

    return () => {

      observer.disconnect();

      if (timer) {
        clearTimeout(timer);
      }

    };

  }, [
    enabled,
    postId,
    ref,
    onViewed,
  ]);
};