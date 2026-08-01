"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import InstallModal from "./InstallModal";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

export default function InstallButton() {
  const [promptEvent, setPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);

  const [installed, setInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const checkInstalled = () => {
      const isInstalled =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone;

      setInstalled(isInstalled);
    };

    checkInstalled();

    const beforeInstall = (e: Event) => {
      e.preventDefault();
      console.log("beforeinstallprompt fired");

      setPromptEvent(e as BeforeInstallPromptEvent);
    };

    const installedHandler = () => {
      console.log("APP INSTALLED EVENT");
      setInstalling(false);
      setInstalled(true);
      setPromptEvent(null);
      toast.success("Tribe installed successfully!", {
        id: "install",
      });
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
    if (!promptEvent) {
      setShowHelp(true);
      return;
    }

    await promptEvent.prompt();
    console.log(promptEvent);

    const result = await promptEvent.userChoice;
    console.log("CHOICE", result);

    if (result.outcome === "accepted") {
      setInstalling(true);
      toast.loading("Installing Tribe...", {
        id: "install",
      });
    } else {
      toast.error("Installation cancelled", {
        id: "install",
      });
    }

    setPromptEvent(null);
  };
  
  useEffect(() => {
    if (!installing || installed) return;
  
    const interval = setInterval(() => {
      const isInstalled =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone;
  
      if (isInstalled) {
        clearInterval(interval);
  
        setInstalling(false);
        setInstalled(true);
  
        toast.success("Tribe installed successfully!", {
          id: "install",
        });
      }
    }, 1000);
  
    return () => clearInterval(interval);
  }, [installing, installed]);
  
  console.log({
    installed,
    hasPrompt: !!promptEvent,
  });

  if (installed) return null;

  return (
    <>
      <button
        onClick={
          promptEvent
            ? handleInstall
            : () => setShowHelp(true)
        }
        className="fixed bottom-16 right-5 z-50 rounded-xl bg-indigo-600 px-5 py-3 text-white shadow-xl"
      >
        {promptEvent
          ? "Install Tribe"
          : "How to Install"}
      </button>

      <InstallModal
        open={showHelp}
        onClose={() => setShowHelp(false)}
      />
    </>
  );
}