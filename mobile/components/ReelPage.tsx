import { useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { FlatList, View } from "react-native";

import CommentsModal from "@/components/CommentsModal";

import { useReels } from "@/reelsHook/useReels";
import { useReelPlayer } from "@/reelsHook/useReelsPlayer";
import ReelItem from "@/components/reels/ReelItem";
import NoReels from "@/components/reels/NoReels";
import ReelNetworkStatus from "@/components/reels/ReelNetworkStatus";
import ReelSkeleton from "@/components/reels/ReelSkeleton";

export default function ReelsPage() {
  const params = useLocalSearchParams<{
    id?: string | string[];
  }>();

  const reelId = Number(
    Array.isArray(params.id)
      ? params.id[0]
      : params.id
  );

  const reelsState = useReels(reelId);

  const player = useReelPlayer({
    reels: reelsState.reels,
    loadMore: reelsState.loadMore,
  });

  const openedPostId =
    reelsState.openCommentsPostId;

  if (
    reelsState.loading &&
    reelsState.reels.length === 0
  ) {
    return (
      <View className="flex-1 bg-black">
        <ReelNetworkStatus />
        <ReelSkeleton />
      </View>
    );
  }

  const videoReels = useMemo(
    () =>
      reelsState.reels.filter(
        (reel: any) =>
          reel.media_files?.some(
            (media: any) =>
              media.media_type === "video"
          )
      ),
    [reelsState.reels]
  );

  if (videoReels.length === 0) {
    return <NoReels />;
  }

  const handleCommentsCountChange = (
    count: number
  ) => {
    if (!openedPostId) return;

    reelsState.setReels((prev: any[]) =>
      prev.map((reel: any) =>
        reel.id === openedPostId
          ? {
              ...reel,
              comments_count: count,
            }
          : reel
      )
    );
  };

  const renderReel = ({
    item,
    index,
  }: {
    item: any;
    index: number;
  }) => {
    return (
      <View className="h-full w-full bg-black">
        <ReelItem
          key={item.id}
          reel={item}
          index={index}
          reels={reelsState.reels}
          player={player}
          reelsState={reelsState}
        />
      </View>
    );
  };

  return (
    <View className="flex-1 bg-black">
      <ReelNetworkStatus />

      <FlatList
        data={reelsState.reels}
        keyExtractor={(item) =>
          String(item.id)
        }
        renderItem={renderReel}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        decelerationRate="fast"
        bounces={false}
        directionalLockEnabled
        removeClippedSubviews={false}
        windowSize={3}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        className="flex-1 bg-black"
        onEndReached={() => {
          if (!reelsState.loading) {
            reelsState.loadMore();
          }
        }}
        onEndReachedThreshold={0.7}
      />

      {openedPostId && (
        <CommentsModal
          postId={openedPostId}
          onCommentsCountChange={
            handleCommentsCountChange
          }
          onClose={() =>
            reelsState.setOpenCommentsPostId(
              null
            )
          }
        />
      )}
    </View>
  );
}