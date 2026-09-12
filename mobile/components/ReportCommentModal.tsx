import {
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

type Props = {
  open: boolean;
  reason: string;
  details: string;
  setReason: (value: string) => void;
  setDetails: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

const REPORT_REASONS = [
  { value: "", label: "Select a reason" },
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harassment" },
  { value: "hate_speech", label: "Hate Speech" },
  { value: "violence", label: "Violence" },
  { value: "nudity", label: "Nudity" },
  { value: "misinformation", label: "Misinformation" },
  { value: "copyright", label: "Copyright" },
  { value: "other", label: "Other" },
];

export default function ReportCommentModal({
  open,
  reason,
  details,
  setReason,
  setDetails,
  onClose,
  onSubmit,
}: Props) {
  if (!open) return null;

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 items-center justify-center bg-black/50 px-4"
        onPress={onClose}
      >
        <Pressable
          className="w-full max-w-md rounded-2xl bg-white p-5 dark:bg-gray-900"
          onPress={(event) => event.stopPropagation()}
        >
          <Text className="mb-4 text-lg font-semibold text-gray-800 dark:text-gray-100">
            Report Comment / Reply
          </Text>

          {/* Reason selector */}
          <View className="mb-3 overflow-hidden rounded-lg border border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
            {REPORT_REASONS.map((item) => {
              const selected = reason === item.value;

              return (
                <Pressable
                  key={item.value || "empty"}
                  onPress={() => setReason(item.value)}
                  className={`px-3 py-3 ${
                    selected ? "bg-gray-200 dark:bg-gray-700" : ""
                  }`}
                >
                  <Text
                    className={`text-gray-700 dark:text-gray-200 ${
                      selected ? "font-medium" : ""
                    }`}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Details */}
          <TextInput
            value={details}
            onChangeText={setDetails}
            placeholder="Additional details (optional)"
            placeholderTextColor="#6b7280"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            className="min-h-[100px] w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          />

          {/* Actions */}
          <View className="mt-4 flex-row justify-end gap-2">
            <Pressable
              onPress={onClose}
              className="rounded-lg px-4 py-2"
            >
              <Text className="text-gray-600 dark:text-gray-300">
                Cancel
              </Text>
            </Pressable>

            <Pressable
              onPress={onSubmit}
              className="rounded-lg bg-red-600 px-4 py-2"
            >
              <Text className="font-medium text-white">
                Submit Report
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}