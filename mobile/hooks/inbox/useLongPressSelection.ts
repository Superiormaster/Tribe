import { useRef } from 'react';
import type {
GestureResponderEvent,
} from 'react-native';

interface Options<T> {
onLongPress: (item: T) => void;
onClick: (item: T) => void;
delay?: number;
}

export function useLongPressSelection<T>({
onLongPress,
onClick,
delay = 500,
}: Options<T>) {
const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

const touchStartX = useRef(0);
const touchStartY = useRef(0);

const moved = useRef(false);
const didLongPress = useRef(false);

const bind = (item: T) => ({
onPressIn: (e: GestureResponderEvent) => {
didLongPress.current = false;
moved.current = false;

  touchStartX.current =
    e.nativeEvent.pageX;

  touchStartY.current =
    e.nativeEvent.pageY;

  timer.current = setTimeout(() => {
    if (!moved.current) {
      didLongPress.current = true;
      onLongPress(item);
    }
  }, delay);
},

onPressMove: (e: GestureResponderEvent) => {
  const dx = Math.abs(
    e.nativeEvent.pageX -
      touchStartX.current
  );

  const dy = Math.abs(
    e.nativeEvent.pageY -
      touchStartY.current
  );

  if (dx > 5 || dy > 5) {
    moved.current = true;

    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }
},

onPressOut: () => {
  if (timer.current) {
    clearTimeout(timer.current);
    timer.current = null;
  }

  if (didLongPress.current) {
    setTimeout(() => {
      didLongPress.current = false;
    }, 100);

    return;
  }

  onClick(item);
},

onResponderTerminate: () => {
  if (timer.current) {
    clearTimeout(timer.current);
    timer.current = null;
  }
},

onResponderTerminationRequest: () => true,

});

return { bind };
}