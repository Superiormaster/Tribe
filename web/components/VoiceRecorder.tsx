'use client';

import { Send, Trash2, Play, Pause } from 'lucide-react';
import { useEffect, useState, useMemo, useRef } from 'react';
import AudioWaveform from '@/components/AudioWaveform';

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

  const [displayWaveform, setDisplayWaveform] = useState<number[]>([]);
  
  const visibleWave = useMemo(() => {
    return waveform.slice(-60);
  }, [waveform]);
  
  const handlePauseClick =
  onPauseToggle;

  const format = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // ❌ DO NOT SHOW UI if not recording or locked
  if (voiceState === "idle") return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-white z-[999] px-4 py-3">

      {/* TIMER + RECORD DOT */}
      <div className="flex items-center gap-2">
        <span className="text-red-500 animate-pulse text-lg">●</span>
        <span className="text-sm font-medium">
          {format(duration)}
        </span>
      </div>
  
      <div className="relative flex items-center h-12">

        {isPaused && (
          <button
            onTouchEnd={(e) => {
              e.stopPropagation();
              onPauseToggle();
            }}
            onClick={(e) => {
              e.stopPropagation();
              onPauseToggle();
            }}
            className="
              mr-3
              text-gray-600
              dark:text-gray-300
            "
          >
            <Play />
          </button>
        )}
      
        <div className="flex items-center">
          {visibleWave.map((v, i) => (
            <div
              key={i}
              className="w-[3px] mx-[1px] bg-gray-600 dark:bg-gray-300 rounded-full"
              style={{
                height: `${Math.max(
                  3,
                  v * 25
                )}px`,
              }}
            />
          ))}
        </div>
      </div>

      {/* CONTROLS */}
      <div className="flex items-center justify-between">

        {/* CANCEL */}
        <button
          onClick={onCancel}
          className="p-2 rounded-full hover:bg-red-600/20"
        >
          <Trash2 size={20} />
        </button>

        {!isPaused && (
          <button
            onTouchEnd={(e) => {
              e.stopPropagation();
              onPauseToggle();
            }}
            onClick={(e) => {
              e.stopPropagation();
              onPauseToggle();
            }}
            className="text-red-500 text-4xl"
          >
            <Pause />
          </button>
        )}

        {/* SEND */}
        <button
          onClick={onSend}
          className="p-2 rounded-full bg-green-500 hover:bg-green-600"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}