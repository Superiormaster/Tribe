import {
  useCallback,
  useRef,
  useState,
} from "react";

import type {
  FlatList,
  ViewToken,
} from "react-native";

export function useFeedViewability() {
  const [visibleItems, setVisibleItems] =
    useState<Set<string>>(
      new Set(),
    );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 20,
    minimumViewTime: 100,
  }).current;

  const onViewableItemsChanged =
    useRef(
      ({
        viewableItems,
      }: {
        viewableItems: ViewToken[];
        changed: ViewToken[];
      }) => {
        const next = new Set<string>();

        for (const item of viewableItems) {
          if (!item.isViewable) {
            continue;
          }

          const key =
            item.key ??
            String(item.index);

          if (key) {
            next.add(key);
          }
        }

        setVisibleItems(next);
      },
    ).current;

  const isItemVisible = useCallback(
    (id: string | number) => {
      return visibleItems.has(
        String(id),
      );
    },
    [visibleItems],
  );

  return {
    viewabilityConfig,
    onViewableItemsChanged,
    isItemVisible,
    visibleItems,
  };
}