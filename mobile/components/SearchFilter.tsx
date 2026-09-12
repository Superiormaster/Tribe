import { Search } from "lucide-react-native";
import { Pressable, TextInput, View } from "react-native";

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
};

export default function SearchFilter({
  value,
  onChange,
  placeholder = "Search...",
}: Props) {
  return (
    <View className="mt-6 flex w-full flex-row items-center rounded-xl bg-gray-200 px-3 dark:bg-gray-800">
      <Search size={18} color="#6b7280" />

      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#6b7280"
        className="flex-1 rounded-xl bg-gray-200 p-3 text-gray-700 dark:bg-gray-800 dark:text-gray-200"
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}