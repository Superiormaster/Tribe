'use client';

import {
  WifiOff,
  RotateCw,
  Signal,
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { useNetwork } from "./NetworkContext";

export default function NetworkBanner() {
  const {
    isOnline,
    serverReachable,
    reconnecting,
    networkStatus,
  } = useNetwork();

  const [visible, setVisible] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const hasInitialized =
    useRef(false);

  const hadFailure =
    useRef(false);

  useEffect(() => {
    if (!hasInitialized.current) {
      if (
        isOnline &&
        serverReachable
      ) {
        hasInitialized.current = true;
      }

      return;
    }

    if (
      !isOnline ||
      !serverReachable
    ) {
      hadFailure.current = true;

      setMessage(
        !isOnline
          ? "You're offline"
          : "Network unavailable"
      );

      setVisible(true);

      return;
    }

    if (
      isOnline &&
      serverReachable &&
      hadFailure.current
    ) {
      hadFailure.current = false;

      setMessage("Back online");
      setVisible(true);

      const timer =
        setTimeout(() => {
          setVisible(false);
        }, 2500);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [
    isOnline,
    serverReachable,
  ]);

  useEffect(() => {
    const handler = (
      event: Event
    ) => {
      const customEvent =
        event as CustomEvent<string>;

      hadFailure.current = true;

      setMessage(
        customEvent.detail ||
        "Network unavailable"
      );

      setVisible(true);
    };

    window.addEventListener(
      "network-error",
      handler
    );

    return () => {
      window.removeEventListener(
        "network-error",
        handler
      );
    };
  }, []);

  const slow =
    networkStatus === "slow" ||
    networkStatus === "poor";

  const reconnectingNow =
    reconnecting;

  const Icon =
    reconnectingNow
      ? RotateCw
      : slow
      ? Signal
      : WifiOff;

  if (!visible) {
    return null;
  }

  return (
    <div
      className="
        fixed
        bottom-32
        left-1/2
        -translate-x-1/2
        z-[99999]
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
          whitespace-nowrap
        "
      >
        <Icon
          size={15}
          className={
            reconnectingNow
              ? "animate-spin"
              : ""
          }
        />

        <span className="text-xs font-semibold">
          {message}
        </span>
      </div>
    </div>
  );
}