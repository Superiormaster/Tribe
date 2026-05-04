import { useEffect, useRef } from "react";
import { apiRequest } from "@/utils/api";

export const useReelView = (postId: number, onViewed?: () => void) => {
  const hasViewedRef = useRef(false);

  useEffect(() => {
    let timer: any = null;

    const el = document.getElementById(`post-${postId}`);
    if (!el || hasViewedRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasViewedRef.current) {
          // start timer (e.g. 3 seconds)
          timer = setTimeout(async () => {
            try {
              const res = await apiRequest(`api/post/${postId}/view/`, {
                method: "POST",
              });
              hasViewedRef.current = true;
              if (res?.error) return;
              onViewed?.();
            } catch (err) {
              console.error(err);
            }
          }, 3000); // ⏱️ 3 seconds
        } else {
          // user scrolled away → cancel
          if (timer) clearTimeout(timer);
        }
      },
      { threshold: 0.7 } // more strict for reels
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [postId, onViewed]);
};