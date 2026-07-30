// hooks/useIsInstalled.ts
"use client";

import { useEffect, useState } from "react";

export function useIsInstalled() {
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const check = () => {
      setInstalled(
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true
      );
    };

    check();

    window.addEventListener("appinstalled", check);

    return () => {
      window.removeEventListener("appinstalled", check);
    };
  }, []);

  return installed;
}