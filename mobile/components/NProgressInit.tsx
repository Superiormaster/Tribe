import { ActivityIndicator, View } from "react-native";

type Props = {
  visible?: boolean;
};

export default function NProgressInit({
  visible = true,
}: Props) {
  if (!visible) {
    return null;
  }

  return (
    <View className="absolute inset-0 z-50 items-center justify-center bg-black/20">
      <View className="items-center justify-center rounded-2xl bg-white px-6 py-5 shadow-lg dark:bg-gray-900">
        <ActivityIndicator
          size="large"
          color="#4f46e5"
        />
      </View>
    </View>
  );
}