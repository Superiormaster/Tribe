import { usePathname } from "expo-router";
import { useEffect, useState } from "react";
import { DeviceEventEmitter } from "react-native";

import Navbar from "@/components/Navbar";

export default function TopNavWrapper() {
  const pathname = usePathname();

  const [selectionMode, setSelectionMode] = useState(false);
  const [mediaViewerOpen, setMediaViewerOpen] = useState(false);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      "chat-selection-change",
      (event: { active?: boolean }) => {
        setSelectionMode(Boolean(event?.active));
      }
    );

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      "media-viewer-change",
      (event: { open?: boolean }) => {
        setMediaViewerOpen(Boolean(event?.open));
      }
    );

    return () => {
      subscription.remove();
    };
  }, []);

  const hideNavbar =
    /^\/main\/messages\/chat\/\d+/.test(pathname) ||
    /^\/main\/community\/\d+\/chat/.test(pathname) ||
    /^\/main\/community\/\d+\/info/.test(pathname) ||
    /^\/main\/reels\/\d+/.test(pathname) ||
    /^\/main\/reels/.test(pathname) ||
    /^\/main\/monetization/.test(pathname) ||
    selectionMode ||
    mediaViewerOpen;

  if (hideNavbar) {
    return null;
  }

  return <Navbar />;
}