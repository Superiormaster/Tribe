import { ActivityIndicator, View } from "react-native";

interface ReelSpinnerProps {
  show: boolean;
}

export default function ReelSpinner({
  show,
}: ReelSpinnerProps) {
  if (!show) return null;

  return (
    <View className="absolute inset-0 z-50 items-center justify-center bg-black/20">
      <View className="h-12 w-12 items-center justify-center rounded-full bg-black/30">
        <ActivityIndicator
          size="large"
          color="#ffffff"
        />
      </View>
    </View>
  );
}