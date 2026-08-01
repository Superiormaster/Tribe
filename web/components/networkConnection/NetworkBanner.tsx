'use client';

import { useEffect, useRef, useState } from "react";
import { useNetwork } from "./NetworkContext";

export default function NetworkBanner() {
    const {
        isOnline,
        reconnecting,
        serverReachable,
        socketConnected,
        latency,
        networkStatus,
    } = useNetwork();

    const [visible, setVisible] = useState(false);
    const previousOnline = useRef(isOnline);
    const [message, setMessage] = useState("");
    const [color, setColor] = useState("");

    useEffect(() => {
      if (!previousOnline.current && isOnline && serverReachable) {
          setMessage("🟢 Back online");
          setColor("bg-green-600");
          setVisible(true);
  
          const timer = setTimeout(() => {
              setVisible(false);
          }, 2500);
  
          return () => clearTimeout(timer);
      }
  
      previousOnline.current = isOnline;
    }, [isOnline, serverReachable]);

    useEffect(() => {
      if (!isOnline) {
          setMessage("⚫ Offline");
          setColor("bg-red-600");
          setVisible(true);
      }
    }, [isOnline]);

    useEffect(() => {
      if (!isOnline) return;
  
      if (!serverReachable) {
          setMessage("Network unavailable");
          setColor("bg-red-600");
          setVisible(true);
      } else {
          setVisible(false);
      }
    }, [isOnline, serverReachable]);

    useEffect(() => {
      const handler = (e: any) => {
          setMessage(e.detail);
          setColor("bg-red-600");
          setVisible(true);
  
          setTimeout(() => {
              setVisible(false);
          }, 3000);
      };
  
      window.addEventListener("network-error", handler);
  
      return () =>
          window.removeEventListener("network-error", handler);
    }, []);

    if (!visible) return null;

    return (
        <div
          className={`
            fixed
            bottom-32
            left-1/2
            -translate-x-1/2
            px-4
            w-full
            py-2
            rounded-full
            shadow-lg
            text-white
            z-[99999]
            animate-in
            fade-in
            slide-in-from-bottom-2
            ${color}
          `}
        >
            {message}
        </div>
    );
}