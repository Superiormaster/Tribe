"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Toaster } from 'react-hot-toast';

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
    const alreadyInstalled =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone ||
      localStorage.getItem("tribe-installed") === "true";
  
    if (alreadyInstalled) {
      setInstalled(true);
    }

    const beforeInstall = (e: Event) => {
      console.log("beforeinstallprompt fired");
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    };

    const installedHandler = () => {
      console.log("APP INSTALLED EVENT");
      localStorage.setItem("tribe-installed", "true");
      setInstalled(true);
      setPromptEvent(null);
    
      toast.success("Tribe installed successfully 🎉");
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
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone ||
      localStorage.getItem("tribe-installed") === "true"
    ) {
      toast("Tribe is already installed.");
      return;
    }
  
    if (!promptEvent) {
      toast.error("Install isn't available. Use Chrome's menu if needed.");
      return;
    }
  
    await promptEvent.prompt();
  
    const choice = await promptEvent.userChoice;
    console.log("CHOICE", choice);
  
    if (choice.outcome === "accepted") {
      toast.success("Installing Tribe...");
    } else {
      toast.error("Installation cancelled");
    }
  
    setPromptEvent(null);
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