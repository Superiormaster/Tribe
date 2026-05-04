// usePostView.ts
import { useEffect, useRef } from "react";
import { apiRequest } from "@/utils/api";

export const usePostView = (postId: number, onViewed?: () => void) => {
  const hasViewedRef = useRef(false);
  useEffect(() => {
    const el = document.getElementById(`post-${postId}`);
    if (!el || hasViewedRef.current) return;

    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (entry.isIntersecting && !hasViewedRef.current) {
          hasViewedRef.current = true;

          try {
            const res = await apiRequest(`api/post/${postId}/view/`, {
              method: "POST",
            });
            if (res?.error) return;
            onViewed?.();
          } catch (err) {
            console.error(err);
          }

          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);

    return () => observer.disconnect();
  }, [postId, onViewed]);
};