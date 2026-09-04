'use client';

import { useRef, useState } from 'react';

import { useNetwork } from '@/components/networkConnection/NetworkContext';

import { updateMessage } from '@/lib/messageDB';
import { updateCommunityMessage } from '@/lib/communityMessageDB';

import { sendCommunityMessage } from '@/utils/communityChatPage/sendCommunityMessage';
import { sendChatMessage } from '@/utils/chat/sendChatMessage';

import type { Message } from '@/utils/chat/messageContract';
import { createReplySnapshot } from '@/utils/chat/replySnapshot';

export function useVoiceRecorder(
  socketRef: any,
  chatId: number | null,
  currentUser: any,
  setMessages: any,
  replyingTo: any,
  setReplyingTo: (v: any) => void,
  chatType: "private" | "community" = "private",
) {
  const {
    canCommunicate,
    networkStatus,
    connectionType,
  } = useNetwork();

  const mediaStreamRef =
    useRef<MediaStream | null>(null);

  const recorderRef =
    useRef<MediaRecorder | null>(null);

  const timerRef =
    useRef<any>(null);

  const [isRecording, setIsRecording] =
    useState(false);

  const pausedTimeRef =
    useRef(0);

  const pauseStartRef =
    useRef<number | null>(null);

  const audioContextRef =
    useRef<AudioContext | null>(null);

  const analyserRef =
    useRef<AnalyserNode | null>(null);

  const dataArrayRef =
    useRef<Uint8Array | null>(null);

  const animationRef =
    useRef<any>(null);

  const audioChunksRef =
    useRef<BlobPart[]>([]);

  const waveformRef =
    useRef<number[]>([]);

  const isRecordingRef =
    useRef(false);

  const [isPaused, setIsPaused] =
    useState(false);

  const isPausedRef =
    useRef(false);

  const cancellingRef =
    useRef(false);

  const [waveform, setWaveform] =
    useState<number[]>([]);

  const [previewBlob, setPreviewBlob] =
    useState<Blob | null>(null);

  const [duration, setDuration] =
    useState(0);

  const elapsedRef =
    useRef(0);

  const startTimeRef =
    useRef<number>(0);

  const sendAfterStopRef =
    useRef(false);

  const sendMessageByChatType = async (
    message: Partial<Message>
  ) => {
    const params = {
      message,
      currentUser,
      socketRef,
      setMessages,
      canCommunicate,
      networkStatus,
      connectionType,
    };

    if (chatType === "community") {
      return sendCommunityMessage(params);
    }

    return sendChatMessage(params);
  };

  const sendAudioOptimistic = async (
    blob: Blob,
    existingClientId?: string,
    finalDuration?: number,
    replySnapshotOverride?: any,
  ) => {
    if (!chatId) {
      return;
    }

    const client_id =
      existingClientId ??
      crypto.randomUUID();

    const replySnapshot =
      replySnapshotOverride ??
      createReplySnapshot(replyingTo);

    const file = new File(
      [blob],
      "voice.webm",
      {
        type:
          blob.type ||
          "audio/webm",
      }
    );

    const clientCreatedAt =
      new Date().toISOString();

    const audioDuration =
      finalDuration ??
      duration;

    await sendMessageByChatType({
      client_id,
      chat: chatId,
      ...(chatType === "community"
        ? {
            communityId: chatId,
            community: chatId,
          }
        : {}),
      sender:
        currentUser.id,
      media_type:
        "audio",
      media_source:
        "upload",
      encrypted_text:
        "",
      caption:
        "",
      client_created_at:
        clientCreatedAt,
      created_at:
        clientCreatedAt,
      media_url:
        [],
      thumbnail:
        [],
      duration:
        [audioDuration],
      waveform:
        [...waveformRef.current],
      reply_to:
        replySnapshot,
      reply_to_id:
        replySnapshot?.id ?? null,
      reply_to_client_id:
        replySnapshot?.client_id ?? null,
      files:
        [file],
      status:
        "pending",
      upload_progress:
        0,
    });
  };

  const cleanupAudio = () => {
    audioContextRef.current?.close();

    audioContextRef.current =
      null;

    analyserRef.current =
      null;

    dataArrayRef.current =
      null;
  };

  const stopStream = () => {
    mediaStreamRef.current
      ?.getTracks()
      .forEach(track =>
        track.stop()
      );

    mediaStreamRef.current =
      null;
  };

  const startRecording = async () => {
    if (
      recorderRef.current?.state ===
      "recording"
    ) {
      return;
    }

    setDuration(0);
    setPreviewBlob(null);

    setIsPaused(false);
    isPausedRef.current = false;

    elapsedRef.current = 0;

    pausedTimeRef.current = 0;
    pauseStartRef.current = null;

    const stream =
      await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

    mediaStreamRef.current =
      stream;

    const audioContext =
      new AudioContext();

    const source =
      audioContext.createMediaStreamSource(
        stream
      );

    const analyser =
      audioContext.createAnalyser();

    analyser.fftSize =
      256;

    analyser.smoothingTimeConstant =
      0.8;

    source.connect(analyser);

    const dataArray =
      new Uint8Array(
        analyser.frequencyBinCount
      );

    audioContextRef.current =
      audioContext;

    analyserRef.current =
      analyser;

    dataArrayRef.current =
      dataArray;

    audioChunksRef.current =
      [];

    waveformRef.current =
      [];

    setWaveform([]);

    isRecordingRef.current =
      true;

    const draw = () => {
      if (
        !isRecordingRef.current
      ) {
        return;
      }

      analyser.getByteFrequencyData(
        dataArray
      );

      let sum = 0;

      for (
        let i = 0;
        i < dataArray.length;
        i++
      ) {
        sum += dataArray[i];
      }

      const avg =
        sum /
        dataArray.length /
        255;

      const amplified =
        Math.min(
          1,
          avg * 3
        );

      waveformRef.current.push(
        amplified
      );

      if (
        waveformRef.current.length >
        60
      ) {
        waveformRef.current.shift();
      }

      setWaveform([
        ...waveformRef.current,
      ]);

      animationRef.current =
        requestAnimationFrame(
          draw
        );
    };

    draw();

    const getAudioRecorder = (
      stream: MediaStream
    ) => {
      const options = [
        {
          mimeType:
            "audio/webm;codecs=opus",
          audioBitsPerSecond:
            32000,
        },
        {
          mimeType:
            "audio/webm;codecs=opus",
          audioBitsPerSecond:
            24000,
        },
        {
          mimeType:
            "audio/webm",
          audioBitsPerSecond:
            32000,
        },
      ];

      for (
        const option of options
      ) {
        if (
          MediaRecorder.isTypeSupported(
            option.mimeType
          )
        ) {
          return new MediaRecorder(
            stream,
            option
          );
        }
      }

      return new MediaRecorder(
        stream
      );
    };

    const recorder =
      getAudioRecorder(stream);

    recorderRef.current =
      recorder;

    recorder.ondataavailable =
      (e) => {
        if (
          e.data.size > 0
        ) {
          audioChunksRef.current.push(
            e.data
          );
        }
      };

    recorder.onstart = () => {
      startTimeRef.current =
        Date.now();

      clearInterval(
        timerRef.current
      );

      timerRef.current =
        setInterval(() => {
          if (
            isPausedRef.current
          ) {
            return;
          }

          const elapsed =
            Math.floor(
              (
                Date.now() -
                startTimeRef.current
              ) / 1000
            );

          setDuration(
            elapsed
          );
        }, 200);
    };

    recorder.onstop =
      async () => {

        if (
          cancellingRef.current
        ) {
          cancellingRef.current =
            false;

          audioChunksRef.current =
            [];

          cleanupAudio();
          stopStream();

          setPreviewBlob(
            null
          );

          setWaveform([]);
          setDuration(0);

          waveformRef.current =
            [];

          return;
        }

        const blob =
          new Blob(
            audioChunksRef.current,
            {
              type:
                recorderRef.current
                  ?.mimeType ||
                "audio/webm",
            }
          );

        if (
          sendAfterStopRef.current
        ) {
          sendAfterStopRef.current =
            false;

          const finalDuration =
            Math.max(
              1,
              Math.floor(
                (
                  Date.now() -
                  startTimeRef.current
                ) / 1000
              )
            );

          await sendAudioOptimistic(
            blob,
            undefined,
            finalDuration
          );

          cleanupAudio();
          stopStream();

          setWaveform([]);

          waveformRef.current =
            [];

          audioChunksRef.current =
            [];

          setDuration(0);

          return;
        }

        // Preview mode
        setPreviewBlob(
          blob
        );

        cleanupAudio();
        stopStream();
      };

    recorder.start(200);

    setIsRecording(
      true
    );
  };

  const sendRecording = () => {
    sendAfterStopRef.current =
      true;

    stopRecording();

    isPausedRef.current =
      false;

    setIsPaused(
      false
    );
  };

  const resendMessage = async (
    msg: Message
  ) => {
    if (
      msg.media_type !==
      "audio"
    ) {
      return;
    }

    try {
      let blob: Blob;

      if (
        msg.files?.length &&
        msg.files[0].blob
      ) {
        blob =
          msg.files[0].blob;
      } else if (
        msg.media_url?.length
      ) {
        blob =
          await fetch(
            msg.media_url[0]
          ).then(
            r => r.blob()
          );
      } else {
        throw new Error(
          "Audio source unavailable."
        );
      }

      setMessages(
        (prev: Message[]) =>
          prev.map(
            (m: Message) =>
              m.client_id ===
              msg.client_id
                ? {
                    ...m,
                    status:
                      "sending",
                    upload_progress:
                      0,
                  }
                : m
          )
      );

      if (
        chatType ===
        "community"
      ) {
        await updateCommunityMessage(
          msg.client_id,
          currentUser.id,
          {
            status:
              "sending",
            upload_progress:
              0,
          }
        );
      } else {
        await updateMessage(
          msg.client_id,
          currentUser.id,
          {
            status:
              "sending",
            upload_progress:
              0,
          }
        );
      }

      await sendAudioOptimistic(
        blob,
        msg.client_id,
        Array.isArray(
          msg.duration
        )
          ? msg.duration[0]
          : msg.duration,
        msg.reply_to
      );
    } catch (
      error
    ) {
      console.error(
        "❌ Failed to resend audio:",
        error
      );

      setMessages(
        (prev: Message[]) =>
          prev.map(
            (m: Message) =>
              m.client_id ===
              msg.client_id
                ? {
                    ...m,
                    status:
                      "failed",
                  }
                : m
          )
      );
    }
  };

  const stopRecording = () => {
    isRecordingRef.current =
      false;

    cancelAnimationFrame(
      animationRef.current
    );

    if (
      recorderRef.current &&
      recorderRef.current.state !==
        "inactive"
    ) {
      recorderRef.current.stop();
    }

    setIsRecording(
      false
    );

    setIsPaused(
      false
    );

    isPausedRef.current =
      false;

    clearInterval(
      timerRef.current
    );
  };

  const cancelRecording = () => {
    cancellingRef.current =
      true;

    if (
      recorderRef.current &&
      recorderRef.current.state !==
        "inactive"
    ) {
      recorderRef.current.stop();
    }

    cleanupAudio();
    stopStream();

    audioChunksRef.current =
      [];

    waveformRef.current =
      [];

    setWaveform([]);

    setIsRecording(
      false
    );

    setDuration(
      0
    );

    setPreviewBlob(
      null
    );

    clearInterval(
      timerRef.current
    );
  };

  const pauseRecording = () => {
    if (
      recorderRef.current?.state ===
      "recording"
    ) {
      recorderRef.current.pause();

      isPausedRef.current =
        true;

      setIsPaused(
        true
      );

      isRecordingRef.current =
        false;

      cancelAnimationFrame(
        animationRef.current
      );
    }
  };

  const resumeRecording = () => {
    if (
      recorderRef.current?.state ===
      "paused"
    ) {
      recorderRef.current.resume();

      isPausedRef.current =
        false;

      setIsPaused(
        false
      );

      isRecordingRef.current =
        true;

      const analyser =
        analyserRef.current;

      const dataArray =
        dataArrayRef.current;

      if (
        !analyser ||
        !dataArray
      ) {
        return;
      }

      const draw = () => {
        if (
          !isRecordingRef.current
        ) {
          return;
        }

        analyser.getByteFrequencyData(
          dataArray as unknown as Uint8Array<ArrayBuffer>
        );

        let sum = 0;

        for (
          let i = 0;
          i < dataArray.length;
          i++
        ) {
          sum +=
            dataArray[i];
        }

        const avg =
          sum /
          dataArray.length /
          255;

        const amplified =
          Math.min(
            1,
            avg * 3
          );

        waveformRef.current.push(
          amplified
        );

        if (
          waveformRef.current.length >
          60
        ) {
          waveformRef.current.shift();
        }

        setWaveform([
          ...waveformRef.current,
        ]);

        animationRef.current =
          requestAnimationFrame(
            draw
          );
      };

      draw();
    }
  };

  const togglePause = () => {
    if (isPaused) {
      resumeRecording();
    } else {
      pauseRecording();
    }
  };

  return {
    isRecording,
    duration,
    startRecording,
    stopRecording,
    resendMessage,
    cancelRecording,
    waveform,
    previewBlob,
    sendRecording,
    pauseRecording,
    resumeRecording,
    isPaused,
    togglePause,
  };
}