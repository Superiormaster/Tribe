'use client';

import { Download } from "lucide-react";
import React from "react";

type Props = {
  children: React.ReactNode;
  msg: any;

  status?: string;
  progress?: number;

  fixedAspect?: boolean;

  onRetry?: () => void;
};

export default function MediaContainer({
  children,
  msg,
  status,
  progress,
  fixedAspect = true,
  onRetry,
}: Props) {
  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = msg.media_url;
    a.download = "media";
    a.target = "_blank";
    a.click();
  };

  return (
    <div
      className={`
        relative w-full
        ${
          fixedAspect
            ? "max-w-[320px] min-w-[220px]"
            : "max-w-[180px] min-w-[150px]"
        }
        rounded-2xl
        overflow-hidden
        mb-2
        bg-black/10
        flex flex-col
      `}
    >
      <div
        className={`
          relative w-full
          ${fixedAspect ? "aspect-[4/5]" : ""}
          overflow-hidden
        `}
      >
        {children}

        {(status === "uploading" || status === "sending") && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {status === "download" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/45">
            <button onClick={handleDownload}>
              <Download />
            </button>
          </div>
        )}

        {(status === "uploading" ||
          status === "sending") && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
            <div
              className="h-full transition-all duration-200 bg-indigo-400"
              style={{
                width: `${progress ?? 0}%`,
              }}
            />
          </div>
        )}

        {(status === "failed" ||
          status === "pending") && (
          <div
            className="absolute inset-0 bg-black/50 flex items-center justify-center"
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
          >
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              onClick={onRetry}
              className="px-3 py-1 bg-black/60 text-white rounded-full"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}