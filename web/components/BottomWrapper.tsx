'use client'

import { usePathname } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import { useEffect, useState } from 'react';

export default function BottomNavWrapper() {
  const pathname = usePathname()
  const [mediaViewerOpen, setMediaViewerOpen] =
    useState(false);
  
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

  const hideBottomNav =
    /^\/main\/home\/\d+/.test(pathname) ||
    /^\/main\/reposts\/\d+/.test(pathname) ||
    /^\/main\/messages\/chat\/\d+/.test(pathname) ||
    /^\/main\/reels\/\d+/.test(pathname) ||
    /^\/main\/reels/.test(pathname) ||
    /^\/main\/community\/\d+\/chat/.test(pathname) ||
    mediaViewerOpen;

  if (hideBottomNav) return null

  return <BottomNav />
}