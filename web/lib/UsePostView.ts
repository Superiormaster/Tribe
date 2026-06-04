// usePostView.ts
import { useEffect, useRef, RefObject } from "react";
import { apiRequest } from "@/utils/api";
import { registerView } from "@/lib/useViewTracker";

type Props = {
  postId: number;
  ref: RefObject<HTMLElement | null>;
  onViewed?: () => void;
};

export const usePostView = ({
  postId,
  onViewed, ref
}: Props) => {
  useEffect(() => {
    if (!ref || !ref.current) return; // ✅ SAFE GUARD

    const element = ref.current;

    if (!element) return;

    let timer: NodeJS.Timeout;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (
          entry.isIntersecting &&
          entry.intersectionRatio >= 0.6
        ) {
          // visible for 2 seconds
          timer = setTimeout(async () => {
            const canView = registerView(postId);

            if (!canView) return;

            try {

              await apiRequest(
                `api/post/${postId}/view/`,
                {
                  method: "POST",
                }
              );

              onViewed?.();
            } catch (err) {
              console.error(err);
            }
          }, 2000);
        } else {
          clearTimeout(timer);
        }
      },
      {
        threshold: [0.6],
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [postId, ref, onViewed]);
};