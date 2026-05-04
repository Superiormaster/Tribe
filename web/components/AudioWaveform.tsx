'use client';
import { useEffect, useRef } from 'react';

export default function AudioWaveform({
  waveform,
  progress = 0,
}: {
  waveform: number[];
  progress?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !waveform.length) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const barWidth = width / waveform.length;

    waveform.forEach((v, i) => {
      const x = i * barWidth;
      const h = v * height;

      ctx.fillStyle =
        i / waveform.length < progress
          ? "#22c55e" // played (green)
          : "#9ca3af"; // unplayed (gray)

      ctx.fillRect(
        x,
        height / 2 - h / 2,
        barWidth * 0.8,
        h
      );
    });
  }, [waveform, progress]);

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={40}
      className="w-full"
    />
  );
}