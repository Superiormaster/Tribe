'use client';

import { useRef, useState } from 'react';
import { uploadToCloudinary } from '@/utils/cloudinary';

export function useVoiceRecorder(
  socketRef: any,
  chatIdNum: number | null,
  currentUser: any,
  setMessages: any
) {
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<any>(null);

  const [isRecording, setIsRecording] = useState(false);
  const pausedTimeRef = useRef(0);
  const pauseStartRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationRef = useRef<any>(null);
  const [isPaused, setIsPaused] = useState(false);
  
  const [waveform, setWaveform] = useState<number[]>([]);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const elapsedRef = useRef(0);
  const startTimeRef = useRef<number>(0);

  // ========================
  // SEND AUDIO (OPTIMISTIC + ACK)
  // ========================
  const sendAudioOptimistic = async (blob: Blob) => {
    if (!socketRef.current || !chatIdNum) return;

    const clientId = crypto.randomUUID();

    const tempMessage = {
      id: clientId,
      clientId,
      text: "",
      media_url: URL.createObjectURL(blob),
      waveform,
      media_type: "audio",
      sender: currentUser.id,
      status: "sending",
      createdAt: new Date().toISOString(),
      retries: 0,
    };

    setMessages((prev) => [...prev, tempMessage]);

    try {
      const url = await uploadToCloudinary({
        file: new File([blob], "voice.webm"),
        folder: "Tribe/Audio",
      });

      const emitWithRetry = (retry = 0) => {
        socketRef.current.emit(
          "send_message",
          {
            clientId,
            chatId: chatIdNum,
            text: "",
            waveform,
            media_url: url,
            media_type: "audio",
          },
          (ack: any) => {
            if (ack?.ok) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.clientId === clientId
                    ? {
                        ...msg,
                        status: "sent",
                        id: ack.id,
                        media_url: url,
                      }
                    : msg
                )
              );
            } else if (retry < 3) {
              setTimeout(() => emitWithRetry(retry + 1), 1000 * (retry + 1));
            } else {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.clientId === clientId
                    ? { ...msg, status: "failed" }
                    : msg
                )
              );
            }
          }
        );
      };

      emitWithRetry();

    } catch (err) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.clientId === clientId
            ? { ...msg, status: "failed" }
            : msg
        )
      );
    }
  };

  // ========================
  // RECORD START
  // ========================
  const startRecording = async () => {
    if (recorderRef.current?.state === "recording") return;
  
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaStreamRef.current = stream;
  
    // 🎧 AUDIO ANALYZER
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
  
    analyser.fftSize = 64;
  
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
  
    source.connect(analyser);
  
    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    dataArrayRef.current = dataArray;
  
    const draw = () => {
      analyser.getByteTimeDomainData(dataArray);
  
      setWaveform([...dataArray.slice(0, 30)]);
  
      animationRef.current = requestAnimationFrame(draw);
    };
  
    draw();
  
    // 🎙️ MEDIA RECORDER
    const recorder = new MediaRecorder(stream);
    recorderRef.current = recorder;
  
    recorder.onstart = () => {
      startTimeRef.current = Date.now();
      pausedTimeRef.current = 0;
      elapsedRef.current = 0;
      
      timerRef.current = setInterval(() => {
        if (!pauseStartRef.current) {
          setDuration(
            elapsedRef.current + Math.floor(
              (Date.now() - startTimeRef.current - pausedTimeRef.current) / 1000
            )
          );
        }
      }, 1000);
    };
  
    recorder.onstop = async () => {
      cancelAnimationFrame(animationRef.current);
  
      setPreviewBlob(blob); // 👈 NEW
      clearInterval(timerRef.current);
    };
  
    recorder.start();
    setIsRecording(true);
  };
  
  const sendRecording = async () => {
    if (!previewBlob) return;
  
    await sendAudioOptimistic(previewBlob);
    setPreviewBlob(null);
  };

  // ========================
  // RESEND FAILED AUDIO
  // ========================
  const resendMessage = async (msg: any) => {
    if (msg.media_type !== "audio") return;

    try {
      const blob = await fetch(msg.media_url).then((r) => r.blob());
      sendAudioOptimistic(blob);
    } catch (err) {
      console.error("Resend failed:", err);
    }
  };

  // ========================
  // STOP RECORDING
  // ========================
  const stopRecording = () => {
    recorderRef.current?.stop();
    setIsRecording(false);
    clearInterval(timerRef.current);
  };

  // ========================
  // CANCEL RECORDING
  // ========================
  const stopStream = () => {
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
  };
  
  const cancelRecording = () => {
    recorderRef.current?.stop();
    stopStream();
    chunksRef.current = [];
    setIsRecording(false);
    setDuration(0);
    setPreviewBlob(null);
    clearInterval(timerRef.current);
  };
  
  const pauseRecording = () => {
    if (recorderRef.current && recorderRef.current.state === "recording") {
      recorderRef.current.pause();
      elapsedRef.current = duration;
      setIsPaused(true);
    }
  };
  
  const resumeRecording = () => {
    if (recorderRef.current && recorderRef.current.state === "paused") {
      recorderRef.current.resume();
      startTimeRef.current = Date.now();
      setIsPaused(false);
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