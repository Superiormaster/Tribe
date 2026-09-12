'use client';

import {
  Play,
  Upload,
  Pause,
  Mic,
} from 'lucide-react';

import {
  useEffect,
  useRef,
  useState,
} from 'react';

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

const AUDIO_PLAY_EVENT =
  'tribe-audio-play';

export default function AudioBubble({
  url,
  waveform = [],
  duration,
  isMe,
  priority,
  status,
  onRetry,
}: Props) {
  const audioRef =
    useRef<HTMLAudioElement>(null);

  const [playing, setPlaying] =
    useState(false);

  const [current, setCurrent] =
    useState(0);

  const [total, setTotal] =
    useState(duration ?? 0);

  /*
   * Each AudioBubble gets its own unique
   * identifier so it can ignore its own
   * global play event.
   */
  const audioIdRef =
    useRef(
      `tribe-audio-${Math.random()
        .toString(36)
        .slice(2)}`
    );

  /*
   * Audio events + global single-player
   * coordination.
   */
  useEffect(() => {
    const audio =
      audioRef.current;

    if (!audio) return;

    /*
     * Metadata loaded
     */
    const loaded = () => {
      if (
        !duration &&
        Number.isFinite(audio.duration)
      ) {
        setTotal(
          Math.floor(audio.duration)
        );
      }
    };

    /*
     * Playback progress
     */
    const time = () => {
      setCurrent(
        audio.currentTime
      );
    };

    /*
     * Playback ended
     */
    const ended = () => {
      setPlaying(false);
      setCurrent(0);
    };

    /*
     * Native pause event.
     *
     * This also fires when another
     * AudioBubble pauses this audio.
     */
    const paused = () => {
      setPlaying(false);
    };

    /*
     * Native play event.
     */
    const started = () => {
      setPlaying(true);
    };

    audio.addEventListener(
      'loadedmetadata',
      loaded
    );

    audio.addEventListener(
      'timeupdate',
      time
    );

    audio.addEventListener(
      'ended',
      ended
    );

    audio.addEventListener(
      'pause',
      paused
    );

    audio.addEventListener(
      'play',
      started
    );

    /*
     * Listen for another Tribe audio
     * starting playback.
     */
    const handleOtherAudio =
      (event: Event) => {
        const customEvent =
          event as CustomEvent<{
            id: string;
          }>;

        /*
         * Ignore our own event.
         */
        if (
          customEvent.detail?.id ===
          audioIdRef.current
        ) {
          return;
        }

        /*
         * Another audio started.
         * Pause this one.
         */
        if (!audio.paused) {
          audio.pause();
        }

        setPlaying(false);
      };

    window.addEventListener(
      AUDIO_PLAY_EVENT,
      handleOtherAudio
    );

    return () => {
      audio.removeEventListener(
        'loadedmetadata',
        loaded
      );

      audio.removeEventListener(
        'timeupdate',
        time
      );

      audio.removeEventListener(
        'ended',
        ended
      );

      audio.removeEventListener(
        'pause',
        paused
      );

      audio.removeEventListener(
        'play',
        started
      );

      window.removeEventListener(
        AUDIO_PLAY_EVENT,
        handleOtherAudio
      );
    };
  }, [duration]);

  /*
   * Duration fallback.
   */
  useEffect(() => {
    if (duration) return;

    const audio =
      audioRef.current;

    if (!audio) return;

    const loaded = () => {
      if (
        Number.isFinite(audio.duration)
      ) {
        setTotal(
          Math.floor(audio.duration)
        );
      }
    };

    audio.addEventListener(
      'loadedmetadata',
      loaded
    );

    return () =>
      audio.removeEventListener(
        'loadedmetadata',
        loaded
      );
  }, [duration]);

  /*
   * Metadata preloading.
   */
  useEffect(() => {
    if (!priority) return;

    const audio =
      new Audio(url);

    audio.preload = 'metadata';

    return () => {
      audio.src = '';
    };
  }, [priority, url]);

  /*
   * Play / pause.
   */
  const toggle = async () => {
    const audio =
      audioRef.current;

    if (!audio) return;

    /*
     * Pause current audio.
     */
    if (!audio.paused) {
      audio.pause();
      return;
    }

    window.dispatchEvent(
      new CustomEvent(
        AUDIO_PLAY_EVENT,
        {
          detail: {
            id: audioIdRef.current,
          },
        }
      )
    );

    try {
      await audio.play();

      setPlaying(true);
    } catch (error) {
      console.error(
        '[AudioBubble] Playback failed:',
        error
      );

      setPlaying(false);
    }
  };

  /*
   * Format duration.
   */
  const format = (
    sec: number
  ) => {
    if (
      !Number.isFinite(sec) ||
      sec < 0
    ) {
      return '0:00';
    }

    const m =
      Math.floor(sec / 60);

    const s =
      Math.floor(sec % 60);

    return `${m}:${s
      .toString()
      .padStart(2, '0')}`;
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
        preload={
          priority
            ? 'auto'
            : 'metadata'
        }
      />

      {/* CONTROLS */}
      <div
        className="
          flex
          items-center
          gap-2
          shrink-0
        "
      >
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
          aria-label={
            playing
              ? 'Pause voice message'
              : 'Play voice message'
          }
        >
          {playing ? (
            <Pause
              size={18}
              className="text-white"
            />
          ) : (
            <Play
              size={18}
              className="
                text-white
                ml-0.5
              "
            />
          )}
        </button>
      </div>

      {/* UPLOAD STATUS */}
      {(status === 'uploading' ||
        status === 'sending') && (
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
      {(status === 'pending' ||
        status === 'failed') && (
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

      {/* WAVEFORM */}
      <div className="flex-1">
        <AudioWaveform
          waveform={waveform}
          progress={
            total
              ? current / total
              : 0
          }
        />

        <div
          className="
            flex
            items-center
            justify-between
            mt-1
          "
        >
          {playing ? (
            <span
              className="
                text-[11px]
                text-gray-500
                dark:text-gray-300
              "
            >
              {format(current)}
            </span>
          ) : (
            <span
              className="
                text-[11px]
                text-gray-300
              "
            >
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