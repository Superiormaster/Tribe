'use client';

import {
  Camera,
  X,
  Send,
  RotateCcw,
} from 'lucide-react';

import {
  useEffect,
  useRef,
  useState,
} from 'react';

type Props = {
  onClose: () => void;

  onCapture: (file: File) => void;
};

export default function CameraCaptureModal({
  onClose,
  onCapture,
}: Props) {

  const videoRef =
    useRef<HTMLVideoElement | null>(null);

  const canvasRef =
    useRef<HTMLCanvasElement | null>(null);

  const streamRef =
    useRef<MediaStream | null>(null);

  const [preview, setPreview] =
    useState<string | null>(null);

  // =====================
  // START CAMERA
  // =====================

  useEffect(() => {

    startCamera();

    return () => {
      stopCamera();
    };

  }, []);

  const startCamera = async () => {

    try {

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
          },
        });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

    } catch (err) {
      console.error(err);
    }
  };

  const stopCamera = () => {

    streamRef.current
      ?.getTracks()
      .forEach((track) =>
        track.stop()
      );
  };

  // =====================
  // SNAP PHOTO
  // =====================

  const takePhoto = () => {

    if (
      !videoRef.current ||
      !canvasRef.current
    ) return;

    const video = videoRef.current;

    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;

    canvas.height = video.videoHeight;

    const ctx =
      canvas.getContext('2d');

    if (!ctx) return;

    ctx.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const image =
      canvas.toDataURL('image/jpeg');

    setPreview(image);

    stopCamera();
  };

  // =====================
  // SEND
  // =====================

  const sendPhoto = async () => {

    if (!preview) return;

    const blob =
      await (
        await fetch(preview)
      ).blob();

    const file =
      new File(
        [blob],
        `camera-${Date.now()}.jpg`,
        {
          type: 'image/jpeg',
        }
      );

    onCapture(file);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col">

      {/* TOP BAR */}
      <div className="flex items-center justify-between p-4">

        <button
          onClick={onClose}
          className="text-white"
        >
          <X size={28} />
        </button>

      </div>

      {/* CONTENT */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">

        {!preview ? (

          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />

        ) : (

          <img
            src={preview}
            className="w-full h-full object-contain"
          />

        )}

      </div>

      {/* CONTROLS */}
      <div className="p-6 flex items-center justify-center gap-8">

        {!preview ? (

          <button
            onClick={takePhoto}
            className="
              w-20 h-20 rounded-full
              border-4 border-white
              flex items-center justify-center
            "
          >
            <div className="w-14 h-14 rounded-full bg-white" />
          </button>

        ) : (

          <>
            {/* RETAKE */}
            <button
              onClick={() => {
                setPreview(null);
                startCamera();
              }}
              className="
                w-14 h-14 rounded-full
                bg-white/20
                flex items-center justify-center
                text-white
              "
            >
              <RotateCcw size={24} />
            </button>

            {/* SEND */}
            <button
              onClick={sendPhoto}
              className="
                w-16 h-16 rounded-full
                bg-indigo-600
                flex items-center justify-center
                text-white
              "
            >
              <Send size={26} />
            </button>
          </>
        )}

      </div>

      <canvas
        ref={canvasRef}
        hidden
      />

    </div>
  );
}