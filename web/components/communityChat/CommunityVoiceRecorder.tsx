'use client';

import { Mic, X, Send } from 'lucide-react';

type Props = {
  isRecording: boolean;
  duration: number;
  waveform?: number[];
  onStop: () => void;
  onCancel: () => void;
  onSend: () => void;
};

export default function CommunityVoiceRecorder({
  isRecording,
  duration,
  waveform = [],
  onStop,
  onCancel,
  onSend,
}: Props) {
  if (!isRecording) return null;

  return (
    <div className="fixed bottom-20 left-0 right-0 md:left-64 bg-gray-900 text-white p-3 flex items-center gap-3 z-50">
      <Mic className="text-red-500 animate-pulse" />

      <div className="text-sm">
        Recording: {duration}s
      </div>

      {/* simple waveform */}
      <div className="flex gap-[2px] items-end h-6">
        {waveform.slice(-20).map((h, i) => (
          <div
            key={i}
            className="w-1 bg-green-400"
            style={{ height: `${h}px` }}
          />
        ))}
      </div>

      <button onClick={onCancel} className="ml-auto">
        <X />
      </button>

      <button onClick={onStop} className="px-3 py-1 bg-yellow-500 rounded">
        Stop
      </button>

      <button onClick={onSend} className="px-3 py-1 bg-green-600 rounded">
        <Send />
      </button>
    </div>
  );
}