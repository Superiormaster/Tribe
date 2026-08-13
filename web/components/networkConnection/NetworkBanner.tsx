'use client';

import { useEffect, useRef, useState } from "react";
import { useNetwork } from "./NetworkContext";

export default function NetworkBanner() {
  const {
    isOnline,
    serverReachable,
  } = useNetwork();

  const [visible, setVisible] =
    useState(false);
  const [message, setMessage] =
    useState("");
  const [color, setColor] =
    useState("");
  const hasInitialized =
    useRef(false);
  const hadFailure =
    useRef(false);

  useEffect(() => {
    if (!hasInitialized.current) {

      if (isOnline && serverReachable) {
        hasInitialized.current = true;
      }

      return;
    }

    if (!isOnline || !serverReachable) {

      hadFailure.current = true;

      setMessage(
        !isOnline
          ? "⚫ Offline"
          : "Network unavailable"
      );

      setColor("bg-red-600");
      setVisible(true);

      return;
    }

    if (
      isOnline &&
      serverReachable &&
      hadFailure.current
    ) {

      hadFailure.current = false;

      setMessage("🟢 Back online");
      setColor("bg-green-600");
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

      setColor("bg-red-600");
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

  if (!visible) {
    return null;
  }

  return (
    <div
      className={`
        fixed
        bottom-32
        left-1/2
        -translate-x-1/2
        px-4
        py-2
        rounded-full
        shadow-lg
        text-white
        z-[99999]
        animate-in
        fade-in
        min-w-[220px]
        text-center
        whitespace-nowrap
        flex
        items-center
        justify-center
        slide-in-from-bottom-2
        ${color}
      `}
    >
      {message}
    </div>
  );
}