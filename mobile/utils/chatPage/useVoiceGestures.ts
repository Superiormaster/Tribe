'use client';

import { useEffect, useRef, useState } from "react";

type VoiceState =
  | "idle"
  | "recording"
  | "locked"
  | "cancelling"
  | "preview";

export function useVoiceGestures({
  startRecording,
  stopRecording,
  cancelRecording,
  sendRecording,
  isRecording,
}: any) {
  const startXRef = useRef(0);
  const startYRef = useRef(0);

  const draggingRef = useRef(false);
  const isDraggingMicRef = useRef(false);
  const gestureRef = useRef<"none" | "lock" | "cancel">("none");

  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [micPressed, setMicPressed] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [voiceState, setVoiceState] =
    useState<VoiceState>("idle");

  const handleSwipe = (currentX: number) => {
    const diff = startXRef.current - currentX;
  
    if (diff > 80) {
      // swipe left = cancel
      setIsCancelling(true);
      setVoiceState("cancelling");
      vibrate(50);
      cancelRecording();
    }
  };
  
  const vibrate = (pattern: number | number[]) => {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  };

  const reset = () => {
    setMicPressed(false);
    setIsLocked(false);
    setIsCancelling(false);
    setDrag({ x: 0, y: 0 });

    draggingRef.current = false;
    isDraggingMicRef.current = false;
    gestureRef.current = "none";

    setVoiceState("idle");
  };

  const handleSend = () => {
    sendRecording();
    reset();
  };

  const handleCancelVoice = () => {
    cancelRecording();
    reset();
  };

  const handleStop = () => {
    if (voiceState === "locked") {
      stopRecording();
      setVoiceState("preview");
    }
  };

  const handleStart = async (e: any) => {
    e.preventDefault();

    setMicPressed(true);

    draggingRef.current = true;
    isDraggingMicRef.current = true;

    const touch = e.touches?.[0] || e;

    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;

    setDrag({ x: 0, y: 0 });
    setIsLocked(false);
    setIsCancelling(false);

    gestureRef.current = "none";
    setVoiceState("recording");

    await startRecording();

    vibrate(30);
  };

  const handleMove = (e: any) => {
    e.preventDefault();

    if (isLocked) return;
    if (!draggingRef.current && !isDraggingMicRef.current)
      return;

    isDraggingMicRef.current = false;

    const touch = e.touches?.[0] || e;

    const dx = touch.clientX - startXRef.current;
    const dy = touch.clientY - startYRef.current;

    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (gestureRef.current === "none") {
      if (absX > 18 || absY > 18) {
        gestureRef.current =
          absX > absY ? "cancel" : "lock";
      }
    }

    if (gestureRef.current === "cancel") {
      setDrag({
        x: Math.max(dx, -120),
        y: 0,
      });
    } else if (gestureRef.current === "lock") {
      setDrag({
        x: 0,
        y: Math.max(dy, -120),
      });
    }

    if (
      gestureRef.current === "cancel" &&
      absY > 20
    ) {
      handleSend();
      return;
    }

    if (
      gestureRef.current === "lock" &&
      absX > 20
    ) {
      handleSend();
      return;
    }

    if (dx < -100 && !isCancelling) {
      setIsCancelling(true);
      setVoiceState("cancelling");
      vibrate(50);
    } else if (dx > -100) {
      setIsCancelling(false);
    }

    if (dy <= -100 && !isLocked) {
      setIsLocked(true);
      setVoiceState("locked");

      draggingRef.current = false;
      isDraggingMicRef.current = false;

      gestureRef.current = "none";

      setMicPressed(false);
      setDrag({ x: 0, y: 0 });

      vibrate([20, 40, 20]);
    }
  };

  const handleEnd = () => {
    if (isLocked) {
      draggingRef.current = false;
      isDraggingMicRef.current = false;
      return;
    }

    if (isCancelling) {
      handleCancelVoice();
      return;
    }

    handleSend();
  };

  useEffect(() => {
    if (
      !isRecording &&
      !isDraggingMicRef.current &&
      voiceState === "idle"
    ) {
      return;
    }

    const move = (e: any) => handleMove(e);

    const end = () => {
      if (!micPressed) return;
      handleEnd();
    };

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", end);

    window.addEventListener("touchmove", move, {
      passive: false,
    });

    window.addEventListener("touchend", end);

    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", end);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", end);
    };
  }, [isRecording, voiceState, micPressed]);

  return {
    drag,
    micPressed,
    isLocked,
    isCancelling,
    voiceState,

    handleStart,
    handleMove,
    handleEnd,
    handleSwipe,

    handleSend,
    handleStop,
    handleCancelVoice,
  };
}