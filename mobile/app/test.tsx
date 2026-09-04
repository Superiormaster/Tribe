import { View, Text, Pressable } from "react-native";

export default function Test() {
  return (
    <View className="flex-1 items-center justify-center bg-gray-950">
      <Text className="text-4xl font-bold text-white">
        Tribe
      </Text>

      <Text className="mt-4 text-indigo-400">
        NativeWind is working
      </Text>

      <Pressable className="mt-6 rounded-xl bg-indigo-600 px-6 py-3">
        <Text className="font-bold text-white">
          Test Button
        </Text>
      </Pressable>
    </View>
  );
}