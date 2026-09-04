import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Animated,
  Easing,
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
}: LoadingScreenProps) {
  const [text, setText] = useState("");

  const fullText = "Tribe ";

  const scale = useRef(
    new Animated.Value(0.7)
  ).current;

  const opacity = useRef(
    new Animated.Value(0)
  ).current;

  const progress = useRef(
    new Animated.Value(0)
  ).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),

      Animated.timing(scale, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),

      Animated.loop(
        Animated.timing(progress, {
          toValue: 1,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: false,
        })
      ),
    ]).start();
  }, []);

  useEffect(() => {
    let index = 0;

    const interval = setInterval(() => {
      setText(
        fullText.substring(
          0,
          index + 1
        )
      );

      index++;

      if (index > fullText.length) {
        clearInterval(interval);

        setTimeout(() => {
          if (refreshOnComplete) {
            setTimeout(() => {
              refreshHome();
            }, 200);
          }

          onComplete?.();
        }, 1000);
      }
    }, 150);

    return () => {
      clearInterval(interval);
    };
  }, [
    onComplete,
    refreshOnComplete,
  ]);

  const width =
    progress.interpolate({
      inputRange: [0, 1],
      outputRange: ["0%", "100%"],
    });

  return (
    <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-950">

      {/* Logo */}
      <Animated.View
        style={{
          opacity,
          transform: [{ scale }],
        }}
      >
        <View className="h-[72px] w-[72px] overflow-hidden rounded-full border border-indigo-600">
          <Image
            source={tribe}
            resizeMode="cover"
            className="h-full w-full"
          />
        </View>
      </Animated.View>

      {/* Title */}
      <Text className="mt-[30px] text-[34px] font-bold text-gray-900 dark:text-gray-100">
        {text}
        <Text className="text-blue-500">
          |
        </Text>
      </Text>

      {/* Progress Track */}
      <View className="mt-6 h-[3px] w-[200px] overflow-hidden rounded-full bg-gray-300 dark:bg-gray-700">
        <Animated.View
          className="h-full bg-blue-500"
          style={{
            width,
          }}
        />
      </View>

    </View>
  );
}