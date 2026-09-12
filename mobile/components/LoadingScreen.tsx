import {
  useState,
  useEffect,
} from "react";

import {
  Image,
  Text,
  View,
} from "react-native";

import { tribe } from "@/assets";

import { refreshHome } from "@/lib/authEvents";

interface LoadingScreenProps {
  onComplete?: () => void;
  forceHomeOnComplete?: boolean;
  refreshOnComplete?: boolean;
}

export default function LoadingScreen({
  onComplete,
  refreshOnComplete,
  forceHomeOnComplete,
}: LoadingScreenProps) {
  const [text, setText] =
    useState("");

  const fullText = "Tribe ";

  useEffect(() => {
    let index = 0;

    const interval =
      setInterval(() => {
        setText(
          fullText.substring(
            0,
            index + 1,
          ),
        );

        index++;

        if (
          index >
          fullText.length
        ) {
          clearInterval(interval);

          setTimeout(() => {
            if (
              refreshOnComplete
            ) {
              setTimeout(() => {
                refreshHome();
              }, 200);
            }

            onComplete?.();
          }, 1000);
        }
      }, 150);

    return () =>
      clearInterval(interval);
  }, [
    onComplete,
    refreshOnComplete,
  ]);

  return (
    <View className="absolute inset-0 z-50 flex-1 items-center justify-center bg-gray-50 dark:bg-gray-950">
      {/* TRIBE LOGO */}
      <View className="h-[72px] w-[72px] overflow-hidden rounded-full border border-gray-300 shadow dark:border-indigo-600">
        <Image
          source={tribe}
          accessibilityLabel="Tribe Logo"
          resizeMode="cover"
          className="h-full w-full"
        />
      </View>

      {/* Spacer / animation area */}
      <View className="h-28 w-28" />

      {/* TYPING TEXT */}
      <View className="mb-4 flex-row items-center">
        <Text className="font-mono text-4xl font-bold text-gray-900 dark:text-gray-100">
          {text}
        </Text>

        <Text className="ml-1 font-mono text-4xl font-bold text-gray-900 dark:text-gray-100">
          |
        </Text>
      </View>

      {/* LOADING BAR */}
      <View className="relative h-[2px] w-[200px] overflow-hidden rounded-full bg-gray-800">
        <View className="h-full w-[40%] bg-blue-500" />
      </View>
    </View>
  );
}