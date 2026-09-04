'use client';

import {
  WifiOff,
  RotateCw,
  Signal,
} from "lucide-react";

import {
  useNetwork,
} from "@/components/networkConnection/NetworkContext";

export default function ReelNetworkStatus() {

  const {
    isOnline,
    serverReachable,
    reconnecting,
    networkStatus,
  } = useNetwork();

  const offline =
    !isOnline ||
    !serverReachable;

  const reconnectingNow =
    reconnecting;

  const slow =
    networkStatus === "slow" ||
    networkStatus === "poor";

  if (
    !offline &&
    !reconnectingNow &&
    !slow
  ) {
    return null;
  }

  const title =
    reconnectingNow
      ? "Reconnecting…"
      : offline
      ? "You're offline"
      : "Slow connection";

  const subtitle =
    reconnectingNow
      ? "Getting your reels back"
      : offline
      ? "Reels will resume when you're back"
      : "Videos may take a little longer";

  return (
    <div
      className="
        fixed
        top-4
        left-1/2
        -translate-x-1/2
        z-[100]
        pointer-events-none
      "
    >

      <div
        className="
          flex
          items-center
          gap-2
          rounded-full
          bg-black/65
          backdrop-blur-xl
          border
          border-white/10
          px-3
          py-2
          text-white
          shadow-xl
        "
      >

        {reconnectingNow ? (
          <RotateCw
            size={15}
            className="animate-spin"
          />
        ) : slow ? (
          <Signal size={15} />
        ) : (
          <WifiOff size={15} />
        )}

        <div className="flex flex-col leading-tight">

          <span className="text-xs font-semibold">
            {title}
          </span>

          <span className="text-[10px] text-white/60">
            {subtitle}
          </span>

        </div>

      </div>

    </div>
  );
}