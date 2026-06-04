'use client';

import { Send, Trash2, Pause } from 'lucide-react';

type VoiceState =
  | "idle"
  | "recording"
  | "locked"
  | "paused"

export default function VoiceRecorderUI({
  isRecording,
  duration,
  waveform,
  drag,
  isPaused,
  isLocked,
  onCancel,
  onSend,
  togglePause,
  onPauseToggle,
}: any) {
  
  const format = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };
  
  const handlePauseClick = () => {
    // If preview exists and user presses play → resume recording
    if (previewBlob && isPaused) {
      togglePause();
      return;
    }
  
    togglePause();
  };
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-300 dark:bg-gray-800 text-white z-[999] px-4 py-3">

      {/* Waveform */}
      {!isPaused && (
        <div className="flex items-end gap-[2px] h-10 overflow-hidden">
          {waveform.map((v: number, i: number) => (
            <div
              key={i}
              className="w-[2px] bg-green-400"
              style={{
                height: `${Math.abs(v) * 40}px`,
              }}
            />
          ))}
        </div>
      )}
      
      {/* Controls */}
      <div className="flex text-gray-700 dark:text-white items-center justify-between mt-2">
        <button onClick={onCancel}>
          <Trash2 size={20} />
        </button>

        <button
          onClick={handlePauseClick}
          className="flex items-center gap-2"
        >
          <div className="flex items-center gap-1">
            <span className="text-red-500 animate-pulse">●</span>
            <span className="text-sm">
              {Math.floor(duration / 60)}:
              {(duration % 60).toString().padStart(2, "0")}
            </span>
          </div>
        </button>

        <div className="relative h-6 overflow-hidden">
          <div
            className="absolute left-1/2 -translate-x-1/2 text-xs text-gray-400 transition-transform duration-75"
            style={{
              transform: `translate(${drag.x}px, ${drag.y}px)`,
              transition: "transform 0.08s ease-out",
            }}
          >
            ⬅ slide to cancel | ⬆ lock
          </div>
        </div>

        <button onClick={onSend}>
          <Send size={20} />
        </button>
      </div>

      {isLocked && (
        <div className="text-center text-green-400 text-xs mt-1">
          🔒
        </div>
      )}
    </div>
  );
}