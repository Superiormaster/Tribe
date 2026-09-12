import React from "react";
import {
  Image,
  Pressable,
  Text,
  View,
} from "react-native";
import { Play } from "lucide-react-native";

import { useNavigation } from "@/utils/useNavigation";

function ReelCard({
  post,
  context = "feed",
  showEntertainment = false,
  isPending = false,
  isVisible = false,
}: any) {
  const { push } = useNavigation();
  const isSearch = context === "search";

  const goToReel = () => {
    if (isPending) {
      console.log(
        "⏳ This reel is pending approval."
      );
      return;
    }

    push(`/main/reels/${post.id}`);
  };

  const poster =
    post.media_files?.find(
      (m: any) => m.thumbnail_url
    )?.thumbnail_url ||
    post.media_files?.[0]?.thumbnail_url ||
    "";

  return (
    <View className="mt-5 w-full space-y-2">
      {/* FEED LABEL ONLY */}
      {showEntertainment && (
        <Text className="px-1 text-lg font-bold text-gray-700 dark:text-gray-300">
          🎬 Entertainment
        </Text>
      )}

      <View className="relative h-[500px] w-full overflow-hidden rounded-xl bg-black">
        {/* POSTER */}
        {poster ? (
          <Image
            source={{ uri: poster }}
            className="h-full w-full"
            resizeMode="cover"
          />
        ) : (
          <View className="h-full w-full bg-black" />
        )}

        {/* PLAY BUTTON */}
        <Pressable
          onPress={goToReel}
          accessibilityRole="button"
          accessibilityLabel="Play reel"
          className="absolute inset-0 items-center justify-center"
        >
          <View className="h-16 w-16 items-center justify-center rounded-full bg-black/50 shadow-xl">
            <Play
              size={24}
              color="#ffffff"
              fill="#ffffff"
              strokeWidth={2.5}
            />
          </View>
        </Pressable>

        {/* CAPTION */}
        {post.caption && (
          <View className="absolute bottom-3 left-3 right-3">
            <Text
              numberOfLines={2}
              className="text-sm font-medium text-white"
            >
              {post.caption}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default React.memo(ReelCard);