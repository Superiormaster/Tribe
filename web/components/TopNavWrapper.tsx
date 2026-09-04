'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';

export default function TopNavWrapper() {
  const pathname = usePathname();
  const [selectionMode, setSelectionMode] =
    useState(false);
  const [mediaViewerOpen, setMediaViewerOpen] =
    useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      setSelectionMode(
        e.detail.active
      );
    };

    window.addEventListener(
      'chat-selection-change',
      handler
    );

    return () =>
      window.removeEventListener(
        'chat-selection-change',
        handler
      );
  }, []);
  
  useEffect(() => {
    const handler = (e: any) => {
      setMediaViewerOpen(e.detail.open);
    };
  
    window.addEventListener(
      "media-viewer-change",
      handler
    );
  
    return () =>
      window.removeEventListener(
        "media-viewer-change",
        handler
      );
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

  if (hideNavbar) return null;

  return <Navbar />;
}