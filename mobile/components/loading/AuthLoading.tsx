import React from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Text,
  View,
} from "react-native";

import { tribe2 } from "@/assets";

interface AuthLoadingProps {
  show: boolean;
  text?: string;
}

export default function AuthLoading({
  show,
  text = "Signing you in...",
}: AuthLoadingProps) {
  return (
    <Modal
      visible={show}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View className="flex-1 items-center justify-center bg-black/60">
        <View className="items-center">
          {/* Tribe Logo */}
          <View className="h-16 w-16 overflow-hidden rounded-full border border-indigo-600">
            <Image
              source={tribe2}
              resizeMode="cover"
              className="h-full w-full"
            />
          </View>

          {/* Loading */}
          <ActivityIndicator
            size="large"
            color="#FFFFFF"
            className="mt-6"
          />

          {/* Text */}
          <Text className="mt-5 text-lg font-medium text-white">
            {text}
          </Text>
        </View>
      </View>
    </Modal>
  );
}