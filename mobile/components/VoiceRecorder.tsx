import {
  Send,
  Trash2,
  Play,
  Pause,
} from "lucide-react-native";

import {
  useMemo,
  useState,
} from "react";

import {
  Pressable,
  Text,
  View,
} from "react-native";

type VoiceState =
  | "idle"
  | "recording"
  | "locked"
  | "cancelling"
  | "preview";

type Props = {
  voiceState: VoiceState;
  duration: number;
  waveform: number[];
  drag: { x: number; y: number };

  isLocked: boolean;
  previewBlob: Blob | null;
  isPaused: boolean;
  onPauseToggle: () => void;

  onCancel: () => void;
  onSend: () => void;
};

export default function VoiceRecorderUI({
  voiceState,
  duration,
  waveform,
  drag,
  isLocked,
  isPaused,
  onPauseToggle,
  previewBlob,
  onCancel,
  onSend,
}: Props) {
  const [displayWaveform, setDisplayWaveform] =
    useState<number[]>([]);

  const visibleWave = useMemo(() => {
    return waveform.slice(-60);
  }, [waveform]);

  const format = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;

    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Do not show UI when idle
  if (voiceState === "idle") {
    return null;
  }

  return (
    <View className="absolute bottom-0 left-0 right-0 z-[999] bg-gray-100 px-4 py-3 dark:bg-gray-900">
      {/* TIMER + RECORD DOT */}
      <View className="flex-row items-center gap-2">
        <Text className="text-lg text-red-500">
          ●
        </Text>

        <Text className="text-sm font-medium text-gray-700 dark:text-white">
          {format(duration)}
        </Text>
      </View>

      {/* WAVEFORM */}
      <View className="relative flex-row items-center h-12">
        {isPaused && (
          <Pressable
            onPress={onPauseToggle}
            className="mr-3 p-1"
          >
            <Play
              size={22}
              color="#4b5563"
              fill="#4b5563"
            />
          </Pressable>
        )}

        <View className="flex-row items-center">
          {visibleWave.map((v, i) => (
            <View
              key={i}
              className="mx-[1px] w-[3px] rounded-full bg-gray-600 dark:bg-gray-300"
              style={{
                height: Math.max(3, v * 25),
              }}
            />
          ))}
        </View>
      </View>

      {/* CONTROLS */}
      <View className="flex-row items-center justify-between">
        {/* CANCEL */}
        <Pressable
          onPress={onCancel}
          className="rounded-full p-2"
        >
          <Trash2
            size={20}
            color="#4b5563"
          />
        </Pressable>

        {/* PAUSE */}
        {!isPaused && (
          <Pressable
            onPress={onPauseToggle}
            className="items-center justify-center"
          >
            <Pause
              size={30}
              color="#ef4444"
            />
          </Pressable>
        )}

        {/* SEND */}
        <Pressable
          onPress={onSend}
          className="rounded-full bg-green-500 p-2"
        >
          <Send
            size={18}
            color="#ffffff"
          />
        </Pressable>
      </View>
    </View>
  );
}