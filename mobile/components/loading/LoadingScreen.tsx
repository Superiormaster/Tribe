import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Animated,
  Easing,
  Image,
  StyleSheet,
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

    return () =>
      clearInterval(interval);
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
    <View style={styles.container}>
      <Animated.View
        style={{
          opacity,
          transform: [{ scale }],
        }}
      >
        <View style={styles.logoWrapper}>
          <Image
            source={tribe}
            style={styles.logo}
            resizeMode="cover"
          />
        </View>
      </Animated.View>

      <Text style={styles.title}>
        {text}
        <Text style={styles.cursor}>
          |
        </Text>
      </Text>

      <View style={styles.track}>
        <Animated.View
          style={[
            styles.bar,
            { width },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    alignItems: "center",
  },

  logoWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#4F46E5",
  },

  logo: {
    width: "100%",
    height: "100%",
  },

  title: {
    marginTop: 30,
    fontSize: 34,
    fontWeight: "bold",
    color: "#111827",
  },

  cursor: {
    color: "#3B82F6",
  },

  track: {
    marginTop: 24,
    width: 200,
    height: 3,
    backgroundColor: "#D1D5DB",
    borderRadius: 999,
    overflow: "hidden",
  },

  bar: {
    height: "100%",
    backgroundColor: "#3B82F6",
  },
});