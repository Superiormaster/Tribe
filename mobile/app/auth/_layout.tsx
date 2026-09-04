// app/auth/_layout.tsx

import React from "react";
import { StyleSheet, View } from "react-native";
import { Stack } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

export default function AuthLayout() {
  return (
    <View style={styles.container}>
      {/* Animated/Gradient Background */}
      <LinearGradient
        colors={[
          "#F3F4F6",
          "#EEF2FF",
          "#E0E7FF",
        ]}
        start={{
          x: 0,
          y: 0,
        }}
        end={{
          x: 1,
          y: 1,
        }}
        style={StyleSheet.absoluteFill}
      />

      {/* Soft Floating Blobs */}
      <View
        style={[
          styles.blob,
          styles.blobOne,
        ]}
      />

      <View
        style={[
          styles.blob,
          styles.blobTwo,
        ]}
      />

      <View
        style={[
          styles.blob,
          styles.blobThree,
        ]}
      />

      {/* Auth Content */}
      <View style={styles.content}>
        <BlurView
          intensity={80}
          tint="light"
          style={styles.card}
        >
          <View style={styles.cardContent}>
            <Stack
              screenOptions={{
                headerShown: false,
                animation:
                  "slide_from_right",
                contentStyle: {
                  backgroundColor:
                    "transparent",
                },
              }}
            />
          </View>
        </BlurView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },

  content: {
    width: "100%",
    maxWidth: 448,
    paddingHorizontal: 12,
    zIndex: 10,
  },

  card: {
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },

  cardContent: {
    padding: 12,
    backgroundColor:
      "rgba(255,255,255,0.70)",
  },

  blob: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.25,
  },

  blobOne: {
    width: 220,
    height: 220,
    backgroundColor: "#6366F1",
    top: -70,
    left: -70,
  },

  blobTwo: {
    width: 260,
    height: 260,
    backgroundColor: "#818CF8",
    bottom: -100,
    right: -80,
  },

  blobThree: {
    width: 160,
    height: 160,
    backgroundColor: "#A5B4FC",
    top: "40%",
    right: -70,
  },
});