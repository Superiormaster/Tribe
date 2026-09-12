import { useContext } from "react";
import {
  Image,
  Pressable,
  Text,
  View,
} from "react-native";

import { NotificationContext } from "./NotificationContext";

export default function NotificationToast() {
  const { toast, dismissToast } = useContext(NotificationContext);

  if (!toast) {
    return null;
  }

  return (
    <Pressable
      onPress={dismissToast}
      className="absolute bottom-20 right-4 z-50 w-72 flex-row items-center gap-3 rounded-xl border border-gray-300 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800"
    >
      {/* Sender Avatar */}
      {toast.sender?.avatar ? (
        <Image
          source={{ uri: toast.sender.avatar }}
          className="h-10 w-10 rounded-full"
          resizeMode="cover"
        />
      ) : (
        <View className="h-10 w-10 items-center justify-center rounded-full bg-gray-300 dark:bg-gray-700">
          <Text className="font-bold text-gray-600 dark:text-gray-300">
            {toast.sender?.username?.charAt(0)?.toUpperCase() || "?"}
          </Text>
        </View>
      )}

      {/* Notification Content */}
      <View className="flex-1">
        <Text
          className="text-sm font-medium text-gray-900 dark:text-white"
          numberOfLines={2}
        >
          {toast.message}
        </Text>

        <Text className="mt-1 text-xs text-gray-400">
          {new Date(toast.created_at).toLocaleTimeString()}
        </Text>
      </View>
    </Pressable>
  );
}