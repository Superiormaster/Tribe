'use client';

import { Play, Upload, Pause, Mic } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import AudioWaveform from '@/components/AudioWaveform';

type Props = {
  url: string;
  waveform?: number[];
  duration?: number;
  isMe?: boolean;
  priority?: boolean;
  status?: string;
  onRetry?: () => void;
};

export default function AudioBubble({
  url,
  waveform = [],
  duration,
  isMe,
  priority,
  status,
  onRetry,
}: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);

  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(duration ?? 0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const loaded = () => {
      if (!duration) {
        setTotal(Math.floor(audio.duration || 0));
      }
    };

    const time = () => {
      setCurrent(audio.currentTime);
    };

    const ended = () => {
      setPlaying(false);
      setCurrent(0);
    };

    audio.addEventListener('loadedmetadata', loaded);
    audio.addEventListener('timeupdate', time);
    audio.addEventListener('ended', ended);

    return () => {
      audio.removeEventListener('loadedmetadata', loaded);
      audio.removeEventListener('timeupdate', time);
      audio.removeEventListener('ended', ended);
    };
  }, [duration]);
  
  useEffect(() => {
    if (duration) return;

    const audio = audioRef.current;
    if (!audio) return;

    const loaded = () => {
        setTotal(Math.floor(audio.duration));
    };

    audio.addEventListener("loadedmetadata", loaded);

    return () =>
        audio.removeEventListener("loadedmetadata", loaded);
  }, [duration]);
  
  useEffect(() => {
    if (!priority) return;

    const audio = new Audio(url);
    audio.preload = "metadata";
  }, [priority, url]);

  const toggle = () => {
    const audio = audioRef.current;

    if (!audio) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play();
      setPlaying(true);
    }
  };

  const format = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);

    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className={`
        flex
        items-center
        gap-1
        rounded-2xl
        px-3
        py-2
        w-auto
        min-w-[100px]
        max-w-[320px]
        ${
          isMe
            ? 'bg-gray-400 dark:bg-indigo-700'
            : 'dark:bg-indigo-500/5 bg-gray-200'
        }
      `}
    >
      <audio
        ref={audioRef}
        src={url}
        preload={priority ? "auto" : "metadata"}
      />

      {/* Controls */}
      <div className="flex items-center gap-2 shrink-0">
      
        {/* Play */}
        <button
          type="button"
          onClick={toggle}
          className="
            w-11
            h-11
            rounded-full
            bg-white/15
            flex
            items-center
            justify-center
            shrink-0
          "
          aria-label={playing ? "Pause voice message" : "Play voice message"}
        >
          {playing ? (
            <Pause
              size={18}
              className="text-white"
            />
          ) : (
            <Play
              size={18}
              className="text-white ml-0.5"
            />
          )}
        </button>
      
      </div>
  
      {/* UPLOAD STATUS */}
      {(status === "uploading" ||
        status === "sending") && (
        <div
          className="
            w-11
            h-11
            rounded-full
            flex
            items-center
            justify-center
            shrink-0
          "
          aria-label="Uploading"
        >
          <div
            className="
              w-6
              h-6
              border-3
              border-white/30
              border-t-white
              rounded-full
              animate-spin
            "
          />
        </div>
      )}
  
      {/* RETRY */}
      {(status === "pending" ||
        status === "failed") && (
        <button
          type="button"
          onClick={onRetry}
          className="
            w-11
            h-11
            rounded-full
            flex
            items-center
            justify-center
            shrink-0
            transition
            active:scale-95
          "
          aria-label="Retry upload"
          title="Retry upload"
        >
          <Upload
            size={18}
            className="text-red-500"
          />
        </button>
      )}

      {/* Waveform */}
      <div className="flex-1">
        <AudioWaveform
          waveform={waveform}
          progress={
            total
              ? current / total
              : 0
          }
        />

        <div className="flex items-center justify-between mt-1">
          {playing ? (
            <span className="text-[11px] text-gray-500 dark:text-gray-300">
              {format(current)}
            </span>
          ) : (
            <span className="text-[11px] text-gray-300">
              {format(total)}
            </span>
          )}

          <Mic
            size={14}
            className="text-cyan-400"
          />
        </div>
      </div>
    </div>
  );
}