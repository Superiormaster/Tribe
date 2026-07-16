"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

export default function InstallButton() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  
  useEffect(() => {
    // Already running as installed PWA
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone
    ) {
      setInstalled(true);
    }

    const beforeInstall = (e: Event) => {
      console.log("beforeinstallprompt fired");
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    };

    const installedHandler = () => {
      setInstalled(true);
      setPromptEvent(null);
    };

    window.addEventListener(
      "beforeinstallprompt",
      beforeInstall as EventListener
    );

    window.addEventListener(
      "appinstalled",
      installedHandler
    );

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        beforeInstall as EventListener
      );
      window.removeEventListener(
        "appinstalled",
        installedHandler
      );
    };
  }, []);
  
  const handleInstall = async () => {
    if (promptEvent) {
      promptEvent.prompt();
      await promptEvent.userChoice;
      setPromptEvent(null);
    } else {
      alert(
        "Installation isn't available right now. You can install the app from your browser's menu."
      );
    }
  };

  if (installed) return null;

  return (
    <button 
      onClick={handleInstall}
      className="fixed bottom-20 right-6 z-[1000] bg-indigo-600 p-3 text-white rounded-xl shadow-lg"
    >
      Install Tribe
    </button>
  );
}