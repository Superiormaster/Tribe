import {
useEffect,
useRef,
type RefObject,
} from 'react';
import { View } from 'react-native';
import { apiRequest } from '@/utils/api';
import { registerView } from '@/lib/useViewTracker';

type Props = {
postId: number;
ref: RefObject<View | null>;
onViewed?: (views: number) => void;
};

export const usePostView = ({
postId,
onViewed,
ref,
}: Props) => {
const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

useEffect(() => {
if (!ref?.current) return;

/*
 * React Native does not have IntersectionObserver.
 *
 * Visibility is therefore expected to be controlled
 * by the parent FlatList/FlashList using:
 *
 * onViewableItemsChanged
 *
 * When this post becomes >= 60% visible, call:
 *
 * startPostView()
 *
 * When it leaves the 60% visibility threshold, call:
 *
 * stopPostView()
 *
 * This hook keeps the actual 2-second view logic.
 */

return () => {
  if (timerRef.current) {
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }
};

}, [postId, ref]);

const startPostView = () => {
if (timerRef.current) {
clearTimeout(timerRef.current);
}

timerRef.current = setTimeout(async () => {
  timerRef.current = null;

  const canView = registerView(postId);

  if (!canView) return;

  try {
    await apiRequest(
      `api/post/${postId}/view/`,
      {
        method: 'POST',
      }
    );

    onViewed?.(1);
  } catch (err) {
    console.error(err);
  }
}, 2000);

};

const stopPostView = () => {
if (timerRef.current) {
clearTimeout(timerRef.current);
timerRef.current = null;
}
};

return {
startPostView,
stopPostView,
};
};